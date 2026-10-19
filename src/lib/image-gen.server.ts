// Generate gambar via Cloudflare Workers AI (Leonardo Phoenix) + kuota harian per pengguna.
// Hasil gambar disimpan permanen di storage (bucket app-metadata) pada path
// create/ai-image/<id 32 karakter> dan disajikan lewat host user content.
// Kuota disimpan di storage juga (tanpa tabel baru), reset otomatis setiap
// tengah malam UTC karena kunci kuota memakai tanggal UTC.
//
// ENV yang dibutuhkan (set di Vercel → Project Settings → Environment Variables):
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_AI_TOKEN

import { USER_CONTENT_ORIGIN } from "./user-content";
import { limitsFor } from "./ai-credits.server";

const BUCKET = "app-metadata";
export const DAILY_IMAGE_LIMIT = 5;
export const AI_IMAGE_PREFIX = "create/ai-image";

// Menggunakan Leonardo Phoenix yang jauh lebih bagus untuk prompt adherence
const CF_MODEL = "@cf/leonardo/phoenix-1.0";

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

/** ID acak 32 karakter (base64url) untuk nama file gambar. */
function newImageId(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "").slice(0, 32);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Panggil Cloudflare Workers AI.
 * Leonardo Phoenix mengembalikan gambar binary (ArrayBuffer), sedangkan model
 * lain seperti Flux mengembalikan JSON base64. Fungsi ini menangani keduanya.
 */
async function fetchImageBytes(
  prompt: string,
): Promise<{ bytes: ArrayBuffer; type: string }> {
  const { url, token } = cfConfig();
  
  // Parameter untuk Leonardo Phoenix
  const body = JSON.stringify({ 
    prompt,
    negative_prompt: "blurry, low quality, deformed, bad anatomy, ugly, bad proportions",
    width: 1024,
    height: 1024
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
        const errText = await res.text().catch(() => "");
        console.error(`[Cloudflare AI Error] Status ${res.status}:`, errText);
        lastError = `HTTP ${res.status}`;
        await sleep(800 * (attempt + 1));
        continue;
      }
      
      const contentType = res.headers.get("content-type") || "";

      // Jika response adalah JSON (seperti Flux), parse base64
      if (contentType.includes("application/json")) {
        const json = (await res.json()) as {
          result?: { image?: string };
          errors?: { message?: string }[];
        };
        
        const b64 = json?.result?.image;
        if (!b64) {
          lastError = json?.errors?.[0]?.message ?? "response tidak berisi gambar";
          await sleep(800 * (attempt + 1));
          continue;
        }
        
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return { bytes: bytes.buffer, type: "image/jpeg" };
      } 
      
      // Jika response langsung berupa gambar (seperti Leonardo Phoenix)
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength < 1024) {
        lastError = "gambar kosong / terlalu kecil";
        await sleep(800 * (attempt + 1));
        continue;
      }
      
      // Leonardo mengembalikan JPEG secara default
      return { bytes, type: contentType.includes("image/") ? contentType : "image/jpeg" };

    } catch (e) {
      lastError = e instanceof Error ? e.message : "gagal";
      await sleep(800 * (attempt + 1));
    }
  }
  
  throw new Error(
    `Gagal membuat gambar (${lastError}). Coba lagi sebentar lagi.`,
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
