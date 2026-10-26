import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Scale, ShieldAlert } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/term-of-services")({
  head: () => ({
    meta: [
      { title: "Ketentuan Layanan — Galileo Mod APK" },
      {
        name: "description",
        content: "Ketentuan penggunaan layanan dan katalog Galileo Mod APK.",
      },
      { property: "og:title", content: "Ketentuan Layanan — Galileo Mod APK" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: TermsOfServicesPage,
});

function TermsOfServicesPage() {
  return (
    <div className="min-h-screen bg-background pb-16">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6 md:pt-12">
        <Link
          to="/"
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Kembali ke katalog
        </Link>

        <header className="mt-5 rounded-3xl bg-secondary-container p-6 text-on-secondary-container sm:p-8">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-background/60">
            <FileText aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em]">Dokumen legal</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
            Ketentuan Layanan
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed opacity-85 sm:text-base">
            Aturan penggunaan situs, akun, dan katalog Galileo Mod APK.
          </p>
          <p className="mt-5 text-xs font-medium opacity-75">
            Terakhir diperbarui: 26 Oktober 2026
          </p>
        </header>

        <article className="m3-shadow-1 mt-6 space-y-8 rounded-3xl bg-card p-5 sm:p-8">
          <LegalSection title="1. Persetujuan atas ketentuan">
            Dengan mengakses atau menggunakan Galileo Mod APK, kamu menyetujui ketentuan ini dan
            Kebijakan Privasi kami. Jika kamu tidak menyetujui ketentuan ini, jangan gunakan layanan
            atau buat akun.
          </LegalSection>

          <LegalSection title="2. Penggunaan layanan">
            Layanan menyediakan katalog informasi dan tautan terkait aplikasi Android. Kamu
            bertanggung jawab atas cara menggunakan layanan, perangkat, jaringan, serta setiap
            berkas yang dipilih untuk diunduh atau dipasang. Gunakan layanan hanya untuk tujuan yang
            sah dan sesuai hukum yang berlaku.
          </LegalSection>

          <LegalSection title="3. Akun dan keamanan">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Berikan informasi akun yang akurat dan jangan gunakan identitas orang lain tanpa
                izin.
              </li>
              <li>Jaga kerahasiaan password dan akses akun kamu.</li>
              <li>Kamu bertanggung jawab atas aktivitas yang terjadi melalui akun kamu.</li>
              <li>
                Kami dapat membatasi atau menonaktifkan akun yang kami nilai disalahgunakan atau
                membahayakan layanan.
              </li>
            </ul>
          </LegalSection>

          <LegalSection title="4. Konten dan hak pihak ketiga">
            Nama aplikasi, merek dagang, ikon, serta konten lain dapat menjadi milik pemegang hak
            masing-masing. Tidak ada bagian dari layanan ini yang memberikan kepemilikan atau
            lisensi atas hak pihak ketiga. Jika kamu adalah pemegang hak dan memiliki pertanyaan
            atau keberatan atas suatu konten, hubungi kami melalui kanal resmi situs.
          </LegalSection>

          <LegalSection title="5. Tautan, unduhan, dan pemasangan">
            <div className="flex gap-3 rounded-2xl bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
              <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <p>
                Periksa sumber, detail, izin, kompatibilitas, dan ketentuan aplikasi sebelum
                mengunduh atau memasang. Kamu menanggung risiko penggunaan berkas dan layanan pihak
                ketiga. Kami tidak menjamin setiap aplikasi akan selalu tersedia, aman, bebas
                kesalahan, atau kompatibel dengan perangkat kamu.
              </p>
            </div>
          </LegalSection>

          <LegalSection title="6. Larangan penggunaan">
            Kamu tidak boleh menyalahgunakan layanan, termasuk mencoba mengakses akun atau sistem
            tanpa izin, mengganggu keamanan atau ketersediaan layanan, menyebarkan malware,
            melakukan penipuan, mengirim spam, melanggar hak pihak lain, atau memakai layanan untuk
            aktivitas ilegal.
          </LegalSection>

          <LegalSection title="7. Ketersediaan dan perubahan layanan">
            Kami dapat mengubah, menambahkan, menghapus, menghentikan, atau membatasi bagian dari
            layanan kapan saja untuk pemeliharaan, keamanan, atau alasan operasional. Kami tidak
            menjamin layanan akan tersedia tanpa gangguan setiap saat.
          </LegalSection>

          <LegalSection title="8. Penafian dan pembatasan tanggung jawab">
            Layanan disediakan sebagaimana adanya dan sebagaimana tersedia. Sejauh diizinkan hukum
            yang berlaku, kami tidak bertanggung jawab atas kerugian yang timbul dari penggunaan
            atau ketidakmampuan menggunakan layanan, tautan eksternal, aplikasi pihak ketiga, maupun
            tindakan pengguna lain.
          </LegalSection>

          <LegalSection title="9. Perubahan ketentuan">
            Kami dapat memperbarui ketentuan ini. Versi terbaru akan ditampilkan pada halaman ini
            beserta tanggal pembaruannya. Dengan tetap menggunakan layanan setelah pembaruan
            berlaku, kamu menyetujui ketentuan terbaru tersebut.
          </LegalSection>

          <LegalSection title="10. Hubungi kami">
            Untuk pertanyaan tentang ketentuan ini, gunakan kanal resmi yang tersedia pada menu
            situs.
          </LegalSection>
        </article>

        <nav className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
          <Link
            to="/privacy-policy"
            className="rounded-full bg-primary-container px-4 py-2 text-on-primary-container hover:opacity-90"
          >
            Kebijakan Privasi
          </Link>
          <Link
            to="/"
            className="rounded-full bg-surface-variant px-4 py-2 hover:bg-primary-container"
          >
            Katalog aplikasi
          </Link>
        </nav>
        <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Scale aria-hidden="true" className="size-3.5" /> Galileo Mod APK
        </p>
      </main>
    </div>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl sm:text-2xl">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {children}
      </div>
    </section>
  );
}
