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

  if (ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <section className="m3-shadow-1 flex w-full max-w-sm flex-col items-center rounded-3xl bg-card p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Masuk dengan Google</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pilih akun Google untuk melanjutkan.</p>
          <div className="mt-6 w-full">
            <GoogleButton
              label={flow === "signup" ? "Daftar dengan Google" : "Masuk dengan Google"}
              flow={flow}
              onError={setError}
            />
          </div>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <section className="m3-shadow-1 flex w-full max-w-sm flex-col items-center rounded-3xl bg-card p-8 text-center">
        <m3e-loading-indicator
          variant="contained"
          className="m3-loading-sm"
          aria-label="Menyiapkan login"
        />
        <h1 className="mt-5 font-display text-xl font-semibold">Menyiapkan login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Kami sedang memeriksa permintaan login Anda. Mohon tunggu sebentar.
        </p>
      </section>
    </main>
  );
}
