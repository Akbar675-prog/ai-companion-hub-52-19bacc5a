// Generate gambar via Cloudflare Workers AI (Stable Diffusion XL) + kuota harian per pengguna.
// Hasil gambar disimpan permanen di storage (bucket app-metadata) pada path
// create/ai-image/<id 32 karakter> dan disajikan lewat host user content.
//
// ENV yang dibutuhkan (set di Vercel → Project Settings → Environment Variables):
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_AI_TOKEN

import { USER_CONTENT_ORIGIN } from "./user-content";
import { limitsFor } from "./ai-credits.server";

const BUCKET = "app-metadata";
export const DAILY_IMAGE_LIMIT = 5;
export const AI_IMAGE_PREFIX = "create/ai-image";

const CF_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

function cfConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_TOKEN;
  if (!accountId || !token) {
    throw new Error(
      "Konfigurasi Cloudflare AI belum di-set (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_TOKEN).",
    );
  }
  return {
    url: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CF_MODEL}`,
    token,
  };
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function keyFor(userId: string) {
  return `ai-image-quota/${userId}.json`;
}

type Quota = { day: string; used: number; history?: Record<string, number> };

function trimHistory(history: Record<string, number>): Record<string, number> {
  const keep = Object.keys(history).sort().slice(-30);
  const out: Record<string, number> = {};
  for (const k of keep) out[k] = history[k];
  return out;
}

async function readQuota(userId: string): Promise<Quota> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(BUCKET).download(keyFor(userId));
  if (!data) return { day: todayUtc(), used: 0 };
  try {
    const parsed = JSON.parse(await data.text()) as Quota;
    const history = parsed.history ?? {};
    if (parsed.day !== todayUtc()) {
      return {
        day: todayUtc(),
        used: 0,
        history: trimHistory({ ...history, [parsed.day]: Number(parsed.used) || 0 }),
      };
    }
    return { day: parsed.day, used: Number(parsed.used) || 0, history };
  } catch {
    return { day: todayUtc(), used: 0 };
  }
}

async function writeQuota(userId: string, quota: Quota): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const body = new Blob([JSON.stringify(quota)], { type: "application/json" });
  await supabaseAdmin.storage.from(BUCKET).upload(keyFor(userId), body, {
    contentType: "application/json",
    upsert: true,
  });
}

export async function imageQuotaFor(userId: string) {
  const q = await readQuota(userId);
  const limit = (await limitsFor(userId)).image;
  const history = q.history ?? {};
  const today = todayUtc();
  const now = new Date(`${today}T00:00:00Z`);
  const series: { date: string; used: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    series.push({ date: d, used: d === today ? q.used : (history[d] ?? 0) });
  }
  return {
    used: q.used,
    limit,
    remaining: Math.max(0, limit - q.used),
    series,
  };
}

function newImageId(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "").slice(0, 32);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Panggil Cloudflare Workers AI (SDXL) dengan Penanganan Error 429 yang Cerdas.
 */
async function fetchImageBytes(
  prompt: string,
): Promise<{ bytes: ArrayBuffer; type: string }> {
  const { url, token } = cfConfig();
  
  const body = JSON.stringify({ 
    prompt,
    negative_prompt: "blurry, low quality, deformed, bad anatomy, ugly, bad proportions, text, watermark, signature",
    num_steps: 15, // Diturunkan ke 15 agar hemat neuron & lebih cepat
    rejectIfBusy: true, // Langsung tolak jika server penuh (mencegah antrean lama)
  });

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
        signal: AbortSignal.timeout(90_000),
      });
      
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        let cfCode = 0;
        try {
          // Ekstrak kode error internal Cloudflare (3036 atau 3040)
          const parsed = JSON.parse(errBody);
          cfCode = parsed?.errors?.[0]?.code || 0;
        } catch { /* abaikan */ }

        // JIKA 3036: Kuota harian habis. Berhenti total.
        if (cfCode === 3036 || errBody.includes("daily free allocation")) {
          throw new Error("Kuota harian Cloudflare AI habis. Silakan upgrade ke Workers Paid atau coba besok.");
        }

        // JIKA 3040: Kapasitas penuh. Wajib Retry.
        if (cfCode === 3040 || res.status === 429) {
          lastError = "Server Cloudflare sedang sibuk (Kapasitas Penuh)";
          console.warn(`[Cloudflare 3040] Attempt ${attempt + 1} gagal. Mencoba lagi...`);
          // Exponential backoff + Jitter (acak) agar tidak menabrak server bersamaan
          const waitMs = 1500 * (attempt + 1) + Math.floor(Math.random() * 500);
          await sleep(waitMs);
          continue;
        }

        // Error lainnya (400, 401, dll)
        console.error(`[Cloudflare Error] Status ${res.status}:`, errBody);
        lastError = `HTTP ${res.status}`;
        break; 
      }
      
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const json = (await res.json()) as { result?: { image?: string }; };
        const b64 = json?.result?.image;
        if (!b64) {
          lastError = "Response tidak berisi gambar";
          break;
        }
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return { bytes: bytes.buffer, type: "image/jpeg" };
      } 
      
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength < 1024) {
        lastError = "Gambar kosong / terlalu kecil";
        break;
      }
      return { bytes, type: contentType.includes("image/") ? contentType : "image/jpeg" };

    } catch (e) {
      // Jika error dilempar dari blok 3036 di atas, langsung gagalkan proses
      if (e instanceof Error && e.message.includes("Kuota harian")) {
        throw e;
      }
      lastError = e instanceof Error ? e.message : "Gagal terhubung";
      await sleep(1500 * (attempt + 1));
    }
  }
  
  throw new Error(
    `Gagal membuat gambar: ${lastError}. Coba lagi beberapa saat lagi.`,
  );
}

export async function generateImage(userId: string, prompt: string) {
  const quota = await readQuota(userId);
  const limit = (await limitsFor(userId)).image;
  if (quota.used >= limit) {
    throw new Error(
      `Limit membuat gambar hari ini sudah habis (${limit}/hari). Coba lagi setelah pukul 07:00 WIB.`,
    );
  }

  const clean = prompt.replace(/\s+/g, " ").trim().slice(0, 500);
  if (!clean) throw new Error("Deskripsi gambar tidak boleh kosong.");

  const { bytes, type } = await fetchImageBytes(clean);

  const id = newImageId();
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const path = `${AI_IMAGE_PREFIX}/${id}`;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: type, upsert: true });
  if (error) throw new Error(`Gagal menyimpan gambar: ${error.message}`);

  await writeQuota(userId, { ...quota, day: todayUtc(), used: quota.used + 1 });

  return {
    url: `${USER_CONTENT_ORIGIN}/${AI_IMAGE_PREFIX}/${id}`,
    id,
    ext,
    prompt: clean,
    used: quota.used + 1,
    limit,
    remaining: Math.max(0, limit - (quota.used + 1)),
  };
}

/** Baca gambar hasil generate untuk disajikan lewat host user content. */
export async function readAiImage(id: string) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(`${AI_IMAGE_PREFIX}/${id}`);
  if (error || !data) return null;
  return { bytes: await data.arrayBuffer(), type: data.type || "image/jpeg" };
}
