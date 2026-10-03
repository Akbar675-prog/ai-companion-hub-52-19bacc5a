import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ImageIcon, MessageSquare } from "lucide-react";
import { UsageGraph } from "@/components/UsageGraph";
import { useAccount } from "@/lib/use-account";
import { aiUsageFn } from "@/lib/ai-credits.functions";

export const Route = createFileRoute("/ai_/credits")({
  head: () => ({
    meta: [
      { title: "Kredit AI — Galileo Mod APK" },
      {
        name: "description",
        content:
          "Lihat sisa kredit chat dan kredit gambar GetrixAI, grafik pemakaian harian, dan rincian per percakapan.",
      },
      { property: "og:title", content: "Kredit AI — Galileo Mod APK" },
      {
        property: "og:description",
        content: "Pantau pemakaian kredit chat dan gambar GetrixAI kamu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiCreditsPage,
});

type Usage = Awaited<ReturnType<typeof aiUsageFn>>;

function num(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

function AiCreditsPage() {
  const { userId, loading: accountLoading } = useAccount();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    aiUsageFn()
      .then((u) => alive && setUsage(u))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-10">
        <div className="flex items-center gap-3">
          <Link
            to="/ai"
            aria-label="Kembali ke AI"
            className="m3-shadow-1 inline-flex size-11 items-center justify-center rounded-2xl bg-card"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-display text-2xl md:text-3xl">Kredit AI</h1>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Kredit direset otomatis setiap hari pukul 07:00 WIB.
        </p>

        {!userId && !accountLoading ? (
          <div className="mt-6 rounded-3xl bg-primary-container p-5 text-on-primary-container">
            <p className="text-sm">Masuk dulu untuk melihat kredit AI kamu.</p>
            <Link
              to="/login"
              className="mt-3 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Masuk
            </Link>
          </div>
        ) : loading || accountLoading ? (
          <div className="mt-8 flex justify-center">
            <m3e-loading-indicator className="m3-loading-md" aria-label="Memuat kredit" />
          </div>
        ) : usage ? (
          <div className="mt-6 space-y-5">
            <section className="rounded-3xl bg-card p-5 m3-shadow-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-5" />
                <h2 className="font-display text-xl">Kredit chat</h2>
              </div>
              <UsageGraph points={usage.chat.series} />
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-sm font-medium">Terpakai hari ini</span>
                <span className="text-lg font-semibold">{num(usage.chat.used)} token</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-muted-foreground">
                <span className="text-sm">Sisa</span>
                <span className="text-sm">
                  {num(usage.chat.remaining)} / {num(usage.chat.limit)} token
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-variant">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (usage.chat.used / usage.chat.limit) * 100)}%`,
                  }}
                />
              </div>

              <div className="mt-5">
                <p className="text-sm font-medium">Dipakai di chat</p>
                {usage.chat.threads.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Belum ada pemakaian chat hari ini.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {usage.chat.threads.map((t) => (
                      <li key={t.title} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 flex-1 truncate">{t.title}</span>
                        <span className="shrink-0 text-muted-foreground">{num(t.tokens)} token</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="rounded-3xl bg-card p-5 m3-shadow-1">
              <div className="flex items-center gap-2">
                <ImageIcon className="size-5" />
                <h2 className="font-display text-xl">Kredit gambar</h2>
              </div>
              <UsageGraph points={usage.image.series} />
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-sm font-medium">Terpakai hari ini</span>
                <span className="text-lg font-semibold">{usage.image.used} gambar</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-muted-foreground">
                <span className="text-sm">Sisa</span>
                <span className="text-sm">
                  {usage.image.remaining} / {usage.image.limit} gambar
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-variant">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (usage.image.used / usage.image.limit) * 100)}%`,
                  }}
                />
              </div>
            </section>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">Gagal memuat kredit.</p>
        )}
      </div>
    </div>
  );
}
