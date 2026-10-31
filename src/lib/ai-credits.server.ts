// Kredit AI bulanan per pengguna (chat token + gambar).
// Disimpan di storage (bucket app-metadata) supaya tidak butuh tabel baru.
// Reset otomatis pada tanggal 1 setiap bulan (kunci memakai bulan UTC).

const BUCKET = "app-metadata";
export const DAILY_CHAT_TOKENS = 100_000;
const CONFIG_KEY = "ai-credits/config.json";

export type UsagePoint = { date: string; used: number };
export type ThreadUsage = { title: string; tokens: number };

type Credits = {
  day: string;
  used: number;
  threads: Record<string, number>;
  history: Record<string, number>;
};

function periodUtc() {
  return new Date().toISOString().slice(0, 7);
}

function keyFor(userId: string) {
  return `ai-credits/${userId}.json`;
}

function empty(): Credits {
  return { day: periodUtc(), used: 0, threads: {}, history: {} };
}

function trimHistory(history: Record<string, number>): Record<string, number> {
  const keys = Object.keys(history).sort();
  const keep = keys.slice(-30);
  const out: Record<string, number> = {};
  for (const k of keep) out[k] = history[k];
  return out;
}

async function readCredits(userId: string): Promise<Credits> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(BUCKET).download(keyFor(userId));
  if (!data) return empty();
  try {
    const parsed = JSON.parse(await data.text()) as Partial<Credits>;
    const c: Credits = {
      day: String(parsed.day ?? periodUtc()),
      used: Number(parsed.used) || 0,
      threads: parsed.threads ?? {},
      history: parsed.history ?? {},
    };
    if (c.day !== periodUtc()) {
      const history = trimHistory({ ...c.history, [c.day]: c.used });
      return { day: periodUtc(), used: 0, threads: {}, history };
    }
    return c;
  } catch {
    return empty();
  }
}

type CreditConfig = {
  globalChatLimit?: number;
  globalImageLimit?: number;
  users?: Record<string, { chatLimit?: number; imageLimit?: number }>;
};

export type CreditAdminUser = { id: string; user_no: number; name: string; username: string };
export type CreditAdminDashboard = { users: CreditAdminUser[]; config: CreditConfig };

export async function readCreditConfig(): Promise<CreditConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(BUCKET).download(CONFIG_KEY);
  if (!data) return {};
  try {
    return JSON.parse(await data.text()) as CreditConfig;
  } catch {
    return {};
  }
}

export async function writeCreditConfig(config: CreditConfig): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.storage.from(BUCKET).upload(
    CONFIG_KEY,
    new Blob([JSON.stringify(config)], { type: "application/json" }),
    { contentType: "application/json", upsert: true },
  );
}

export async function limitsFor(userId: string) {
  const config = await readCreditConfig();
  const own = config.users?.[userId];
  return {
    chat: Math.max(0, own?.chatLimit ?? config.globalChatLimit ?? DAILY_CHAT_TOKENS),
    image: Math.max(0, own?.imageLimit ?? config.globalImageLimit ?? 5),
  };
}

async function requireAdmin(adminId: string) {
  const { authSupabaseAdmin } = await import("@/integrations/auth-supabase/client.server");
  const { data } = await authSupabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", adminId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Akses admin diperlukan.");
}

export async function adminCreditDashboard(
  adminId: string,
  query: string,
): Promise<CreditAdminDashboard> {
  await requireAdmin(adminId);
  const { authSupabaseAdmin } = await import("@/integrations/auth-supabase/client.server");
  let request = authSupabaseAdmin
    .from("profiles")
    .select("id,user_no,name,username")
    .order("user_no", { ascending: true })
    .limit(30);
  const q = query.trim();
  if (q) {
    const numeric = /^\d+$/.test(q);
    request = numeric
      ? request.eq("user_no", Number(q))
      : request.or(`name.ilike.%${q.replace(/[%_,]/g, "")}%,username.ilike.%${q.replace(/[%_,]/g, "")}%`);
  }
  const [{ data: users, error }, config] = await Promise.all([request, readCreditConfig()]);
  if (error) throw new Error(error.message);
  return { users: (users ?? []) as CreditAdminUser[], config };
}

export async function adminSetCredits(
  adminId: string,
  input: { targetUserId?: string; chatLimit: number; imageLimit: number },
) {
  await requireAdmin(adminId);
  const config = await readCreditConfig();
  if (input.targetUserId) {
    config.users = {
      ...(config.users ?? {}),
      [input.targetUserId]: { chatLimit: input.chatLimit, imageLimit: input.imageLimit },
    };
  } else {
    config.globalChatLimit = input.chatLimit;
    config.globalImageLimit = input.imageLimit;
  }
  await writeCreditConfig(config);
  return config;
}

async function writeCredits(userId: string, c: Credits): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const body = new Blob([JSON.stringify(c)], { type: "application/json" });
  await supabaseAdmin.storage.from(BUCKET).upload(keyFor(userId), body, {
    contentType: "application/json",
    upsert: true,
  });
}

function toSeries(history: Record<string, number>, period: string, periodUsed: number): UsagePoint[] {
  const out: UsagePoint[] = [];
  const [year, month] = period.split("-").map(Number);
  const now = new Date(Date.UTC(year, month - 1, 1));
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    out.push({ date: `${key}-01`, used: key === period ? periodUsed : (history[key] ?? 0) });
  }
  return out;
}

export async function chatCreditsFor(userId: string) {
  const c = await readCredits(userId);
  const limit = (await limitsFor(userId)).chat;
  const threads: ThreadUsage[] = Object.entries(c.threads)
    .map(([title, tokens]) => ({ title, tokens }))
    .sort((a, b) => b.tokens - a.tokens);
  return {
    used: c.used,
    limit,
    remaining: Math.max(0, limit - c.used),
    threads,
    series: toSeries(c.history, c.day, c.used),
  };
}

/** Catat pemakaian token chat untuk satu percakapan. */
export async function recordChatUsage(userId: string, tokens: number, title: string) {
  const c = await readCredits(userId);
  const limit = (await limitsFor(userId)).chat;
  const t = Math.max(0, Math.min(1_000_000, Math.round(tokens) || 0));
  const key = (title || "Chat baru").slice(0, 60);
  c.used += t;
  c.threads[key] = (c.threads[key] ?? 0) + t;
  await writeCredits(userId, c);
  return {
    used: c.used,
    limit,
    remaining: Math.max(0, limit - c.used),
  };
}
