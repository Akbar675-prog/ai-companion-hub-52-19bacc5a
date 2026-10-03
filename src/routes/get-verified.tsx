import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Send } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { myVerificationFn, submitVerificationFn } from "@/lib/account.functions";
import { useAccount } from "@/lib/use-account";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/get-verified")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ajukan Centang Biru - Galileo Mod APK" },
      { name: "description", content: "Ajukan verifikasi akun GMA untuk mendapatkan centang biru resmi dari owner." },
      { property: "og:title", content: "Ajukan Centang Biru - Galileo Mod APK" },
      { property: "og:description", content: "Ajukan verifikasi akun GMA untuk mendapatkan centang biru." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GetVerifiedPage,
});

function GetVerifiedPage() {
  const t = useT();
  const navigate = useNavigate();
  const { userId, loading } = useAccount();
  const [reason, setReason] = useState("");
  const [links, setLinks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && !userId) navigate({ to: "/login" });
  }, [loading, userId, navigate]);

  const { data: status, refetch } = useQuery({
    queryKey: ["my-verification", userId],
    queryFn: () => myVerificationFn(),
    enabled: !!userId,
  });

  return (
    <div className="min-h-screen bg-background pb-16">
      <AppHeader />
      <main className="mx-auto mt-6 w-full max-w-xl px-4">
        <h1 className="flex items-center gap-2 font-display text-3xl">
          <BadgeCheck className="size-7 text-[#1d9bf0]" /> {t("Get Verified")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Dapatkan centang biru di samping nama akun kamu.")} <VerifiedBadge className="inline size-4 align-text-bottom" />
        </p>

        {status?.verified ? (
          <div className="m3-shadow-1 mt-6 rounded-3xl bg-card p-5">
            <p className="text-sm">{t("Akun kamu sudah terverifikasi. Selamat!")}</p>
            <Link to="/profile" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">
              {t("Lihat profil")}
            </Link>
          </div>
        ) : sent || status?.latest?.status === "pending" ? (
          <div className="m3-shadow-1 mt-6 rounded-3xl bg-card p-5">
            <p className="text-sm">{t("Permintaan kamu sedang ditinjau owner. Tunggu ya.")}</p>
          </div>
        ) : (
          <form
            className="m3-shadow-1 mt-6 space-y-4 rounded-3xl bg-card p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await submitVerificationFn({ data: { reason, links } });
                setSent(true);
                refetch();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Gagal mengirim.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("Kenapa akun kamu layak diverifikasi?")}
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={10}
                maxLength={1000}
                rows={5}
                className="w-full rounded-2xl bg-surface-variant px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                placeholder={t("Ceritakan singkat siapa kamu dan kontribusimu.")}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("Link pendukung (opsional)")}
              </span>
              <input
                value={links}
                onChange={(e) => setLinks(e.target.value)}
                maxLength={500}
                className="w-full rounded-2xl bg-surface-variant px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                placeholder="https://tiktok.com/@..."
              />
            </label>
            {error && <p className="text-sm text-destructive">{t(error)}</p>}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-60"
            >
              {busy ? <m3e-loading-indicator variant="contained" className="m3-loading-sm" aria-label="Mengirim" /> : <Send className="size-4" />}
              {t("Kirim permintaan")}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
