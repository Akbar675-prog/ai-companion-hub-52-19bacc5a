import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { authSupabase } from "@/integrations/auth-supabase/client";
import {
  sendEmailVerificationOtpFn,
  verifyEmailVerificationOtpFn,
} from "@/lib/email-verification.functions";

const CHALLENGE_KEY = "email-verification-challenge";
const OTP_LENGTH = 6;

export const Route = createFileRoute("/auth/email-verification")({
  head: () => ({
    meta: [
      { title: "Verifikasi Email - Galileo Mod APK" },
      { name: "description", content: "Verifikasi email akun Galileo Mod APK dengan kode OTP." },
    ],
  }),
  component: EmailVerificationPage,
});

function EmailVerificationPage() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    void authSupabase.auth.getUser().then(({ data, error: authError }) => {
      if (authError || !data.user) {
        void navigate({ to: "/login" });
        return;
      }
      setEmail(data.user.email ?? "alamat email kamu");
    });
  }, [navigate]);

  function challenge() {
    return sessionStorage.getItem(CHALLENGE_KEY) ?? "";
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const currentChallenge = challenge();
    if (!currentChallenge) {
      setError("Sesi verifikasi tidak ditemukan. Silakan daftar ulang.");
      return;
    }
    setBusy(true);
    try {
      await verifyEmailVerificationOtpFn({ data: { challenge: currentChallenge, otp } });
      sessionStorage.removeItem(CHALLENGE_KEY);
      navigate({ to: "/profile" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kode OTP tidak valid.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    setNotice(null);
    const currentChallenge = challenge();
    if (!currentChallenge) {
      setError("Sesi verifikasi tidak ditemukan. Silakan daftar ulang.");
      return;
    }
    setResending(true);
    try {
      await sendEmailVerificationOtpFn({ data: { challenge: currentChallenge } });
      setNotice("Kode baru sudah dikirim. Kode berlaku selama 3 menit.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim ulang kode.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <AppHeader />
      <main className="mx-auto mt-12 w-full max-w-md px-4">
        <div className="m3-shadow-1 rounded-3xl bg-card p-6 text-center">
          <MailCheck className="mx-auto size-12 text-primary" />
          <h1 className="mt-4 font-display text-3xl">Verifikasi email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Kode OTP 6 angka sudah dikirim ke <strong>{email || "email kamu"}</strong>. Kode berlaku
            selama 3 menit dan hanya untuk sesi pendaftaran ini.
          </p>

          <form onSubmit={verify} className="mt-6 space-y-4 text-left">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kode OTP
              </span>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={OTP_LENGTH}
                required
                autoFocus
                className="w-full rounded-2xl bg-surface-variant px-4 py-3 text-center text-2xl tracking-[0.45em] outline-none focus:ring-2 focus:ring-primary"
                placeholder="000000"
              />
            </label>

            {error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
            {notice && <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</p>}

            <button
              type="submit"
              disabled={busy || otp.length !== OTP_LENGTH}
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-60"
            >
              {busy ? "Memverifikasi…" : "Verifikasi akun"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => void resend()}
            disabled={resending || busy}
            className="mt-4 text-sm font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-60"
          >
            {resending ? "Mengirim ulang…" : "Kirim ulang kode"}
          </button>

          <p className="mt-6 text-sm text-muted-foreground">
            Email salah? <Link to="/register" className="font-semibold text-primary hover:underline">Daftar ulang</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
