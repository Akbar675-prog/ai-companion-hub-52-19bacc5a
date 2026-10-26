import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authSupabase } from "@/integrations/auth-supabase/client";
import { completeGoogleLoginRequestFn } from "@/lib/google-login.functions";

const googleLoginRequestStorageKey = "gma:google-login-request";

export const Route = createFileRoute("/api/v1/login/callback")({
  head: () => ({
    meta: [{ title: "Menyelesaikan Login" }, { name: "referrer", content: "no-referrer" }],
  }),
  component: GoogleLoginCallback,
});

function GoogleLoginCallback() {
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function finishLogin() {
      try {
        const oauthError = new URLSearchParams(window.location.search).get("error");
        if (oauthError) throw new Error("Google OAuth ditolak.");

        const savedRequest = window.sessionStorage.getItem(googleLoginRequestStorageKey);
        if (!savedRequest) throw new Error("Login request tidak ditemukan.");

        const request = JSON.parse(savedRequest) as { requestId?: unknown; token?: unknown };
        if (typeof request.requestId !== "string" || typeof request.token !== "string") {
          throw new Error("Login request tidak valid.");
        }

        const { data, error: sessionError } = await authSupabase.auth.getSession();
        if (sessionError || !data.session) throw new Error("Sesi Google tidak ditemukan.");

        const completion = await completeGoogleLoginRequestFn({
          data: { requestId: request.requestId, token: request.token },
        });
        if (!completion.ok) throw new Error("Login request sudah kedaluwarsa.");

        window.sessionStorage.removeItem(googleLoginRequestStorageKey);
        await navigate({ to: "/profile", replace: true });
      } catch {
        try {
          window.sessionStorage.removeItem(googleLoginRequestStorageKey);
        } catch {
          // Ignore storage cleanup errors; keep the callback error visible.
        }
        setError("Login Google gagal atau kedaluwarsa. Silakan mulai lagi.");
      }
    }

    void finishLogin();
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      {error ? (
        <>
          <p className="text-center text-sm text-destructive">{error}</p>
          <Link
            to="/login"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Kembali ke login
          </Link>
        </>
      ) : (
        <m3e-loading-indicator className="m3-loading-lg" aria-label="Menyelesaikan login Google" />
      )}
    </main>
  );
}
