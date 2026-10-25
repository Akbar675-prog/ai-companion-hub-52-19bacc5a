import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquareText,
  Save,
  ShieldCheck,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useAccount } from "@/lib/use-account";
import { listReportTicketsFn, updateReportTicketFn } from "@/lib/reports.functions";

export const Route = createFileRoute("/check/report")({
  head: () => ({
    meta: [
      { title: "Kelola Laporan · Galileo Mod APK" },
      { name: "description", content: "Periksa dan perbarui tiket laporan masalah." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckReportsPage,
});

const STATUS: Record<string, string> = {
  open: "Diterima",
  in_progress: "Dalam pengerjaan",
  resolved: "Diselesaikan",
  closed: "Ditutup",
};

type ReportStatus = "open" | "in_progress" | "resolved";
type ReportTicket = {
  id: string;
  user_id: string;
  email: string;
  subject: string;
  message: string;
  attachments: Array<{ path: string; name: string; download_url?: string | null }>;
  status: string;
  admin_note: string;
  created_at: string;
  updated_at: string;
};

function CheckReportsPage() {
  const { userId, loading: accountLoading } = useAccount();
  const listTickets = useServerFn(listReportTicketsFn);
  const {
    data: tickets,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["report-tickets"],
    queryFn: () => listTickets(),
    enabled: !!userId,
  });

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-variant px-4 py-2 text-sm font-medium transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Kembali
        </Link>
        <header className="mb-6 mt-7">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-container px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-on-primary-container">
            <ShieldCheck aria-hidden="true" className="size-3.5" /> Panel petugas
          </span>
          <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">Kelola laporan</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Periksa laporan, lampiran, dan kirim status serta catatan yang dapat dilihat pelapor.
          </p>
        </header>

        {accountLoading ? (
          <p role="status" className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">
            Memeriksa sesi akun…
          </p>
        ) : !userId ? (
          <section className="m3-shadow-1 rounded-3xl bg-card p-6">
            <h2 className="font-display text-xl">Masuk untuk melanjutkan</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Halaman ini hanya dapat dibuka oleh petugas yang berwenang.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
            >
              Masuk
            </Link>
          </section>
        ) : isLoading ? (
          <p role="status" className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">
            Memuat laporan…
          </p>
        ) : error ? (
          <p role="alert" className="rounded-2xl bg-destructive/10 p-5 text-sm text-destructive">
            Gagal memuat laporan. Pastikan akunmu memiliki akses petugas, lalu coba lagi.
          </p>
        ) : !tickets?.length ? (
          <div className="m3-shadow-1 rounded-3xl bg-card p-8 text-center">
            <CheckCircle2 aria-hidden="true" className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 font-display text-xl">Belum ada laporan</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tiket baru akan muncul di sini.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {tickets.map((ticket: ReportTicket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function TicketCard({ ticket }: { ticket: ReportTicket }) {
  const queryClient = useQueryClient();
  const updateTicket = useServerFn(updateReportTicketFn);
  const [status, setStatus] = useState<ReportStatus>(
    ticket.status === "in_progress" || ticket.status === "resolved" ? ticket.status : "open",
  );
  const [note, setNote] = useState(ticket.admin_note ?? "");
  const mutation = useMutation({
    mutationFn: () => updateTicket({ data: { id: ticket.id, status, admin_note: note } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["report-tickets"] }),
  });

  return (
    <li className="m3-shadow-1 rounded-3xl bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            Tiket {ticket.id.slice(0, 8).toUpperCase()} ·{" "}
            {new Date(ticket.created_at).toLocaleString("id-ID")}
          </p>
          <h2 className="mt-1 break-words font-display text-xl">{ticket.subject}</h2>
        </div>
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">
          <Clock3 aria-hidden="true" className="size-3.5" />{" "}
          {STATUS[ticket.status] ?? ticket.status}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 rounded-2xl bg-surface-variant/50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Email pelapor</dt>
          <dd className="mt-1 break-all">{ticket.email}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">ID akun</dt>
          <dd className="mt-1 break-all font-mono text-xs">{ticket.user_id}</dd>
        </div>
      </dl>
      <section className="mt-4">
        <h3 className="text-sm font-semibold">Isi laporan</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
          {ticket.message}
        </p>
      </section>

      {ticket.attachments?.length > 0 && (
        <section className="mt-4" aria-label="Lampiran laporan">
          <h3 className="text-sm font-semibold">Lampiran</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {ticket.attachments.map(
              (
                file: { path: string; name: string; download_url?: string | null },
                index: number,
              ) => (
                <li key={`${file.path}-${index}`}>
                  {file.download_url ? (
                    <a
                      href={file.download_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-surface-variant px-3 py-2 text-xs font-medium transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <FileText aria-hidden="true" className="size-4" /> {file.name}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-surface-variant px-3 py-2 text-xs text-muted-foreground">
                      <FileText aria-hidden="true" className="size-4" /> {file.name} (tautan tidak
                      tersedia)
                    </span>
                  )}
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      <div className="mt-5 grid gap-4 border-t border-border/70 pt-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`status-${ticket.id}`} className="block text-sm font-semibold">
            Status tiket
          </label>
          <select
            id={`status-${ticket.id}`}
            value={status}
            onChange={(event) => setStatus(event.target.value as ReportStatus)}
            className="input mt-2 min-h-11"
          >
            <option value="open">Diterima</option>
            <option value="in_progress">Dalam pengerjaan</option>
            <option value="resolved">Diselesaikan</option>
          </select>
        </div>
        <div>
          <label
            htmlFor={`note-${ticket.id}`}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <MessageSquareText aria-hidden="true" className="size-4" /> Catatan untuk pelapor
          </label>
          <textarea
            id={`note-${ticket.id}`}
            value={note}
            maxLength={5000}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Tulis pembaruan yang akan terlihat oleh pelapor…"
            className="input mt-2 min-h-24 resize-y"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{note.length}/5000</p>
        </div>
      </div>
      {mutation.error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          Gagal menyimpan perubahan. Silakan coba lagi.
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="mt-3 text-sm text-primary">
          Perubahan berhasil disimpan.
        </p>
      )}
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Save aria-hidden="true" className="size-4" />{" "}
        {mutation.isPending ? "Menyimpan…" : "Simpan perubahan"}
      </button>
    </li>
  );
}
