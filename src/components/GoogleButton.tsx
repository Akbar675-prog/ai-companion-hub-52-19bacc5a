import { useEffect, useRef, useState } from "react";
import { authSupabase } from "@/integrations/auth-supabase/client";

type GoogleCredentialResponse = { credential?: string };
type GoogleIdentity = {
  initialize: (options: {
    client_id: string;
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
};

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

export function GoogleButton({
  label,
  onError,
}: {
  label: string;
  onError?: (msg: string) => void;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError(
        "Google Sign-In belum dikonfigurasi. Tambahkan VITE_GOOGLE_CLIENT_ID di environment aplikasi.",
      );
      return;
    }

    loadGoogleIdentity()
      .then(() => {
        if (!active || !buttonRef.current || !window.google?.accounts?.id) return;
        const identity = window.google.accounts.id;
        identity.initialize({
          client_id: clientId,
          context: label.toLowerCase().includes("daftar") ? "signup" : "signin",
          ux_mode: "popup",
          callback: async ({ credential }) => {
            if (!credential) {
              onError?.("Google tidak memberikan token login.");
              return;
            }
            try {
              const { error: authError } = await authSupabase.auth.signInWithIdToken({
                provider: "google",
                token: credential,
              });
              if (authError) throw authError;
              window.location.assign("/profile");
            } catch (err) {
              onError?.(err instanceof Error ? err.message : "Gagal masuk dengan Google.");
            }
          },
        });
        identity.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: label.toLowerCase().includes("daftar") ? "signup_with" : "signin_with",
          width: Math.min(buttonRef.current.clientWidth || 400, 400),
        });
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat Google Sign-In.");
      });

    return () => {
      active = false;
    };
  }, [label, onError]);

  return (
    <div className="w-full">
      <div ref={buttonRef} className="flex min-h-11 w-full justify-center" />
      {error && <p className="mt-2 text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
