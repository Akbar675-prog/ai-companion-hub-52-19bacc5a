import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Medal, Award, Crown, Download } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { listAppsFn, type AppListItem } from "@/lib/apps.functions";
import { AppHeader } from "@/components/AppHeader";

const appsQuery = queryOptions({
  queryKey: ["apps"],
  queryFn: () => listAppsFn(),
});

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Galileo Mod APK" },
      {
        name: "description",
        content:
          "Papan peringkat aplikasi paling banyak diunduh di katalog Galileo Mod APK.",
      },
      { property: "og:title", content: "Leaderboard aplikasi" },
      {
        property: "og:description",
        content: "Top aplikasi paling banyak diunduh.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(appsQuery),
  component: LeaderboardPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">Gagal memuat: {error instanceof Error ? error.message : String(error)}</div>
  ),
});

const MEDAL_COLORS = ["#F5C518", "#C0C0C0", "#CD7F32"]; // gold, silver, bronze

function LeaderboardPage() {
  const { data: apps } = useSuspenseQuery(appsQuery);
  const ranked = [...apps].sort(
    (a, b) => (b.Download_count ?? 0) - (a.Download_count ?? 0),
  );
  const top = ranked[0];
  const topN = ranked.slice(0, 10);
  const chartData = topN.map((a, i) => ({
    name: a.App_name.length > 14 ? a.App_name.slice(0, 14) + "…" : a.App_name,
    downloads: a.Download_count ?? 0,
    rank: i + 1,
  }));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 pt-4 md:px-10">
        <Link
          to="/"
          aria-label="Kembali"
          className="inline-flex size-10 items-center justify-center rounded-full bg-surface-variant hover:bg-primary-container"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <span className="text-sm text-muted-foreground">Leaderboard</span>
      </div>

      <header className="px-5 pt-4 pb-6 md:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-container px-3 py-1 text-xs font-semibold uppercase tracking-widest text-on-primary-container">
            <Trophy className="size-4" /> Papan peringkat
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
            Top aplikasi
            <span className="block text-primary">paling banyak diunduh.</span>
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Peringkat dihitung otomatis berdasarkan jumlah unduhan.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-32 md:px-10">
        {ranked.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-outline bg-surface p-10 text-center text-muted-foreground">
            Belum ada aplikasi untuk diperingkatkan.
          </div>
        ) : (
          <>
            {top && <TopOneCard app={top} />}

            <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard
                title="Tren download (Top 10)"
                subtitle="Bentuk gunung berdasarkan jumlah unduhan"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="mountain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.85} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        borderRadius: 12,
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="downloads"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#mountain)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Podium download"
                subtitle="Emas · Perak · Perunggu"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={chartData.slice(0, 3)}
                    margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        borderRadius: 12,
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Bar dataKey="downloads" radius={[12, 12, 0, 0]}>
                      {chartData.slice(0, 3).map((_, i) => (
                        <Cell key={i} fill={MEDAL_COLORS[i] ?? "hsl(var(--primary))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>

            <section className="mt-8">
              <h2 className="font-display text-2xl">Ranking penuh</h2>
              <ul className="mt-4 space-y-2">
                {ranked.map((app, i) => (
                  <RankRow key={app.ID} app={app} rank={i + 1} />
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function TopOneCard({ app }: { app: AppListItem }) {
  return (
    <div className="m3-shadow-2 relative overflow-hidden rounded-4xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-6 text-amber-950 md:p-10 animate-fade-in">
      <div className="pointer-events-none absolute -right-8 -top-8 text-amber-100/40">
        <Crown className="size-48" />
      </div>
      <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-950/15 px-3 py-1 text-xs font-bold uppercase tracking-widest">
          <Crown className="size-4" /> Top 1 Download
        </div>
      </div>
      <div className="relative mt-6 flex flex-col items-center gap-6 md:flex-row md:items-center md:text-left">
        {app.App_icon ? (
          <img
            src={app.App_icon}
            alt={app.App_name}
            className="size-24 rounded-2xl bg-white/20 object-cover shadow-xl md:size-32"
          />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-2xl bg-white/20 font-display text-4xl shadow-xl md:size-32">
            {app.App_name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 text-center md:text-left">
          <h2 className="font-display text-3xl leading-tight md:text-5xl">
            {app.App_name}
          </h2>
          <p className="mt-1 text-sm opacity-80">
            {app.Description || "Tidak ada deskripsi."}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-950/20 px-4 py-2 text-lg font-bold">
            <Download className="size-5" />
            {new Intl.NumberFormat("id-ID").format(app.Download_count ?? 0)} orang mengunduh
          </p>
        </div>
        <Link
          to="/apps/$id"
          params={{ id: app.ID }}
          className="rounded-full bg-amber-950 px-5 py-3 text-sm font-semibold text-amber-100 transition-transform hover:scale-105"
        >
          Buka detail
        </Link>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="m3-shadow-1 rounded-3xl bg-card p-5 md:p-6">
      <h3 className="font-display text-lg leading-tight">{title}</h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function RankRow({ app, rank }: { app: AppListItem; rank: number }) {
  const medal = rank <= 3;
  const badge =
    rank === 1 ? (
      <span className="inline-flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950">
        <Trophy className="size-4" />
      </span>
    ) : rank === 2 ? (
      <span className="inline-flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800">
        <Medal className="size-4" />
      </span>
    ) : rank === 3 ? (
      <span className="inline-flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-amber-700 text-amber-950">
        <Award className="size-4" />
      </span>
    ) : (
      <span className="inline-flex size-9 items-center justify-center rounded-full bg-surface-variant font-mono text-xs font-bold text-muted-foreground">
        {rank}
      </span>
    );

  return (
    <li
      style={{
        animationDelay: `${Math.min((rank - 1) * 30, 400)}ms`,
        animationFillMode: "backwards",
      }}
      className={`m3-shadow-1 flex animate-fade-in items-center gap-3 rounded-2xl bg-card p-3 transition-all hover:-translate-y-0.5 ${
        medal ? "ring-1 ring-amber-500/20" : ""
      }`}
    >
      {badge}
      {app.App_icon ? (
        <img src={app.App_icon} alt="" className="size-11 shrink-0 rounded-lg bg-surface-variant object-cover" />
      ) : (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-tertiary-container font-display text-base text-on-tertiary-container">
          {app.App_name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{app.App_name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {new Intl.NumberFormat("id-ID").format(app.Download_count ?? 0)} download
        </p>
      </div>
      <Link
        to="/apps/$id"
        params={{ id: app.ID }}
        className="rounded-full bg-primary-container px-3 py-1.5 text-xs font-semibold text-on-primary-container hover:bg-primary hover:text-primary-foreground"
      >
        Buka
      </Link>
    </li>
  );
}
