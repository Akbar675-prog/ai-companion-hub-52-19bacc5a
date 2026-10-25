import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Bug, Clock3, MessageSquareText, Plus, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useAccount } from "@/lib/use-account";
import { listMyReportsFn } from "@/lib/reports.functions";

export const Route = createFileRoute("/my-report")({
  head: () => ({
    meta: [
      { title: "Tiket Saya · Galileo Mod APK" },
      { name: "description", content: "Lihat status dan catatan pada tiket laporanmu." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MyReportsPage,
});

const STATUS: Record<string, { label: string; style: string }> = {
  open: { label: "Diterima", style: "bg-secondary-container text-on-secondary-container" },
  in_progress: {
    label: "Dalam pengerjaan",
    style: "bg-primary-container text-on-primary-container",
  },
  resolved: { label: "Diselesaikan", style: "bg-tertiary-container text-on-tertiary-container" },
  closed: { label: "Ditutup", style: "bg-surface-variant text-foreground" },
};

function MyReportsPage() {
  const { userId, loading: accountLoading } = useAccount();
  const listReports = useServerFn(listMyReportsFn);
  const {
    data: reports,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["my-issue-reports", userId],
    queryFn: () => listReports(),
    enabled: !!userId,
  });

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-variant px-4 py-2 text-sm font-medium transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> Kembali
          </Link>
          <Link
            to="/report"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus aria-hidden="true" className="size-4" /> Buat laporan
          </Link>
        </div>

        <header className="mb-6 mt-7">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-container px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-on-primary-container">
            <Bug aria-hidden="true" className="size-3.5" /> Dukungan
          </span>
          <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">Laporan saya</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Status dan catatan di sini hanya dapat dilihat oleh akunmu.
          </p>
        </header>

        {accountLoading ? (
          <p role="status" className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">
            Memeriksa sesi akun…
          </p>
        ) : !userId ? (
          <SignInPrompt />
        ) : isLoading ? (
          <p role="status" className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">
            Memuat tiket…
          </p>
        ) : error ? (
          <p role="alert" className="rounded-2xl bg-destructive/10 p-5 text-sm text-destructive">
            Gagal memuat laporan. Silakan coba lagi.
          </p>
        ) : !reports?.length ? (
          <div className="m3-shadow-1 flex flex-col items-center rounded-3xl bg-card p-8 text-center sm:p-10">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-surface-variant text-muted-foreground">
              <Bug aria-hidden="true" className="size-6" />
            </span>
            <h2 className="mt-4 font-display text-xl">Belum ada laporan</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Tiket yang kamu kirim akan muncul di sini beserta status dan catatan tim.
            </p>
            <Link
              to="/report"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Kirim laporan pertama <Plus aria-hidden="true" className="size-4" />
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {reports.map((report) => {
              const status = STATUS[report.status] ?? STATUS.open;
              return (
                <li key={report.id} className="m3-shadow-1 rounded-3xl bg-card p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Tiket {report.id.slice(0, 8).toUpperCase()}
                      </p>
                      <h2 className="mt-1 break-words font-display text-xl">{report.subject}</h2>
                    </div>
                    <span
                      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.style}`}
                    >
                      <Clock3 aria-hidden="true" className="size-3.5" /> {status.label}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                    {report.message}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{report.email}</span>
                    <span>Dikirim {new Date(report.created_at).toLocaleString("id-ID")}</span>
                    {report.updated_at !== report.created_at && (
                      <span>Diperbarui {new Date(report.updated_at).toLocaleString("id-ID")}</span>
                    )}
                  </div>
                  {report.attachments?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2" aria-label="Lampiran laporan">
                      {report.attachments.map(
                        (file: { path: string; name: string }, index: number) => (
                          <span
                            key={`${file.path}-${index}`}
                            className="rounded-xl bg-surface-variant px-3 py-2 text-xs text-muted-foreground"
                          >
                            {file.name}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                  {report.admin_note && (
                    <section
                      className="mt-5 rounded-2xl border border-primary/15 bg-primary-container/35 p-4"
                      aria-label="Catatan dari tim"
                    >
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-on-primary-container">
                        <MessageSquareText aria-hidden="true" className="size-4" /> Catatan dari tim
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                        {report.admin_note}
                      </p>
                    </section>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}

function SignInPrompt() {
  return (
    <section className="m3-shadow-1 rounded-3xl bg-card p-6">
      <h2 className="font-display text-xl">Masuk untuk melihat tiket</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Laporan hanya dapat dilihat oleh akun yang mengirimkannya.
      </p>
      <Link
        to="/login"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
      >
        Masuk atau daftar
      </Link>
    </section>
  );
}
