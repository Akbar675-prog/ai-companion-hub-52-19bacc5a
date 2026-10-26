import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Database, Eye, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Kebijakan Privasi — Galileo Mod APK" },
      {
        name: "description",
        content: "Kebijakan privasi Galileo Mod APK dan cara kami memproses data akun pengguna.",
      },
      { property: "og:title", content: "Kebijakan Privasi — Galileo Mod APK" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
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

        <header className="mt-5 rounded-3xl bg-primary-container p-6 text-on-primary-container sm:p-8">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-background/60">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em]">Dokumen legal</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
            Kebijakan Privasi
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed opacity-85 sm:text-base">
            Penjelasan tentang data yang kami gunakan untuk menyediakan akun dan layanan Galileo Mod
            APK.
          </p>
          <p className="mt-5 text-xs font-medium opacity-75">
            Terakhir diperbarui: 26 Oktober 2026
          </p>
        </header>

        <article className="m3-shadow-1 mt-6 space-y-8 rounded-3xl bg-card p-5 sm:p-8">
          <LegalSection title="1. Ruang lingkup">
            Kebijakan ini berlaku saat kamu mengakses situs Galileo Mod APK, membuat akun, masuk ke
            akun, mengirim laporan, atau menggunakan fitur layanan kami. Dengan menggunakan layanan,
            kamu setuju agar data diproses sebagaimana dijelaskan di halaman ini.
          </LegalSection>

          <LegalSection title="2. Data yang kami kumpulkan">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Data akun seperti nama panggilan, username, alamat email, dan foto profil bila
                tersedia.
              </li>
              <li>
                Data autentikasi dan sesi yang diperlukan agar kamu dapat tetap masuk dengan aman.
              </li>
              <li>
                Konten yang kamu kirimkan, misalnya laporan masalah, permintaan aplikasi, atau
                pembaruan profil.
              </li>
              <li>
                Data teknis dasar yang dikirimkan browser saat mengakses layanan, seperti alamat IP,
                perangkat, dan log keamanan.
              </li>
            </ul>
          </LegalSection>

          <LegalSection title="3. Login dengan Google">
            Jika kamu memilih masuk dengan Google, kami menerima identitas yang diperlukan untuk
            membuat atau mengakses akun, seperti nama, alamat email, dan foto profil sesuai izin
            yang kamu setujui di Google. Kami tidak menerima atau menyimpan password akun Google
            kamu. Akses Google dapat dicabut dari halaman keamanan akun Google kapan saja.
          </LegalSection>

          <LegalSection title="4. Cara kami menggunakan data">
            Data digunakan untuk menyediakan dan mengamankan akun, menampilkan profil, menanggapi
            laporan, mencegah penyalahgunaan, memperbaiki layanan, serta memenuhi kewajiban hukum
            yang berlaku. Kami tidak menjual data pribadi kamu.
          </LegalSection>

          <LegalSection title="5. Penyimpanan dan pihak yang membantu layanan">
            <div className="flex gap-3 rounded-2xl bg-surface-variant p-4 text-sm leading-relaxed text-muted-foreground">
              <Database aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <p>
                Data akun dan autentikasi dikelola dengan layanan Supabase. Login Google diproses
                melalui Google. Infrastruktur hosting dapat memproses data teknis seperlunya untuk
                menyajikan situs. Kami hanya menggunakan penyedia tersebut untuk menjalankan dan
                mengamankan layanan.
              </p>
            </div>
          </LegalSection>

          <LegalSection title="6. Cookies dan penyimpanan browser">
            Kami dapat menggunakan penyimpanan browser untuk menjaga sesi login, pilihan tampilan,
            dan kenyamanan penggunaan. Menghapus data browser atau menonaktifkan penyimpanan
            tertentu dapat membuat beberapa fungsi layanan tidak berjalan sebagaimana mestinya.
          </LegalSection>

          <LegalSection title="7. Retensi dan keamanan">
            Kami menyimpan data selama akun atau data tersebut masih diperlukan untuk menjalankan
            layanan, menyelesaikan masalah, menjaga keamanan, atau memenuhi kewajiban hukum. Kami
            menerapkan langkah teknis yang wajar untuk melindungi data, tetapi tidak ada transmisi
            atau penyimpanan digital yang dapat dijamin sepenuhnya bebas risiko.
          </LegalSection>

          <LegalSection title="8. Hak dan pilihan kamu">
            Kamu dapat memperbarui data profil melalui halaman profil. Untuk pertanyaan terkait data
            pribadi, akses, koreksi, atau penghapusan akun, hubungi kami melalui kanal resmi yang
            tercantum pada menu situs.
          </LegalSection>

          <LegalSection title="9. Perubahan kebijakan">
            Kami dapat memperbarui kebijakan ini bila layanan atau ketentuan hukum berubah. Tanggal
            pembaruan terbaru selalu ditampilkan di halaman ini. Penggunaan layanan setelah
            perubahan berlaku berarti kamu menerima kebijakan yang diperbarui.
          </LegalSection>
        </article>

        <nav className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
          <Link
            to="/term-of-services"
            className="rounded-full bg-secondary-container px-4 py-2 text-on-secondary-container hover:opacity-90"
          >
            Ketentuan Layanan
          </Link>
          <Link
            to="/"
            className="rounded-full bg-surface-variant px-4 py-2 hover:bg-primary-container"
          >
            Katalog aplikasi
          </Link>
        </nav>
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
