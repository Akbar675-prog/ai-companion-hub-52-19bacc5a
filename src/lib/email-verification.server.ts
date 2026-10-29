import { createHash } from "node:crypto";

const OTP_TTL_MS = 3 * 60_000;
const OTP_LENGTH = 6;
const OTP_FROM = "no-reply@visora.my.id";

type VerificationMetadata = {
  email_verified?: boolean;
  email_otp_hash?: string;
  email_otp_expires_at?: string;
  email_otp_challenge?: string;
};

function createOtp(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(OTP_LENGTH, "0");
}

function hashOtp(challenge: string, otp: string): string {
  return createHash("sha256").update(`${challenge}:${otp}`).digest("hex");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@", 2);
  if (!local || !domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
}

async function admin() {
  const { authSupabaseAdmin } = await import("@/integrations/auth-supabase/client.server");
  return authSupabaseAdmin as any;
}

export async function sendEmailVerificationOtp(userId: string, challenge: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY belum diatur di environment.");
  if (!/^[a-zA-Z0-9-]{20,100}$/.test(challenge)) throw new Error("Sesi verifikasi tidak valid.");

  const db = await admin();
  const { data, error } = await db.auth.admin.getUserById(userId);
  const user = data?.user;
  if (error || !user?.email) throw new Error("Akun tidak ditemukan.");

  const metadata = (user.user_metadata ?? {}) as VerificationMetadata;
  if (metadata.email_verified === true) return { alreadyVerified: true, email: maskEmail(user.email) };

  const otp = createOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const { error: updateError } = await db.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...metadata,
      email_verified: false,
      email_otp_hash: hashOtp(challenge, otp),
      email_otp_expires_at: expiresAt,
      email_otp_challenge: challenge,
    },
  });
  if (updateError) throw new Error("Gagal menyiapkan kode verifikasi.");

  const resend = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      from: `Galileo Mod APK <${OTP_FROM}>`,
      to: [user.email],
      subject: "Kode verifikasi akun Galileo Mod APK",
      text: `Kode verifikasi akun kamu adalah ${otp}. Kode ini berlaku selama 3 menit dan hanya berlaku untuk sesi pendaftaran ini. Jika kamu tidak merasa mendaftar, abaikan email ini.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Verifikasi akun Galileo Mod APK</h2><p>Kode OTP kamu:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${otp}</p><p>Kode berlaku selama <strong>3 menit</strong> dan hanya untuk sesi pendaftaran ini.</p><p>Jika kamu tidak merasa mendaftar, abaikan email ini.</p></div>`,
    }),
  });

  if (!resend.ok) {
    await db.auth.admin.updateUserById(userId, {
      user_metadata: { ...metadata, email_verified: false, email_otp_hash: null, email_otp_expires_at: null, email_otp_challenge: null },
    });
    throw new Error("Email OTP gagal dikirim. Coba lagi.");
  }

  return { alreadyVerified: false, email: maskEmail(user.email), expiresAt };
}

export async function verifyEmailVerificationOtp(userId: string, challenge: string, otp: string) {
  if (!/^[a-zA-Z0-9-]{20,100}$/.test(challenge)) throw new Error("Sesi verifikasi tidak valid.");
  if (!/^\d{6}$/.test(otp)) throw new Error("Kode OTP harus terdiri dari 6 angka.");

  const db = await admin();
  const { data, error } = await db.auth.admin.getUserById(userId);
  const user = data?.user;
  if (error || !user?.email) throw new Error("Akun tidak ditemukan.");

  const metadata = (user.user_metadata ?? {}) as VerificationMetadata;
  if (metadata.email_verified === true) return { verified: true };
  if (metadata.email_otp_challenge !== challenge) throw new Error("Kode OTP bukan untuk sesi ini.");
  if (!metadata.email_otp_hash || !metadata.email_otp_expires_at) throw new Error("Kode OTP tidak tersedia. Minta kode baru.");
  if (Date.now() >= Date.parse(metadata.email_otp_expires_at)) throw new Error("Kode OTP sudah kedaluwarsa. Minta kode baru.");
  if (hashOtp(challenge, otp) !== metadata.email_otp_hash) throw new Error("Kode OTP salah.");

  const { error: updateError } = await db.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...metadata,
      email_verified: true,
      email_otp_hash: null,
      email_otp_expires_at: null,
      email_otp_challenge: null,
    },
  });
  if (updateError) throw new Error("Gagal menyelesaikan verifikasi.");
  return { verified: true };
}
