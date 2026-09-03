import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Download, Gem, Sparkles, Clock, Package, ArrowUpRight } from "lucide-react";
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
    <div className="p-8 text-destructive">Gagal memuat: {error.message}</div>
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

      <header className="relative overflow-hidden px-5 pt-8 pb-8 md:px-10 md:pt-14">
        <div
          aria-hidden="true"
          className="m3-aura pointer-events-none absolute inset-x-0 -top-24 h-[26rem] opacity-60 blur-2xl"
        />
        <div className="relative mx-auto max-w-6xl">
          <span className="m3-hairline inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur-md">
            <Sparkles className="size-3.5" />
            Galileo Mod APK
          </span>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] md:text-6xl">
            {t("Katalog aplikasi")}
            <span className="block bg-gradient-to-r from-primary via-tertiary to-secondary bg-clip-text text-transparent">
              {t("siap di-download.")}
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            {t("Ketuk kartu untuk membuka detail dan mengunduh APK-nya.")}
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <StatChip
              icon={<Package className="size-4" />}
              label={`${apps.length} aplikasi`}
            />
            <StatChip
              icon={<Download className="size-4" />}
              label={`${new Intl.NumberFormat("id-ID").format(totalDownloads)} unduhan`}
            />
            {exclusiveCount > 0 && (
              <StatChip
                icon={<Gem className="size-4" />}
                label={`${exclusiveCount} exclusive`}
              />
            )}
          </div>

          {keyword && (
            <p className="mt-5 text-sm text-muted-foreground">
              Hasil pencarian untuk{" "}
              <span className="font-semibold text-foreground">"{q}"</span> —{" "}
              {filtered.length} aplikasi
              {" · "}
              <Link to="/" className="font-medium text-primary underline">
                Reset
              </Link>
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-32 md:px-10">
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

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="m3-hairline inline-flex items-center gap-2 rounded-full bg-card/70 px-3.5 py-2 text-sm font-medium text-foreground/80 backdrop-blur-md">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
  );
}

function AppCard({ app, index }: { app: AppListItem; index: number }) {
  const t = useT();
  const fresh = isNew(app.Created_at);
  return (
    <Link
      to="/apps/$id"
      params={{ id: app.ID }}
      style={{
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        animationFillMode: "backwards",
      }}
      className="group m3-shadow-1 m3-hairline relative flex animate-fade-in flex-col gap-4 overflow-hidden rounded-3xl bg-card p-5 transition-all duration-300 hover:m3-shadow-2 hover:-translate-y-1.5 active:scale-[0.985]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/15 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex items-start gap-4">
        <IconBox src={app.App_icon} alt={app.App_name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 truncate font-display text-lg leading-tight">
              {t(app.App_name)}
            </h2>
            <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {t(app.Description || "Tidak ada deskripsi.")}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {fresh && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-950">
                <Sparkles className="size-3" />
                New
              </span>
            )}
            {app.Coming_soon && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                <Clock className="size-3" />
                Soon
              </span>
            )}
            {app.Is_exclusive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-950">
                <Gem className="size-3" />
                Exclusive
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1.5 text-xs font-semibold text-on-primary-container transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md">
          <Download className="size-3.5 transition-transform group-hover:translate-y-0.5" />
          Download
        </span>
      </div>
    </Link>
  );
}

function IconBox({ src, alt }: { src: string; alt: string }) {
  if (!src) {
    return (
      <div className="m3-icon-glow flex size-14 shrink-0 items-center justify-center rounded-2xl bg-tertiary-container font-display text-xl text-on-tertiary-container">
        {alt.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
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
      <Link
        to="/addapps"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
      >
        <Plus className="size-5" /> Tambah aplikasi
      </Link>
    </div>
  );
}
