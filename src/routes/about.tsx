import { createFileRoute, Link } from "@tanstack/react-router";
import { Info, Sparkles, Package, ShieldCheck, Gift, Lock, ArrowRight } from "lucide-react";
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
      title: "Gratis digunakan",
      body: "Aplikasi di katalog ini tersedia tanpa biaya dan langganan. Buka halaman detail untuk melihat versi serta pilihan unduhan yang tersedia.",
    },
    {
      icon: <Lock className="size-5" />,
      title: "Aplikasi eksklusif",
      body: "Sebagian aplikasi memerlukan password untuk membuka unduhannya. Statusnya tetap gratis; password hanya membatasi akses ke tautan unduhan.",
    },
    {
      icon: <Sparkles className="size-5" />,
      title: "Dibuat untuk mudah dijelajahi",
      body: "Tampilan menggunakan Material 3 Expressive, dengan navigasi konsisten, tipografi yang mudah dibaca, dan komponen yang nyaman di ponsel maupun desktop.",
    },
    {
      icon: <Package className="size-5" />,
      title: "Teknologi",
      body: "Dibangun dengan TanStack Start, React, Tailwind CSS, dan komponen Lucide. Katalog dan detail aplikasi dikelola melalui layanan backend proyek.",
    },
    {
      icon: <ShieldCheck className="size-5" />,
      title: "Info & kehati-hatian",
      body: "Berkas aplikasi dikelola oleh pemilik katalog. Periksa detail dan sumber aplikasi sebelum memasang. Situs ini masih dalam pengembangan aktif.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-background">
      <AppHeader />
      <div
        aria-hidden="true"
        className="m3-aura pointer-events-none absolute inset-x-0 -top-24 h-96 opacity-40 blur-3xl"
      />

      <main className="relative mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 md:pt-12">
        <section className="max-w-3xl">
          <span className="m3-hairline inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary backdrop-blur-md">
            <Info aria-hidden="true" className="size-3.5" /> Tentang katalog
          </span>
          <h1 className="mt-5 font-display text-4xl leading-[1.08] tracking-tight sm:text-5xl">
            Aplikasi yang mudah dijelajahi, dengan{" "}
            <span className="bg-gradient-to-r from-primary via-tertiary to-secondary bg-clip-text text-transparent">
              detail yang jelas.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Galileo Mod APK mengumpulkan aplikasi Android dalam satu katalog. Lihat informasi dan versi aplikasi sebelum membuka pilihan unduhan.
          </p>
        </section>

        <section className="mt-10" aria-labelledby="about-details-heading">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Tentang layanan</p>
            <h2 id="about-details-heading" className="mt-1 font-display text-2xl sm:text-3xl">
              Yang perlu diketahui
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item, i) => (
              <Info3Card
                key={item.title}
                icon={item.icon}
                title={item.title}
                body={item.body}
                tone={TONES[i % TONES.length]}
                index={i}
              />
            ))}
          </div>
        </section>

        <section className="mt-10 flex flex-col gap-5 rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-display text-xl">Siap menjelajah?</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Temukan aplikasi dan baca detailnya sebelum mengunduh.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Package aria-hidden="true" className="size-4" /> Buka katalog
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Galileo Mod APK · Material 3 Expressive
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
    <article
      style={{
        animationDelay: `${Math.min(index * 40, 160)}ms`,
        animationFillMode: "backwards",
      }}
      className="m3-shadow-1 m3-hairline flex h-full items-start gap-4 rounded-3xl bg-card p-5 animate-fade-in sm:p-6"
    >
      <span
        aria-hidden="true"
        className={`inline-flex size-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-xl leading-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </article>
  );
}
