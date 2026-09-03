import { createFileRoute } from "@tanstack/react-router";
import { Info, Sparkles, Package, ShieldCheck, Gift, Lock } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Galileo Mod APK" },
      {
        name: "description",
        content:
          "Tentang Galileo Mod APK — katalog download APK dengan tema Material 3 Expressive.",
      },
      { property: "og:title", content: "About — Galileo Mod APK" },
      {
        property: "og:description",
        content: "Info tentang aplikasi, library, dan pengembangnya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

const TONES = [
  "bg-primary-container text-on-primary-container",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
] as const;

function About() {
  const items = [
    {
      icon: <Gift className="size-5" />,
      title: "100% Gratis",
      body: "Semua aplikasi di katalog ini bisa diunduh gratis tanpa biaya apa pun. Tidak ada langganan, tidak ada paywall — cukup klik Download APK.",
    },
    {
      icon: <Lock className="size-5" />,
      title: "Aplikasi Exclusive (butuh password)",
      body: "Sebagian kecil aplikasi ditandai Exclusive dan hanya perlu password singkat untuk membuka unduhannya. Aplikasinya tetap gratis — password hanya sebagai pembatas akses.",
    },
    {
      icon: <Sparkles className="size-5" />,
      title: "Material 3 Expressive",
      body: "Website ini menggunakan bahasa desain Material 3 (Expressive) — bentuk membulat besar, warna dinamis, dan tipografi Roboto Flex + Roboto Serif.",
    },
    {
      icon: <Package className="size-5" />,
      title: "Library & Stack",
      body: "Dibangun dengan TanStack Start (React 19 + Vite 7), Tailwind CSS v4, shadcn/ui, lucide-react, dan Lovable Cloud sebagai backend penyimpanan.",
    },
    {
      icon: <ShieldCheck className="size-5" />,
      title: "Pemberitauan",
      body: "Semua APK yang ada di katalog dikelola oleh owner. Pastikan mengunduh hanya dari sumber tepercaya. Web ini masih dalam pengembangan aktif.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-background">
      <AppHeader />
      <div
        aria-hidden="true"
        className="m3-aura pointer-events-none absolute inset-x-0 -top-24 h-96 opacity-50 blur-2xl"
      />

      <main className="relative mx-auto max-w-3xl px-5 pb-32 pt-8 md:px-10 md:pt-12">
        <span className="m3-hairline inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur-md">
          <Info className="size-3.5" /> Tentang
        </span>
        <h1 className="mt-4 font-display text-4xl leading-[1.05] md:text-5xl">
          Katalog APK yang{" "}
          <span className="bg-gradient-to-r from-primary via-tertiary to-secondary bg-clip-text text-transparent">
            sederhana & jujur.
          </span>
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
          Galileo Mod APK adalah katalog aplikasi Android yang bisa kamu unduh
          langsung, dibuat dengan bahasa desain Material 3 Expressive.
        </p>

        <div className="mt-10 grid gap-4">
          {items.map((it, i) => (
            <Info3Card
              key={it.title}
              icon={it.icon}
              title={it.title}
              body={it.body}
              tone={TONES[i % TONES.length]}
              index={i}
            />
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Dibuat dengan Material 3 Expressive · Galileo Mod APK
        </p>
      </main>
    </div>
  );
}

function Info3Card({
  icon,
  title,
  body,
  tone,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: string;
  index: number;
}) {
  return (
    <div
      style={{
        animationDelay: `${Math.min(index * 60, 400)}ms`,
        animationFillMode: "backwards",
      }}
      className="m3-shadow-1 m3-hairline group flex animate-fade-in gap-4 rounded-3xl bg-card p-5 transition-all duration-300 hover:m3-shadow-2 hover:-translate-y-1 md:p-6"
    >
      <span
        className={`inline-flex size-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${tone}`}
      >
        {icon}
      </span>
      <div>
        <h2 className="font-display text-xl leading-tight">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}
