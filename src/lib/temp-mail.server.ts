const EMAIL_DOMAIN = "visora.my.id";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const LOCAL_PART_PATTERN = /^[a-z0-9][a-z0-9._-]{1,31}$/;

type SupabaseAdmin = typeof import("@/integrations/supabase/client.server").supabaseAdmin;

async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: string, value: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!forwarded) throw new Error("Alamat IP tidak tersedia dari proxy tepercaya.");
  return forwarded;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Konfigurasi server ${name} belum tersedia.`);
  if (name === "TEMP_MAIL_HASH_SECRET" && value.length < 32) {
    throw new Error("TEMP_MAIL_HASH_SECRET harus minimal 32 karakter.");
  }
  return value;
}

async function verifyRecaptcha(token: string, remoteIp: string): Promise<void> {
  const secret = requiredEnv("RECAPTCHA_SECRET_KEY");
  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: remoteIp }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Verifikasi reCAPTCHA gagal dihubungi.");
  const result = (await response.json()) as { success?: boolean; hostname?: string };
  const allowedHostnames = requiredEnv("RECAPTCHA_ALLOWED_HOSTNAMES")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (!result.success || !allowedHostnames.includes((result.hostname ?? "").toLowerCase())) {
    throw new Error("Verifikasi reCAPTCHA tidak valid. Coba lagi.");
  }
}

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as SupabaseAdmin & { from: (...args: any[]) => any; rpc: (...args: any[]) => any };
}

export async function createMailbox(
  request: Request,
  input: { localPart: string; browserId: string; captchaToken: string },
) {
  const localPart = input.localPart.trim().toLowerCase();
  if (!LOCAL_PART_PATTERN.test(localPart)) throw new Error("Nama email harus 2–32 karakter, memakai huruf kecil, angka, titik, garis bawah, atau tanda hubung.");
  if (!TOKEN_PATTERN.test(input.browserId)) throw new Error("Identitas browser tidak valid. Muat ulang halaman.");
  if (!input.captchaToken || input.captchaToken.length > 8192) throw new Error("Selesaikan reCAPTCHA terlebih dahulu.");

  const ip = getClientIp(request);
  await verifyRecaptcha(input.captchaToken, ip);

  const token = randomToken();
  const secret = requiredEnv("TEMP_MAIL_HASH_SECRET");
  const [ipHash, browserHash, tokenHash] = await Promise.all([
    hmac(secret, ip),
    hash(input.browserId),
    hash(token),
  ]);
  const db = await getAdmin();
  const { data, error } = await db.rpc("temp_mail_create_mailbox", {
    p_local_part: localPart,
    p_ip_hash: ipHash,
    p_browser_hash: browserHash,
    p_access_token_hash: tokenHash,
  }).single();
  if (error) throw new Error("Gagal membuat inbox sementara.");

  const result = data as { result: string; mailbox_id: string | null; expires_at: string | null };
  if (result.result === "ip_limit") throw new Error("Batas 5 inbox aktif per IP sudah tercapai.");
  if (result.result === "browser_limit") throw new Error("Batas 5 inbox aktif di browser ini sudah tercapai.");
  if (result.result === "taken") throw new Error("Alamat email ini sedang digunakan. Pilih nama lain.");
  if (!result.mailbox_id || !result.expires_at) throw new Error("Gagal membuat inbox sementara.");

  return {
    address: `${localPart}@${EMAIL_DOMAIN}`,
    token,
    expiresAt: result.expires_at,
  };
}

export async function sendMailboxMessage(
  request: Request,
  input: { address: string; token: string; to: string; subject: string; text: string; captchaToken: string },
) {
  const address = input.address.trim().toLowerCase();
  const to = input.to.trim().toLowerCase();
  const subject = input.subject.trim();
  const text = input.text.trim();
  if (!TOKEN_PATTERN.test(input.token) || !address.endsWith(`@${EMAIL_DOMAIN}`)) {
    throw new Error("Inbox tidak ditemukan atau sudah kedaluwarsa.");
  }
  if (!/^[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]+$/.test(to) || to.length > 254) {
    throw new Error("Alamat email tujuan tidak valid.");
  }
  if (!subject || subject.length > 200 || /[\\r\\n]/.test(subject)) {
    throw new Error("Subjek wajib diisi dan maksimal 200 karakter.");
  }
  if (!text || text.length > 5000) throw new Error("Pesan wajib diisi dan maksimal 5.000 karakter.");
  if (!input.captchaToken || input.captchaToken.length > 8192) throw new Error("Selesaikan reCAPTCHA sebelum mengirim.");

  const ip = getClientIp(request);
  await verifyRecaptcha(input.captchaToken, ip);

  const db = await getAdmin();
  const { data: mailbox, error: mailboxError } = await db
    .from("temp_mailboxes")
    .select("id, email_address")
    .eq("email_address", address)
    .eq("access_token_hash", await hash(input.token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (mailboxError || !mailbox) throw new Error("Inbox tidak ditemukan atau sudah kedaluwarsa.");

  const { data: allowed, error: limitError } = await db.rpc("temp_mail_reserve_send", { p_mailbox_id: mailbox.id });
  if (limitError) throw new Error("Gagal memeriksa batas pengiriman.");
  if (!allowed) throw new Error("Batas pengiriman 5 email per inbox dalam 24 jam tercapai.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: mailbox.email_address, to: [to], subject, text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Resend gagal mengirim email. Coba lagi nanti.");
  return (await response.json()) as { id: string };
}

export async function listMailboxMessages(address: string, token: string) {
  if (!TOKEN_PATTERN.test(token) || !address.endsWith(`@${EMAIL_DOMAIN}`)) {
    throw new Error("Inbox tidak ditemukan atau sudah kedaluwarsa.");
  }
  const db = await getAdmin();
  const { data: mailbox, error: mailboxError } = await db
    .from("temp_mailboxes")
    .select("id")
    .eq("email_address", address.toLowerCase())
    .eq("access_token_hash", await hash(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (mailboxError || !mailbox) throw new Error("Inbox tidak ditemukan atau sudah kedaluwarsa.");

  const { data, error } = await db
    .from("temp_mail_messages")
    .select("id, sender, subject, text_body, html_body, received_at")
    .eq("mailbox_id", mailbox.id)
    .order("received_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("Gagal memuat email.");
  return (data ?? []).map((message: { html_body: string; text_body: string } & Record<string, unknown>) => ({
    ...message,
    body: message.text_body || message.html_body,
  }));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

async function verifyResendSignature(request: Request, rawBody: string): Promise<void> {
  const secret = requiredEnv("RESEND_WEBHOOK_SECRET").replace(/^whsec_/, "");
  const id = request.headers.get("svix-id") ?? "";
  const timestamp = request.headers.get("svix-timestamp") ?? "";
  const signatures = request.headers.get("svix-signature") ?? "";
  const seconds = Number(timestamp);
  if (!id || !Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) {
    throw new Error("Webhook timestamp tidak valid.");
  }

  const keyBytes = Uint8Array.from(atob(secret), (character) => character.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(signedContent));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const valid = signatures.split(" ").some((signature) => {
    const [version, value] = signature.split(",", 2);
    return version === "v1" && !!value && safeEqual(value, expected);
  });
  if (!valid) throw new Error("Tanda tangan webhook tidak valid.");
}

async function readWebhookBody(request: Request): Promise<string> {
  const maxBytes = 1_000_000;
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Webhook body kosong.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("Webhook terlalu besar.");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export async function receiveResendWebhook(request: Request): Promise<void> {
  const rawBody = await readWebhookBody(request);
  await verifyResendSignature(request, rawBody);
  const event = JSON.parse(rawBody) as {
    type?: string;
    data?: { email_id?: string; to?: string[]; from?: string; subject?: string; created_at?: string };
  };
  if (event.type !== "email.received" || !event.data?.email_id) return;

  const recipients = (event.data.to ?? []).map((recipient) => recipient.toLowerCase());
  const matchingRecipients = recipients.filter((recipient) => recipient.endsWith(`@${EMAIL_DOMAIN}`));
  if (matchingRecipients.length === 0) return;

  const resendApiKey = requiredEnv("RESEND_API_KEY");
  const received = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(event.data.email_id)}`, {
    headers: { authorization: `Bearer ${resendApiKey}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!received.ok) throw new Error("Gagal mengambil isi email dari Resend.");
  const email = (await received.json()) as { from?: string; to?: string[]; subject?: string; text?: string; html?: string; created_at?: string };
  const db = await getAdmin();

  for (const recipient of (email.to ?? matchingRecipients).map((value) => value.toLowerCase())) {
    const { data: mailbox } = await db
      .from("temp_mailboxes")
      .select("id")
      .eq("email_address", recipient)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!mailbox) continue;
    await db.from("temp_mail_messages").upsert({
      mailbox_id: mailbox.id,
      resend_email_id: event.data.email_id,
      sender: email.from ?? event.data.from ?? "",
      subject: email.subject ?? event.data.subject ?? "(Tanpa subjek)",
      text_body: (email.text ?? "").slice(0, 100_000),
      html_body: (email.html ?? "").slice(0, 200_000),
      received_at: email.created_at ?? event.data.created_at ?? new Date().toISOString(),
    }, { onConflict: "mailbox_id,resend_email_id", ignoreDuplicates: true });
  }
}
