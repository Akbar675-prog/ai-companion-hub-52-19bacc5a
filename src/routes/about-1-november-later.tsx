import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Coins, ExternalLink, Info, Server, Wrench } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/about-1-november-later")({
  head: () => ({
    meta: [
      { title: "Perubahan Tautan Unduhan — Galileo Mod APK" },
      {
        name: "description",
        content:
          "Penjelasan tentang perubahan tautan unduhan mulai 1 November 2026 dan dukungannya terhadap biaya server serta pengembangan mod.",
      },
    ],
    links: [{ rel: "canonical", href: "https://galileomodapk.visora.my.id/about-1-november-later" }],
  }),
  component: DownloadChangeExplanation,
});

const reasons = [
  {
    icon: <Server aria-hidden="true" className="size-5" />,
    title: "Membantu biaya operasional server",
    body: "Menjalankan katalog, menyimpan informasi dan berkas, serta menjaga layanan tetap tersedia membutuhkan biaya. Tautan beriklan membantu mendukung sebagian biaya operasional tersebut.",
  },
  {
    icon: <Wrench aria-hidden="true" className="size-5" />,
    title: "Mendukung lebih banyak pembaruan mod",
    body: "Dukungan dari tautan iklan juga membantu memberi ruang bagi modder untuk meluangkan waktu membuat dan memperbarui mod. Ini adalah dukungan untuk prosesnya, bukan jaminan bahwa setiap aplikasi akan selalu memiliki mod baru.",
  },
  {
    icon: <Coins aria-hidden="true" className="size-5" />,
    title: "Akses katalog tetap gratis",
    body: "Perubahan ini berlaku pada jalur menuju tautan unduhan. Kami ingin katalog tetap dapat dijelajahi tanpa biaya langganan; halaman iklan mungkin menampilkan iklan atau pengalihan sebelum berkas unduhan.",
  },
];

function DownloadChangeExplanation() {
  return (
    <div className="relative min-h-screen bg-background">
      <AppHeader />
      <div
        aria-hidden="true"
        className="m3-aura pointer-events-none absolute inset-x-0 -top-24 h-96 opacity-40 blur-3xl"
      />
      <main className="relative mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6 md:pt-12">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke katalog
        </Link>

        <article className="mt-6 rounded-[2rem] border border-border/70 bg-card/90 p-5 shadow-sm backdrop-blur-xl sm:p-8 md:p-10">
          <header className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-container px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-on-primary-container">
              <Info aria-hidden="true" className="size-3.5" /> Pengumuman
            </span>
            <h1 className="mt-5 font-display text-3xl leading-tight tracking-tight sm:text-4xl md:text-5xl">
              Perubahan tautan unduhan mulai 1 November 2026
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Kami akan mengubah jalur menuju tautan unduhan. Setelah perubahan berlaku, tombol unduh dapat membawa kamu ke halaman iklan terlebih dahulu sebelum melanjutkan ke berkas.
            </p>
          </header>

          <section className="mt-8 rounded-3xl border border-primary/20 bg-primary-container/40 p-5 sm:p-6" aria-labelledby="what-changes">
            <h2 id="what-changes" className="font-display text-xl sm:text-2xl">
              Apa yang akan berubah?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85 sm:text-base">
              Mulai tanggal tersebut, sebagian atau seluruh tautan unduhan dapat melewati layanan perantara beriklan, misalnya Safefileku atau tautan singkat sfl.gl. Ikuti petunjuk di halaman perantara untuk menuju berkas unduhan. Tampilan dan langkahnya ditentukan oleh penyedia layanan tersebut dan dapat berubah sewaktu-waktu.
            </p>
            <a
              href="https://safefileku.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Kunjungi Safefileku
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          </section>

          <section className="mt-9" aria-labelledby="why-change">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Alasan perubahan
            </p>
            <h2 id="why-change" className="mt-1 font-display text-2xl sm:text-3xl">
              Dukungan agar layanan bisa terus berjalan
            </h2>
            <div className="mt-5 grid gap-4">
              {reasons.map((reason) => (
                <section
                  key={reason.title}
                  className="m3-hairline flex items-start gap-4 rounded-3xl bg-surface-variant/40 p-5"
                >
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
                    {reason.icon}
                  </span>
                  <div>
                    <h3 className="font-semibold leading-snug">{reason.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {reason.body}
                    </p>
                  </div>
                </section>
              ))}
            </div>
          </section>

          <section className="mt-9" aria-labelledby="stay-safe">
            <h2 id="stay-safe" className="font-display text-2xl">
              Tetap berhati-hati saat mengunduh
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Perhatikan alamat situs dan baca instruksi sebelum melanjutkan.</li>
              <li>Jangan masukkan kata sandi, detail pembayaran, atau informasi pribadi untuk membuka tautan unduhan.</li>
              <li>Hindari memasang aplikasi atau ekstensi yang tidak kamu minta. Jika halaman terasa mencurigakan, tutup dan kembali ke situs ini.</li>
              <li>Halaman iklan dan pengalih dikelola pihak ketiga; kami tidak mengendalikan semua iklan, konten, atau pengalihan yang mungkin ditampilkan di sana.</li>
            </ul>
          </section>

          <footer className="mt-9 flex flex-col gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Terima kasih telah membantu menjaga layanan tetap berjalan dan mendukung komunitas modder.
            </p>
            <Link
              to="/"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Kembali ke katalog
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </footer>
        </article>
      </main>
    </div>
  );
}
