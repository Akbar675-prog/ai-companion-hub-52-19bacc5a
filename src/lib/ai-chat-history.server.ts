import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { ChatThread } from "./ai-history";

const TABLE = "ai_chat_histories";
const ALGORITHM = "aes-256-gcm";

type EncryptedHistory = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

type HistoryRow = {
  user_id: string;
  ciphertext: string;
  iv: string;
  auth_tag: string;
  updated_at?: string;
};

type HistoryDb = {
  from: (table: typeof TABLE) => {
    select: (columns: string) => {
      eq: (
        column: keyof HistoryRow,
        value: string,
      ) => {
        maybeSingle: () => Promise<{
          data: Pick<HistoryRow, "ciphertext" | "iv" | "auth_tag"> | null;
          error: { message: string } | null;
        }>;
      };
    };
    upsert: (
      row: HistoryRow,
      options: { onConflict: "user_id" },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

function encryptionKey() {
  const encoded = process.env.AI_HISTORY_ENCRYPTION_KEY;
  if (!encoded) throw new Error("AI_HISTORY_ENCRYPTION_KEY belum diatur.");

  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("AI_HISTORY_ENCRYPTION_KEY harus berupa Base64 dari key 32-byte.");
  }
  return key;
}

function encrypt(threads: ChatThread[]): EncryptedHistory {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(threads), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decrypt(row: EncryptedHistory): ChatThread[] {
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(row.iv, "base64"));
  decipher.setAuthTag(Buffer.from(row.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(row.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  const parsed: unknown = JSON.parse(plaintext);
  return Array.isArray(parsed) ? (parsed as ChatThread[]) : [];
}

export async function readAiChatHistory(userId: string): Promise<ChatThread[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as HistoryDb;
  const { data, error } = await db
    .from(TABLE)
    .select("ciphertext, iv, auth_tag")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return [];

  try {
    return decrypt({
      ciphertext: String(data.ciphertext),
      iv: String(data.iv),
      authTag: String(data.auth_tag),
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    throw new Error("Riwayat chat tidak dapat didekripsi.");
  }
}

export async function writeAiChatHistory(userId: string, threads: ChatThread[]): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as HistoryDb;
  const encrypted = encrypt(threads.slice(0, 60));
  const { error } = await db.from(TABLE).upsert(
    {
      user_id: userId,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}
