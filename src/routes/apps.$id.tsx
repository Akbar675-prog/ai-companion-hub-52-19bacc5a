import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  queryOptions,
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, CalendarDays, Users, Lock, Gem, Cpu, Tag, Sparkles, Images, Clock, HardDrive, Play, ExternalLink, FileText, X } from "lucide-react";
import {
  getAppFn,
  incrementDownloadFn,
  getApkDownloadUrlFn,
  listChangelogsFn,
  type ChangelogItem,
} from "@/lib/apps.functions";
import { archLabel, versionLabel } from "@/lib/metadata.functions";
import { verifyExclusiveFn, exclusiveBypassFn } from "@/lib/exclusive.functions";
import { useAccount } from "@/lib/use-account";
import { PressButton } from "@/components/Pressable";

const WHATSAPP_REDIRECT =
  "https://whatsapp.com/channel/0029VbDY5dR29753oLbbVc1c";

const appQuery = (id: string) =>
  queryOptions({
    queryKey: ["app", id],
    queryFn: async () => {
      const app = await getAppFn({ data: { id } });
      if (!app) throw notFound();
      return app;
    },
  });

export const Route = createFileRoute("/apps/$id")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(appQuery(params.id)),
  component: AppDetail,
  head: ({ loaderData }) => {
    const app = loaderData as
      | (Awaited<ReturnType<typeof getAppFn>> & object)
      | undefined
      | null;
    if (!app) {
      return {
        meta: [
          { title: "Aplikasi — Galileo Mod APK" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${app.App_name} APK v${versionLabel(app.Version)} · Galileo Mod APK`;
    const desc = (app.Description || `Download ${app.App_name} APK gratis di Galileo Mod APK.`).slice(0, 155);
    const icon = app.App_icon || "";
    const meta = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `/apps/${app.ID}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    if (icon) {
      meta.push({ property: "og:image", content: icon });
      meta.push({ name: "twitter:image", content: icon });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: `/apps/${app.ID}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: app.App_name,
            description: app.Description || undefined,
            operatingSystem: "Android",
            applicationCategory: "MobileApplication",
            softwareVersion: app.Version || undefined,
            image: icon || undefined,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">Gagal memuat: {error instanceof Error ? error.message : String(error)}</div>
  ),
  notFoundComponent: () => (
    <div className="p-8">
      <h1 className="font-display text-2xl">Aplikasi tidak ditemukan</h1>
      <Link to="/" className="mt-4 inline-block text-primary underline">
        Kembali
      </Link>
    </div>
  ),
});

function formatDate(iso?: string) {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "-";
  }
}

function formatCount(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

function isNew(iso?: string): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 60 * 60 * 1000;
}

function AppDetail() {
  const { id } = Route.useParams();
  const { data: app } = useSuspenseQuery(appQuery(id));
  const qc = useQueryClient();
  const getApkUrl = useServerFn(getApkDownloadUrlFn);
  const increment = useMutation({
    mutationFn: () => incrementDownloadFn({ data: { id } }),
    onSuccess: (res) => {
      qc.setQueryData(["app", id], (prev: typeof app | undefined) =>
        prev ? { ...prev, Download_count: res.count } : prev,
      );
    },
  });

  const [gateOpen, setGateOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; contentType: string } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { userId } = useAccount();
  const bypass = useServerFn(exclusiveBypassFn);
  const fetchChangelogs = useServerFn(listChangelogsFn);
  const [sheet, setSheet] = useState<ChangelogItem[] | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [lightbox]);

  const previews = app.Previews ?? [];
  const banner = app.Banner_url ?? null;
  const fresh = isNew(app.Created_at);

  async function triggerDownload(directUrl?: string) {
    setDownloading(true);
    try {
      let url = directUrl ?? "";
      if (!url) {
        const res = await getApkUrl({ data: { id } });
        url = res.url ?? "";
      }
      if (!url) throw new Error("Link download tidak tersedia.");
      increment.mutate();
      // Navigate to signed URL — browser handles the download from Supabase CDN.
      window.location.href = url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memulai unduhan.");
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  }

  async function onDownloadClick() {
    if (app.Coming_soon) return;
    if (!app.Is_exclusive) {
      setDownloading(true);
      try {
        const logs = await fetchChangelogs({ data: { id } });
        const withLinks = logs.filter((c) => !!c.Download_url);
        if (withLinks.length > 0) {
          setSheet(withLinks);
          return;
        }
      } catch {
        /* fall back to the normal download */
      } finally {
        setDownloading(false);
      }
    }
    if (app.Is_exclusive) {
      // Pengguna yang sudah login: langsung unduh tanpa memasukkan password.
      if (userId) {
        setDownloading(true);
        try {
          const res = await bypass({ data: { id } });
          if (res.ok) {
            void triggerDownload(res.url || "");
            return;
          }
        } catch {
          /* jatuh kembali ke gate password */
        } finally {
          setDownloading(false);
        }
      }
      setGateOpen(true);
      return;
    }
    void triggerDownload();
  }

  return (
    <div className="relative min-h-screen bg-background">
      {banner && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] overflow-hidden">
          <img
            src={banner}
            alt=""
            aria-hidden="true"
            className="size-full scale-110 object-cover blur-[2px]"
          />
          {/* keep the top readable but let the artwork show through */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/35 to-background" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}
      {!banner && (
        <div
          aria-hidden="true"
          className="m3-aura pointer-events-none absolute inset-x-0 -top-20 h-80 opacity-50 blur-2xl"
        />
      )}
      <header className="relative mx-auto flex max-w-4xl items-center gap-3 px-4 pt-5 sm:px-6 md:pt-7">
        <Link
          to="/"
          aria-label="Kembali ke katalog"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-variant/80 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke katalog
        </Link>
        <span className="text-sm font-medium text-muted-foreground">Detail aplikasi</span>
      </header>

      <main className="relative mx-auto max-w-4xl px-4 pb-24 pt-5 sm:px-6 md:pt-6">
        <div
          className={
            banner
              ? "m3-shadow-2 rounded-4xl border border-white/25 bg-card/90 p-5 backdrop-blur-2xl sm:p-7 md:p-10"
              : "m3-shadow-1 m3-hairline rounded-4xl bg-card p-5 sm:p-7 md:p-10"
          }
        >

          <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-start md:text-left">
            {app.App_icon ? (
              <img
                src={app.App_icon}
                alt={app.App_name}
                className="m3-icon-glow size-28 rounded-3xl bg-surface-variant object-cover ring-1 ring-black/5 md:size-32"
              />
            ) : (
              <div className="m3-icon-glow flex size-28 items-center justify-center rounded-3xl bg-tertiary-container font-display text-4xl text-on-tertiary-container md:size-32">
                {app.App_name.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="flex-1">
              <h1 className="font-display text-3xl leading-tight md:text-4xl">
                {app.App_name}
              </h1>
              <p className="mt-1 text-xs font-mono text-muted-foreground">
                ID: {app.ID}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {fresh && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-950 shadow-sm animate-fade-in">
                    <Sparkles className="size-3.5" /> Baru
                  </span>
                )}
                {app.Coming_soon && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                    <Clock className="size-3.5" /> Segera hadir
                  </span>
                )}
                {app.Is_exclusive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-950 shadow-sm">
                    <Gem className="size-3.5" /> Eksklusif
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">
                  <Tag className="size-3.5" /> v{versionLabel(app.Version)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-tertiary-container px-3 py-1 text-xs font-semibold text-on-tertiary-container">
                  <Cpu className="size-3.5" /> Arsitektur: {archLabel(app.Arch)}
                </span>
              </div>
              <PressButton
                type="button"
                onClick={() => void onDownloadClick()}
                disabled={downloading || !!app.Coming_soon}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                draggable={false}
                style={{
                  WebkitTouchCallout: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {downloading ? (
                  <m3e-loading-indicator variant="contained" className="m3-loading-sm" aria-label="Menyiapkan unduhan" />
                ) : app.Coming_soon ? (
                  <Clock className="size-5" />
                ) : app.Is_exclusive && !userId ? (
                  <Lock className="size-5" />
                ) : (
                  <Download className="size-5" />
                )}
                {app.Coming_soon
                  ? "Akan Datang"
                  : downloading
                    ? "Memulai..."
                    : "Unduh APK"}
              </PressButton>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="m3-hairline flex items-center gap-3 rounded-2xl bg-surface-variant/50 p-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diunggah</p>
                <p className="font-semibold">{formatDate(app.Created_at)}</p>
              </div>
            </div>
            <div className="m3-hairline flex items-center gap-3 rounded-2xl bg-surface-variant/50 p-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total unduhan</p>
                <p className="font-semibold">
                  {formatCount(app.Download_count ?? 0)} orang
                </p>
              </div>
            </div>
          </div>

          {(app.Size_label || app.Play_link) && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {app.Size_label && (
                <div className="m3-hairline flex items-center gap-3 rounded-2xl bg-surface-variant/50 p-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <HardDrive className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ukuran</p>
                    <p className="font-semibold">{app.Size_label}</p>
                  </div>
                </div>
              )}
              {app.Play_link && (
                <a
                  href={app.Play_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="m3-hairline flex min-h-16 items-center gap-3 rounded-2xl bg-surface-variant/50 p-4 transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                    <Play className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Tersedia di</p>
                    <p className="truncate font-semibold">Google Play</p>
                  </div>
                  <ExternalLink className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </a>
              )}
            </div>
          )}


          {previews.length > 0 && (
            <section className="mt-8">
              <h2 className="flex items-center gap-2 font-display text-xl">
                <Images className="size-5 text-primary" /> Pratinjau
              </h2>
              <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
                {previews.map((p, i) => {
                  const isVideo = (p.contentType || "").startsWith("video/");
                  return (
                    <button
                      key={p.url}
                      type="button"
                      aria-label={`Buka pratinjau ${isVideo ? "video" : "gambar"} ${i + 1}`}
                      onClick={() => setLightbox(p)}
                      style={{
                        animationDelay: `${Math.min(i * 60, 400)}ms`,
                        animationFillMode: "backwards",
                      }}
                      className="m3-shadow-1 relative aspect-[9/16] h-64 shrink-0 snap-start animate-fade-in overflow-hidden rounded-2xl bg-surface-variant transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {isVideo ? (
                        <video
                          src={p.url}
                          className="size-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={p.url}
                          alt={`Preview ${i + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="size-full object-cover"
                        />
                      )}
                      {isVideo && (
                        <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          Video
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="m3-hairline mt-8 rounded-3xl bg-surface-variant/40 p-5 md:p-6">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <FileText className="size-5 text-primary" /> Deskripsi
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
              {app.Description || "Tidak ada deskripsi."}
            </p>
          </section>

          {(app.Changelog?.length ?? 0) > 0 && (
            <section className="m3-hairline mt-6 rounded-3xl bg-surface-variant/40 p-5 md:p-6">
              <h2 className="flex items-center gap-2 font-display text-xl">
                <FileText className="size-5 text-primary" /> Riwayat versi
              </h2>
              <ol className="mt-4 space-y-4 border-l border-primary/30 pl-4">
                {app.Changelog!.map((c, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
                    <div className="flex flex-wrap items-center gap-2">
                      {c.Version && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                          v{c.Version.replace(/^v/i, "")}
                        </span>
                      )}
                      {c.Title && <span className="font-medium">{c.Title}</span>}
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.Released_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </main>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau media"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Tutup pratinjau"
            onClick={(event) => {
              event.stopPropagation();
              setLightbox(null);
            }}
            className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          {(lightbox.contentType || "").startsWith("video/") ? (
            <video
              src={lightbox.url}
              controls
              autoPlay
              playsInline
              aria-label="Video pratinjau"
              className="max-h-full max-w-full rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={lightbox.url}
              alt="Pratinjau aplikasi"
              className="max-h-full max-w-full rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      {sheet && (
        <ChangelogSheet
          items={sheet}
          onClose={() => setSheet(null)}
          onPick={(c) => {
            setSheet(null);
            increment.mutate();
            window.location.href = c.Download_url!;
          }}
        />
      )}

      {gateOpen && (
        <PasswordGate
          appId={id}
          appName={app.App_name}
          onClose={() => setGateOpen(false)}
          onSuccess={(url) => {
            setGateOpen(false);
            increment.mutate();
            if (url) void triggerDownload(url);
          }}
        />
      )}
    </div>
  );
}

const ATTEMPTS_KEY_PREFIX = "excl_attempts_";

function PasswordGate({
  appId,
  appName,
  onClose,
  onSuccess,
}: {
  appId: string;
  appName: string;
  onClose: () => void;
  onSuccess: (url: string) => void;
}) {
  const verify = useServerFn(verifyExclusiveFn);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const key = ATTEMPTS_KEY_PREFIX + appId;

  function getAttempts(): number {
    try {
      return parseInt(localStorage.getItem(key) || "0", 10) || 0;
    } catch {
      return 0;
    }
  }
  function setAttempts(n: number) {
    try {
      localStorage.setItem(key, String(n));
    } catch {
      // ignore
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password.trim()) {
      setError("Password wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const res = await verify({
        data: { id: appId, password: password.trim() },
      });
      if (res.ok) {
        setAttempts(0);
        onSuccess(res.url || "");
        return;
      }
      const next = getAttempts() + 1;
      setAttempts(next);
      if (next >= 5) {
        setAttempts(0);
        window.location.href = WHATSAPP_REDIRECT;
        return;
      }
      setError(
        `Password salah. Percobaan ${next}/5. ${5 - next} lagi sebelum diarahkan.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memverifikasi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="m3-shadow-2 w-full max-w-sm rounded-3xl bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
            <Lock className="size-5" />
          </span>
          <div>
            <h3 className="font-display text-lg leading-tight">
              Aplikasi eksklusif
            </h3>
            <p className="text-xs text-muted-foreground">
              Masukkan password untuk mengunduh "{appName}".
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label htmlFor="exclusive-password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="exclusive-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password"
            maxLength={200}
            aria-invalid={!!error}
            aria-describedby={error ? "exclusive-password-error" : undefined}
            className="min-h-12 w-full rounded-2xl bg-surface-variant px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {error && (
            <p id="exclusive-password-error" role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface-variant px-4 py-2.5 text-sm font-medium transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Batal
            </button>
            <PressButton
              type="submit"
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <m3e-loading-indicator variant="contained" className="m3-loading-sm" aria-label="Memasang" />}
              Lanjutkan unduhan
            </PressButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangelogSheet({
  items,
  onClose,
  onPick,
}: {
  items: ChangelogItem[];
  onClose: () => void;
  onPick: (c: ChangelogItem) => void;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Pilih versi" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div
        className="m3-shadow-2 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-4xl bg-card pb-[env(safe-area-inset-bottom)] animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-muted-foreground/40" />
        <div className="flex items-center justify-between px-6 pb-2 pt-4">
          <h3 className="font-display text-xl">Pilih versi</h3>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-variant">Tutup</button>
        </div>
        <ul className="space-y-2 overflow-y-auto px-4 pb-6">
          {items.map((c, i) => (
            <li key={c.Id}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="m3-hairline flex w-full items-start gap-3 rounded-3xl bg-surface-variant/50 p-4 text-left transition-colors hover:bg-primary-container"
              >
                <Download className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">v{(c.Version ?? "").replace(/^v/i, "")}</span>
                    {i === 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Terbaru</span>}
                    {c.Title && <span className="text-sm">{c.Title}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(c.Released_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
