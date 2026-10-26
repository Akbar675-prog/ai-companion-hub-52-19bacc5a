import { useEffect, useRef, useState } from "react";
import { authSupabase } from "@/integrations/auth-supabase/client";
import { completeGoogleLoginRequestFn } from "@/lib/google-login.functions";

type GoogleCredentialResponse = { credential?: string };
type GooglePromptNotification = { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean };
type GoogleIdentity = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    callback: (response: GoogleCredentialResponse) => void;
    context?: "signin" | "signup";
    ux_mode?: "popup";
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      shape: "pill";
      text: "signin_with" | "signup_with";
      width: number;
    },
  ) => void;
  prompt: (callback?: (notification: GooglePromptNotification) => void) => void;
};

type LoginRequest = { requestId: string; token: string };

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentity } };
  }
}

let googleScriptPromise: Promise<void> | undefined;

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        googleScriptPromise = undefined;
        reject(new Error("Gagal memuat Google Sign-In."));
      };
      document.head.appendChild(script);
    });
  }
  return googleScriptPromise;
}

function startLogin(flow: "signin" | "signup") {
  const params = new URLSearchParams({
    provider: "GoogleOAuth",
    provider_id: "google.com",
    scopes: "profile",
    flowName: "GeneralOAuthFlow",
    flow,
  });
  window.location.assign(`/api/v1/login?${params.toString()}`);
}

export function GoogleButton({
  label,
  flow: requestedFlow,
  onError,
}: {
  label: string;
  flow?: "signin" | "signup";
  onError?: (msg: string) => void;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [request, setRequest] = useState<LoginRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const isSignup = requestedFlow
    ? requestedFlow === "signup"
    : label.toLowerCase().includes("daftar");
  const flow = isSignup ? "signup" : "signin";

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const requestId = params.get("google_login_request_id");
    const token = params.get("google_login_token");
    if (requestId && token) {
      window.history.replaceState(null, "", window.location.pathname);
      setRequest({ requestId, token });
    }
  }, []);

  useEffect(() => {
    if (!request) return;
    let active = true;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      onError?.("Google Sign-In belum dikonfigurasi.");
      return;
    }

    loadGoogleIdentity()
      .then(() => {
        if (!active || !buttonRef.current || !window.google?.accounts?.id) return;
        const identity = window.google.accounts.id;
        identity.initialize({
          client_id: clientId,
          context: isSignup ? "signup" : "signin",
          ux_mode: "popup",
          callback: async ({ credential }) => {
            if (!credential) {
              onError?.("Gagal mendapatkan akun Google. Coba lagi.");
              return;
            }
            setBusy(true);
            try {
              const { error: authError } = await authSupabase.auth.signInWithIdToken({
                provider: "google",
                token: credential,
              });
              if (authError) throw authError;
              try {
                const completion = await completeGoogleLoginRequestFn({ data: request });
                if (!completion.ok) throw new Error("Login request sudah kedaluwarsa.");
              } catch (err) {
                await authSupabase.auth.signOut();
                throw err;
              }
              window.location.assign("/profile");
            } catch {
              setBusy(false);
              onError?.("Gagal masuk dengan Google. Silakan mulai lagi.");
            }
          },
        });
        identity.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: isSignup ? "signup_with" : "signin_with",
          width: Math.min(buttonRef.current.clientWidth || 400, 400),
        });
        identity.prompt((notification) => {
          if (active && (notification.isNotDisplayed() || notification.isSkippedMoment())) {
            setBusy(false);
          }
        });
      })
      .catch(() => {
        if (active) onError?.("Gagal memuat Google Sign-In. Silakan coba lagi.");
      });

    return () => {
      active = false;
    };
  }, [isSignup, onError, request]);

  if (request) {
    return (
      <div className="w-full">
        <div ref={buttonRef} className="flex min-h-11 w-full justify-center" />
        {busy && (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Memverifikasi login Google…
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => startLogin(flow)}
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-input bg-background px-5 py-3 text-sm font-medium transition active:scale-95 disabled:opacity-60"
    >
      <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.5 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.5 24.5c0-1.6-.15-3.2-.45-4.7H24v9h12.7c-.55 2.9-2.2 5.4-4.7 7.1l7.3 5.6c4.3-3.9 7.2-9.7 7.2-17z"
        />
        <path
          fill="#FBBC05"
          d="M10.3 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.8l7.8-6.1z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.6c-2 1.4-4.7 2.3-8.6 2.3-6.4 0-11.8-3.8-13.7-9.2l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
        />
      </svg>
      {label}
    </button>
  );
}
