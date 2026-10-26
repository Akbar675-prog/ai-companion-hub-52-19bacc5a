import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GoogleButton } from "@/components/GoogleButton";
import { startGoogleLoginRequestFn } from "@/lib/google-login.functions";

export const Route = createFileRoute("/api/v1/login")({
  head: () => ({
    meta: [{ title: "Menyiapkan Login" }, { name: "referrer", content: "no-referrer" }],
  }),
  component: GoogleLoginGateway,
});

function GoogleLoginGateway() {
  const [flow, setFlow] = useState<"signin" | "signup">("signin");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const flow =
      new URLSearchParams(window.location.search).get("flow") === "signup" ? "signup" : "signin";
    setFlow(flow);
    const minimumLoading = new Promise<void>((resolve) => window.setTimeout(resolve, 2500));

    async function continueLogin() {
      try {
        const [request] = await Promise.all([
          startGoogleLoginRequestFn({ data: { flow } }),
          minimumLoading,
        ]);
        if (!active) return;

        const fragment = new URLSearchParams({
          google_login_token: request.token,
          google_login_request_id: request.requestId,
        });
        window.history.replaceState(null, "", `${window.location.pathname}#${fragment}`);
        setReady(true);
      } catch {
        await minimumLoading;
        if (active) setError("Gagal menyiapkan login. Silakan coba lagi.");
      }
    }

    void continueLogin();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <m3e-loading-indicator
        className="m3-loading-lg"
        aria-label={error || "Menyiapkan login Google"}
      />
      {ready && (
        <div className="hidden" aria-hidden="true">
          <GoogleButton
            label={flow === "signup" ? "Daftar dengan Google" : "Masuk dengan Google"}
            flow={flow}
            onError={setError}
          />
        </div>
      )}
    </main>
  );
}
