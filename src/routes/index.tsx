import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Download, Gem, Sparkles, Clock, Package, Search, ArrowRight } from "lucide-react";
import { z } from "zod";
import { listAppsFn, type AppListItem } from "@/lib/apps.functions";
import { versionLabel } from "@/lib/metadata.functions";
import { AppHeader } from "@/components/AppHeader";
import { useT } from "@/lib/i18n";
import { currentHost, isStatusHost } from "@/lib/status-host";

const appsQuery = queryOptions({
  queryKey: ["apps"],
  queryFn: () => listAppsFn(),
});

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: async () => {
    const host = await currentHost();
    if (isStatusHost(host)) throw redirect({ to: "/status" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(appsQuery),
  component: Home,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">Gagal memuat: {error instanceof Error ? error.message : String(error)}</div>
  ),
});

function scoreApp(app: AppListItem, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const name = app.App_name.toLowerCase();
  const desc = (app.Description || "").toLowerCase();
  const ver = (app.Version || "").toLowerCase();
  const id = app.ID.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (!t) continue;
    if (name === t) score += 100;
    if (name.startsWith(t)) score += 40;
    if (name.includes(t)) score += 20;
    if (desc.includes(t)) score += 5;
    if (ver.includes(t)) score += 8;
    if (id.toLowerCase().includes(t)) score += 3;
  }
  return score;
}

function isNew(iso?: string): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 60 * 60 * 1000; // < 1 hour
}

function Home() {
  const t = useT();
  const { data: apps } = useSuspenseQuery(appsQuery);
  const { q } = Route.useSearch();
  const keyword = (q ?? "").trim().toLowerCase();
  const tokens = keyword ? keyword.split(/\s+/).filter(Boolean) : [];
  const filtered = keyword
    ? apps
        .map((a) => ({ a, s: scoreApp(a, tokens) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.a)
    : apps;

  const totalDownloads = apps.reduce((s, a) => s + (a.Download_count ?? 0), 0);
  const exclusiveCount = apps.filter((a) => a.Is_exclusive).length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <header className="relative px-4 pb-8 pt-6 sm:px-6 md:pb-10 md:pt-8">
        <div
          aria-hidden="true"
          className="m3-aura pointer-events-none absolute inset-x-0 -top-24 h-[28rem] opacity-40 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl gap-8 overflow-hidden rounded-[2rem] border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-xl sm:p-8 md:grid-cols-[minmax(0,1.35fr)_minmax(15rem,0.65fr)] md:items-end md:p-10">
          <div>
            <span className="m3-hairline inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Katalog APK
            </span>
            <h1 className="mt-5 max-w-3xl font-display text-4xl leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
              {t("Temukan aplikasi")}{" "}
              <span className="bg-gradient-to-r from-primary via-tertiary to-secondary bg-clip-text text-transparent">
                {t("yang kamu cari.")}
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              {t("Jelajahi katalog, cek informasi dan versi aplikasi, lalu buka detail sebelum mengunduh.")}
            </p>

            <form
              key={q ?? ""}
              role="search"
              action="/"
              method="get"
              className="mt-6 flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-background p-1.5 pl-4 shadow-sm transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/30"
            >
              <Search aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Cari nama aplikasi..."
                aria-label="Cari aplikasi dalam katalog"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Cari <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </form>

            {keyword ? (
              <p role="status" className="mt-3 text-sm text-muted-foreground">
                Hasil untuk <span className="font-semibold text-foreground">“{q}”</span>
                {" · "}{filtered.length} aplikasi
                {" · "}
                <Link to="/" className="font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Hapus pencarian
                </Link>
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Cari berdasarkan nama aplikasi atau kata kunci.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-3 md:grid-cols-1">
            <StatTile
              icon={<Package aria-hidden="true" className="size-4" />}
              label="Aplikasi"
              value={new Intl.NumberFormat("id-ID").format(apps.length)}
            />
            <StatTile
              icon={<Download aria-hidden="true" className="size-4" />}
              label="Total unduhan"
              value={new Intl.NumberFormat("id-ID").format(totalDownloads)}
            />
            <StatTile
              icon={<Gem aria-hidden="true" className="size-4" />}
              label="Eksklusif"
              value={new Intl.NumberFormat("id-ID").format(exclusiveCount)}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Katalog</p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl">
              {keyword ? "Hasil pencarian" : "Semua aplikasi"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">{filtered.length} aplikasi</p>
        </div>
        {filtered.length === 0 ? (
          <EmptyState hasSearch={!!keyword} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((app, i) => (
              <AppCard key={app.ID} app={app} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/70 bg-background/75 p-3 sm:p-3.5">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-lg font-semibold leading-tight tabular-nums">{value}</span>
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function AppCard({ app, index }: { app: AppListItem; index: number }) {
  const t = useT();
  const fresh = !!app.Is_new || isNew(app.Created_at);
  return (
    <Link
      to="/apps/$id"
      params={{ id: app.ID }}
      style={{
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        animationFillMode: "backwards",
      }}
      className="group m3-shadow-1 m3-hairline relative flex min-h-64 animate-fade-in flex-col gap-4 overflow-hidden rounded-3xl bg-card p-5 transition-all duration-200 hover:m3-shadow-2 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/15 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex items-start gap-4">
        <IconBox src={app.App_icon} alt={app.App_name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 break-words font-display text-lg leading-tight">
              {t(app.App_name)}
            </h2>
            <ArrowRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {t(app.Description || "Tidak ada deskripsi.")}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {fresh && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-950">
                <Sparkles className="size-3" />
                Baru
              </span>
            )}
            {app.Coming_soon && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                <Clock className="size-3" />
                Segera
              </span>
            )}
            {app.Is_exclusive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-950">
                <Gem className="size-3" />
                Eksklusif
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="relative mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-secondary-container px-2.5 py-1 text-[11px] font-medium text-on-secondary-container">
            APK
          </span>
          <span className="rounded-full bg-surface-variant px-2.5 py-1 font-mono text-[11px] font-medium text-muted-foreground">
            v{versionLabel(app.Version)}
          </span>
        </div>
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary-container px-3 py-1.5 text-xs font-semibold text-on-primary-container transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          Lihat detail
          <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function IconBox({ src, alt }: { src: string; alt: string }) {
  if (!src) {
    return (
      <div aria-hidden="true" className="m3-icon-glow flex size-14 shrink-0 items-center justify-center rounded-2xl bg-tertiary-container font-display text-xl text-on-tertiary-container">
        {alt.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="size-14 shrink-0 rounded-2xl bg-surface-variant object-cover ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-105"
      loading="lazy"
    />
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="rounded-4xl border border-dashed border-outline bg-surface p-10 text-center">
      <h2 className="font-display text-2xl">
        {hasSearch ? "Tidak ada hasil" : "Belum ada aplikasi"}
      </h2>
      <p className="mt-2 text-muted-foreground">
        {hasSearch
          ? "Coba kata kunci lain, atau reset pencarian."
          : "Mulai isi katalog dengan menambahkan aplikasi pertama."}
      </p>
      {hasSearch ? (
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Hapus pencarian
        </Link>
      ) : (
        <Link
          to="/addapps"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus aria-hidden="true" className="size-5" /> Tambah aplikasi
        </Link>
      )}
    </div>
  );
}
