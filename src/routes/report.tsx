import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Bug, CheckCircle2, FileText, Paperclip, Send, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { PressButton } from "@/components/Pressable";
import { supabase } from "@/integrations/supabase/client";
import { authSupabase } from "@/integrations/auth-supabase/client";
import { useAccount } from "@/lib/use-account";
import { abandonReportFn, createReportUploadsFn, submitReportFn } from "@/lib/reports.functions";

const BUCKET = "issue-report-files";
const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
]);

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Laporan Tiket Masalah · Galileo Mod APK" },
      {
        name: "description",
        content: "Kirim laporan masalah kepada tim Galileo Mod APK.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReportPage,
});

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ReportPage() {
  const { userId, loading: accountLoading } = useAccount();
  const createUploads = useServerFn(createReportUploadsFn);
  const submitReport = useServerFn(submitReportFn);
  const abandonReport = useServerFn(abandonReportFn);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalBytes = files.reduce((total, file) => total + file.size, 0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    authSupabase.auth.getUser().then(({ data }) => {
      if (active && data.user?.email) setEmail((current) => current || data.user.email || "");
    });
    return () => {
      active = false;
    };
  }, [userId]);

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    setError(null);
    const next = [...files];
    for (const file of Array.from(selected)) {
      if (next.length >= MAX_FILES) {
        setError(`Maksimal ${MAX_FILES} berkas per laporan.`);
        break;
      }
      if (!ACCEPTED_TYPES.has(file.type)) {
        setError(`${file.name}: format tidak didukung. Gunakan JPG, PNG, WebP, PDF, atau TXT.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name}: ukuran maksimal per berkas adalah 10 MB.`);
        continue;
      }
      if (next.reduce((sum, item) => sum + item.size, file.size) > MAX_TOTAL_BYTES) {
        setError("Total ukuran lampiran maksimal 25 MB.");
        continue;
      }
      if (
        !next.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified,
        )
      ) {
        next.push(file);
      }
    }
    setFiles(next);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    let ticketId: string | null = null;

    try {
      const ticket = await createUploads({
        data: {
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          website,
          files: files.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        },
      });
      ticketId = ticket.id;
      if (ticket.accepted) {
        setDone(true);
        return;
      }

      const results = await Promise.all(
        ticket.uploads.map((upload, index) =>
          supabase.storage.from(BUCKET).uploadToSignedUrl(upload.path, upload.token, files[index], {
            contentType: files[index].type,
            upsert: false,
          }),
        ),
      );
      const failedUpload = results.find((result) => result.error)?.error;
      if (failedUpload) throw new Error(failedUpload.message);

      await submitReport({ data: { id: ticket.id } });
      ticketId = null;
      setDone(true);
      setEmail("");
      setSubject("");
      setMessage("");
      setFiles([]);
    } catch (submitError) {
      if (ticketId) {
        try {
          await abandonReport({ data: { id: ticketId } });
        } catch {
          // Preserve the original submission error.
        }
      }
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Laporan gagal dikirim. Silakan coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-variant px-4 py-2 text-sm font-medium transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Kembali
        </Link>

        <header className="mb-6 mt-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-container px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-on-primary-container">
            <Bug aria-hidden="true" className="size-3.5" /> Dukungan
          </span>
          <h1 className="mt-4 font-display text-3xl leading-tight md:text-4xl">
            Laporan Tiket Masalah
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Jelaskan kendala yang kamu temui. Email digunakan agar tim dapat menghubungi kamu
            terkait laporan ini.
          </p>
        </header>

        {accountLoading ? (
          <p role="status" className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">
            Memeriksa sesi akun…
          </p>
        ) : !userId ? (
          <section className="m3-shadow-1 rounded-3xl bg-card p-6">
            <h2 className="font-display text-xl">Masuk untuk mengirim laporan</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Laporan dan statusnya ditautkan ke akunmu agar hanya kamu yang dapat melihat
              perkembangannya.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Masuk atau daftar
            </Link>
          </section>
        ) : (
          <>
            {done && (
              <div
                role="status"
                className="mb-5 flex items-start gap-3 rounded-2xl bg-primary-container px-4 py-3 text-sm text-on-primary-container"
              >
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <span>
                  Laporan berhasil dikirim. Terima kasih sudah membantu kami memperbaiki layanan.
                  <Link to="/my-report" className="ml-1 font-semibold underline underline-offset-4">
                    Lihat tiket saya
                  </Link>
                </span>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="m3-shadow-1 space-y-5 rounded-3xl bg-card p-5 sm:p-6">
                <div>
                  <label
                    htmlFor="report-email"
                    className="block font-display text-lg leading-tight"
                  >
                    Email pelapor
                  </label>
                  <input
                    id="report-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nama@email.com"
                    className="input mt-2"
                    maxLength={254}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="report-subject"
                    className="block font-display text-lg leading-tight"
                  >
                    Judul atau subjek
                  </label>
                  <input
                    id="report-subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Contoh: Tautan unduhan tidak bisa dibuka"
                    className="input mt-2"
                    maxLength={150}
                    minLength={3}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="report-message"
                    className="block font-display text-lg leading-tight"
                  >
                    Isi laporan
                  </label>
                  <textarea
                    id="report-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ceritakan langkah yang kamu lakukan dan apa yang terjadi…"
                    className="input mt-2 min-h-36 resize-y"
                    maxLength={5000}
                    minLength={10}
                    required
                  />
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    {message.length}/5000
                  </p>
                </div>

                <div>
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <label
                        htmlFor="report-files"
                        className="block font-display text-lg leading-tight"
                      >
                        Lampiran (opsional)
                      </label>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Maksimal 10 berkas, 10 MB per berkas, 25 MB total. JPG, PNG, WebP, PDF, atau
                        TXT.
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {files.length}/{MAX_FILES} · {formatBytes(totalBytes)}
                    </span>
                  </div>
                  <label
                    htmlFor="report-files"
                    className="mt-3 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-outline bg-surface-variant/40 px-4 py-3 text-sm font-medium transition-colors hover:bg-primary-container focus-within:ring-2 focus-within:ring-ring"
                  >
                    <Paperclip aria-hidden="true" className="size-4" />
                    Pilih berkas untuk dilampirkan
                  </label>
                  <input
                    id="report-files"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
                    className="sr-only"
                    onChange={(event) => {
                      addFiles(event.currentTarget.files);
                      event.currentTarget.value = "";
                    }}
                  />
                  {files.length > 0 && (
                    <ul className="mt-3 space-y-2" aria-label="Daftar lampiran">
                      {files.map((file, index) => (
                        <li
                          key={`${file.name}-${file.lastModified}-${index}`}
                          className="flex items-center gap-3 rounded-xl bg-surface-variant/50 px-3 py-2.5"
                        >
                          <FileText aria-hidden="true" className="size-4 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatBytes(file.size)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setFiles((current) => current.filter((_, i) => i !== index))
                            }
                            aria-label={`Hapus lampiran ${file.name}`}
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div
                  aria-hidden="true"
                  className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
                >
                  <label htmlFor="report-website">Website</label>
                  <input
                    id="report-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                Lampiran hanya dibagikan kepada tim untuk menangani laporan. Jangan sertakan kata
                sandi, data pembayaran, atau informasi pribadi sensitif.
              </p>

              <PressButton
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <m3e-loading-indicator
                    variant="contained"
                    className="m3-loading-sm"
                    aria-label="Mengirim laporan"
                  />
                ) : (
                  <Send aria-hidden="true" className="size-5" />
                )}
                {submitting ? "Mengirim laporan…" : "Kirim laporan"}
              </PressButton>
            </form>
          </>
        )}
      </main>
    </>
  );
}
