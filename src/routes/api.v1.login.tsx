import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { authSupabase } from "@/integrations/auth-supabase/client";
import {
  completeGoogleLoginRequestFn,
  exchangeGoogleCodeFn,
  startGoogleLoginRequestFn,
} from "@/lib/google-login.functions";

const googleLoginRequestStorageKey = "gma:google-login-request";
const googleRedirectUri =
  import.meta.env.VITE_GOOGLE_OAUTH_REDIRECT_URI ||
  "https://galileomodapk.visora.my.id/api/v1/login";

type StoredGoogleLoginRequest = {
  requestId: string;
  token: string;
  state: string;
  codeVerifier: string;
};

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
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");

    if (code || oauthError) {
      window.history.replaceState(null, "", window.location.pathname);
      void finishGoogleLogin(code, state, oauthError);
    } else {
      void beginGoogleLogin();
    }

    async function beginGoogleLogin() {
      const minimumLoading = new Promise<void>((resolve) => window.setTimeout(resolve, 2500));
      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) throw new Error("Google Sign-In belum dikonfigurasi.");

        const flow = params.get("flow") === "signup" ? "signup" : "signin";
        const [request] = await Promise.all([
          startGoogleLoginRequestFn({ data: { flow } }),
          minimumLoading,
        ]);
        if (!active) return;

        const state = randomBase64Url(32);
        const codeVerifier = randomBase64Url(32);
        const codeChallenge = await createCodeChallenge(codeVerifier);
        const savedRequest: StoredGoogleLoginRequest = {
          requestId: request.requestId,
          token: request.token,
          state,
          codeVerifier,
        };
        window.sessionStorage.setItem(googleLoginRequestStorageKey, JSON.stringify(savedRequest));

        const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authorizationUrl.search = new URLSearchParams({
          client_id: clientId,
          redirect_uri: googleRedirectUri,
          response_type: "code",
          scope: "openid email profile",
          state,
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          prompt: "select_account",
        }).toString();
        window.location.assign(authorizationUrl.toString());
      } catch {
        await minimumLoading;
        if (active) setError("Gagal mengarahkan ke Google. Silakan coba lagi.");
      }
    }

    async function finishGoogleLogin(
      authorizationCode: string | null,
      returnedState: string | null,
      authorizationError: string | null,
    ) {
      try {
        const savedRequest = window.sessionStorage.getItem(googleLoginRequestStorageKey);
        if (!savedRequest) throw new Error("Login request tidak ditemukan.");

        const request = JSON.parse(savedRequest) as Partial<StoredGoogleLoginRequest>;
        if (
          !request.requestId ||
          !request.token ||
          !request.state ||
          !request.codeVerifier ||
          authorizationError ||
          !authorizationCode ||
          returnedState !== request.state
        ) {
          throw new Error("Google authorization response tidak valid.");
        }

        const { idToken } = await exchangeGoogleCodeFn({
          data: { code: authorizationCode, codeVerifier: request.codeVerifier },
        });
        const { error: authError } = await authSupabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });
        if (authError) throw authError;

        try {
          const completion = await completeGoogleLoginRequestFn({
            data: { requestId: request.requestId, token: request.token },
          });
          if (!completion.ok) throw new Error("Login request sudah kedaluwarsa.");
        } catch (completionError) {
          await authSupabase.auth.signOut();
          throw completionError;
        }

        window.sessionStorage.removeItem(googleLoginRequestStorageKey);
        window.location.replace("/profile");
      } catch {
        try {
          window.sessionStorage.removeItem(googleLoginRequestStorageKey);
        } catch {
          // Ignore storage cleanup errors; keep the callback error visible.
        }
        if (active) setError("Login Google gagal atau kedaluwarsa. Silakan mulai lagi.");
      }
    }

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

function randomBase64Url(size: number) {
  const bytes = window.crypto.getRandomValues(new Uint8Array(size));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createCodeChallenge(verifier: string) {
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
