import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Upload, Link as LinkIcon, Trash2, Send, Bell } from "lucide-react";
import {
  createBroadcastFn,
  deleteBroadcastFn,
  listBroadcastsFn,
  type Broadcast,
} from "@/lib/broadcasts.functions";
import { AppHeader } from "@/components/AppHeader";
import { PressButton } from "@/components/Pressable";

const broadcastsQuery = queryOptions({
  queryKey: ["broadcasts"],
  queryFn: () => listBroadcastsFn(),
});

export const Route = createFileRoute("/broadcast")({
  head: () => ({
    meta: [
      { title: "Broadcast — Galileo Mod APK" },
      {
        name: "description",
        content: "Kirim notifikasi global ke semua pengguna Galileo Mod APK.",
      },
      { property: "og:title", content: "Broadcast — Galileo Mod APK" },
      {
        property: "og:description",
        content: "Kirim notifikasi global ke semua pengguna.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(broadcastsQuery),
  component: BroadcastPage,
});

type ImgMode = "upload" | "url" | "none";

function BroadcastPage() {
  const create = useServerFn(createBroadcastFn);
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<ImgMode>("upload");
  const [imgUrl, setImgUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function onFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  }

  async function fileToBase64(f: File): Promise<string> {
    const buf = await f.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (!title.trim()) return setError("Judul wajib diisi.");
    setSubmitting(true);
    try {
      let image_data_base64: string | null = null;
      let image_content_type: string | null = null;
      if (mode === "upload") {
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            setSubmitting(false);
            return setError("Ukuran gambar maksimal 5MB.");
          }
          image_data_base64 = await fileToBase64(file);
          image_content_type = file.type || "application/octet-stream";
        }
      }
      await create({
        data: {
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || null,
          image_kind: file || (mode === "url" && imgUrl.trim()) ? mode : "none",
          image_url: mode === "url" ? imgUrl.trim() || null : null,
          image_data_base64,
          image_content_type,
        },
      });
      setOk("Notifikasi terkirim ke semua pengguna aktif.");
      setTitle("");
      setBody("");
      setUrl("");
      setImgUrl("");
      onFile(null);
      await qc.invalidateQueries({ queryKey: ["broadcasts"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 pt-6 md:px-8">
        <Link
          to="/"
          aria-label="Kembali"
          className="inline-flex size-10 items-center justify-center rounded-full bg-surface-variant transition-colors hover:bg-primary-container"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <span className="text-sm text-muted-foreground">Kembali</span>
      </div>

      <main className="mx-auto max-w-2xl px-5 pb-24 pt-4 md:px-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
            <Bell className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-4xl leading-tight md:text-5xl">Broadcast</h1>
            <p className="text-sm text-muted-foreground">
              Kirim notifikasi push ke semua pengguna yang aktif membuka web.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <Card>
            <Label>Judul notifikasi</Label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Aplikasi baru tersedia!"
              className="input"
              maxLength={120}
              required
            />
          </Card>

          <Card>
            <Label>Deskripsi</Label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Isi pesan notifikasi..."
              rows={4}
              maxLength={2000}
              className="input resize-none"
            />
          </Card>

          <Card>
            <Label>Link tujuan (opsional)</Label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              type="url"
              className="input"
            />
          </Card>

          <Card>
            <Label>Gambar notifikasi</Label>
            <div className="mt-2 inline-flex rounded-full bg-surface-variant p-1">
              <TabBtn active={mode === "upload"} onClick={() => setMode("upload")} icon={<Upload className="size-4" />} label="Upload" />
              <TabBtn active={mode === "url"} onClick={() => setMode("url")} icon={<LinkIcon className="size-4" />} label="URL" />
              <TabBtn active={mode === "none"} onClick={() => setMode("none")} label="Tanpa gambar" />
            </div>

            {mode === "upload" && (
              <div className="mt-4 flex items-center gap-4">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-surface-variant">
                  {preview ? (
                    <img src={preview} alt="preview" className="size-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Preview</span>
                  )}
                </div>
                <label className="cursor-pointer rounded-full bg-secondary-container px-4 py-2 text-sm font-medium text-on-secondary-container hover:bg-secondary hover:text-secondary-foreground">
                  Pilih file
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            )}

            {mode === "url" && (
              <input
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
                placeholder="https://.../image.png"
                type="url"
                className="input mt-4"
              />
            )}
          </Card>

          {error && (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {ok && (
            <div className="rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary">
              {ok}
            </div>
          )}

          <PressButton
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? <m3e-loading-indicator variant="contained" className="m3-loading-sm" aria-label="Mengirim" /> : <Send className="size-5" />}
            {submitting ? "Mengirim..." : "Kirim notifikasi"}
          </PressButton>
        </form>

        <HistorySection />
      </main>

      <style>{`
        .input {
          margin-top: 0.5rem;
          width: 100%;
          border-radius: 1rem;
          background: var(--color-surface-variant);
          padding: 0.9rem 1rem;
          font-size: 1rem;
          color: var(--color-foreground);
          outline: none;
          border: 2px solid transparent;
          transition: border-color .15s ease, background-color .15s ease;
        }
        .input:focus {
          border-color: var(--color-primary);
          background: var(--color-surface);
        }
      `}</style>
    </div>
  );
}

function HistorySection() {
  const { data } = useSuspenseQuery(broadcastsQuery);
  const del = useServerFn(deleteBroadcastFn);
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onDelete(b: Broadcast) {
    if (!confirm(`Hapus broadcast "${b.title}"?`)) return;
    setDeletingId(b.id);
    try {
      await del({ data: { id: b.id } });
      await qc.invalidateQueries({ queryKey: ["broadcasts"] });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl">Riwayat broadcast</h2>
      {data.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-surface-variant p-5 text-sm text-muted-foreground">
          Belum ada notifikasi terkirim.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.map((b) => (
            <li key={b.id} className="m3-shadow-1 flex gap-3 rounded-2xl bg-card p-3">
              {b.image_url ? (
                <img src={b.image_url} alt="" className="size-16 shrink-0 rounded-xl bg-surface-variant object-cover" />
              ) : (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-tertiary-container">
                  <Bell className="size-6 text-on-tertiary-container" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{b.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{b.body}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {new Date(b.created_at).toLocaleString("id-ID")}
                </p>
              </div>
              <button
                onClick={() => onDelete(b)}
                disabled={deletingId === b.id}
                aria-label="Hapus"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
              >
                {deletingId === b.id ? <m3e-loading-indicator className="m3-loading-sm" aria-label="Menghapus" /> : <Trash2 className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="m3-shadow-1 rounded-3xl bg-card p-5 md:p-6">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block font-display text-lg leading-tight">{children}</label>;
}
function TabBtn({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon?: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-surface"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
