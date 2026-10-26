import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/error/login")({
  head: () => ({ meta: [{ title: "Kesalahan Autentikasi" }] }),
  component: LoginErrorPage,
});

type Diagnostics = { requestId: string; errorCode: string; occurredAt: string };

function LoginErrorPage() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDiagnostics({
      requestId: params.get("token") || "unavailable",
      errorCode: params.get("error_code") || "authentication_failed",
      occurredAt: new Date().toISOString(),
    });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <section className="m3-shadow-1 w-full max-w-lg rounded-3xl bg-card p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold">Kesalahan Autentikasi</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Gagal masuk. Mulai lagi proses masuk.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Anda dapat menghubungi kami melalui pusat bantuan kami di halaman{" "}
          <Link to="/report" className="font-medium text-primary underline underline-offset-4">
            laporan
          </Link>{" "}
          jika error ini terus muncul. Sertakan data diagnostik Anda di bawah ini dalam pesan.
        </p>
        <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 font-mono text-xs leading-6">
          <p className="mb-1 font-semibold">Auth login details</p>
          <p>request_id: {diagnostics?.requestId ?? "memuat…"}</p>
          <p>error_code: {diagnostics?.errorCode ?? "memuat…"}</p>
          <p>product: login</p>
          <p>occurred at: {diagnostics?.occurredAt ?? "memuat…"}</p>
        </div>
        <Link
          to="/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Kembali ke login
        </Link>
      </section>
    </main>
  );
}
