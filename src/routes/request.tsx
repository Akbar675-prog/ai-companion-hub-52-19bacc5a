import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { createRequestFn } from "@/lib/requests.functions";
import { AppHeader } from "@/components/AppHeader";
import { PressButton } from "@/components/Pressable";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "Request APK · Galileo Mod APK" },
      {
        name: "description",
        content:
          "Minta APK yang belum tersedia di katalog. Kirim nama aplikasi, versi, dan catatan.",
      },
      { property: "og:title", content: "Request APK · Galileo Mod APK" },
      {
        property: "og:description",
        content:
          "Minta APK yang belum tersedia di katalog. Kirim nama aplikasi, versi, dan catatan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestPage,
});

function RequestPage() {
  const createRequest = useServerFn(createRequestFn);
  const [appName, setAppName] = useState("");
  const [version, setVersion] = useState("");
  const [note, setNote] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!appName.trim()) {
      setError("Nama aplikasi wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      await createRequest({
        data: {
          app_name: appName.trim(),
          version: version.trim() || null,
          note: note.trim(),
          contact: contact.trim(),
        },
      });
      setDone(true);
      setAppName("");
      setVersion("");
      setNote("");
      setContact("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-variant px-3 py-2 text-sm font-medium hover:bg-primary-container"
          >
            <ArrowLeft className="size-4" /> Kembali
          </Link>
        </div>

        <header className="mb-6">
          <h1 className="font-display text-3xl leading-tight md:text-4xl">
            Request APK
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Belum menemukan aplikasi yang kamu cari? Kirim request di sini.
          </p>
        </header>

        {done && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-primary-container px-4 py-3 text-sm text-on-primary-container">
            <CheckCircle2 className="size-4" /> Request kamu sudah tersimpan.
            Terima kasih!
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="m3-shadow-1 space-y-4 rounded-3xl bg-card p-5 md:p-6">
            <div>
              <label className="block font-display text-lg leading-tight">
                Nama aplikasi
              </label>
              <input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Contoh: Spotify Premium"
                className="input mt-2"
                maxLength={120}
                required
              />
            </div>
            <div>
              <label className="block font-display text-lg leading-tight">
                Versi (opsional)
              </label>
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="Contoh: 8.9.60"
                className="input mt-2"
                maxLength={40}
              />
            </div>
            <div>
              <label className="block font-display text-lg leading-tight">
                Catatan
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Fitur tertentu, arsitektur, atau info tambahan…"
                className="input mt-2 min-h-[110px] resize-y"
                maxLength={2000}
              />
            </div>
            <div>
              <label className="block font-display text-lg leading-tight">
                Kontak (opsional)
              </label>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="WA / Telegram / Email"
                className="input mt-2"
                maxLength={200}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <PressButton
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? (
              <m3e-loading-indicator variant="contained" className="m3-loading-sm" aria-label="Mengirim" />
            ) : (
              <Send className="size-5" />
            )}
            {submitting ? "Mengirim…" : "Kirim request"}
          </PressButton>
        </form>
      </main>
    </>
  );
}
