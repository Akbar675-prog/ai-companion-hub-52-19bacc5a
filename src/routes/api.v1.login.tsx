import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { authSupabase } from "@/integrations/auth-supabase/client";
import { startGoogleLoginRequestFn } from "@/lib/google-login.functions";

const googleLoginRequestStorageKey = "gma:google-login-request";

export const Route = createFileRoute("/api/v1/login")({
  head: () => ({
    meta: [{ title: "Menyiapkan Login" }, { name: "referrer", content: "no-referrer" }],
  }),
  component: GoogleLoginGateway,
});

function GoogleLoginGateway() {
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const flow =
      new URLSearchParams(window.location.search).get("flow") === "signup" ? "signup" : "signin";
    const minimumLoading = new Promise<void>((resolve) => window.setTimeout(resolve, 2500));

    async function continueLogin() {
      try {
        const [request] = await Promise.all([
          startGoogleLoginRequestFn({ data: { flow } }),
          minimumLoading,
        ]);
        if (!active) return;

        window.sessionStorage.setItem(
          googleLoginRequestStorageKey,
          JSON.stringify({ requestId: request.requestId, token: request.token }),
        );
        const { error: oauthError } = await authSupabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: new URL("/api/v1/login/callback", window.location.origin).toString(),
            queryParams: { prompt: "select_account" },
          },
        });
        if (oauthError) throw oauthError;
      } catch {
        await minimumLoading;
        try {
          window.sessionStorage.removeItem(googleLoginRequestStorageKey);
        } catch {
          // Ignore storage cleanup errors; keep the redirect error visible.
        }
        if (active) setError("Gagal mengarahkan ke Google. Silakan coba lagi.");
      }
    }

    void continueLogin();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <m3e-loading-indicator
        className="m3-loading-lg"
        aria-label={error || "Mengalihkan ke Google"}
      />
      {error && <p className="px-4 text-center text-sm text-destructive">{error}</p>}
    </main>
  );
}
