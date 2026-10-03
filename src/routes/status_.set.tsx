import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { addStatusFn, deleteStatusFn, listStatusFn, type StatusLevel, type StatusService } from "@/lib/status.functions";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/status_/set")({
  head: () => ({
    meta: [
      { title: "Set Status — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SetStatusPage,
});

const SERVICES: { value: StatusService; label: string }[] = [
  { value: "overall", label: "Overall System" },
  { value: "website", label: "Website" },
  { value: "download_api", label: "Download APIs" },
  { value: "password_api", label: "Password APIs" },
  { value: "ddos", label: "DDoS Protection" },
];

const LEVELS: { value: StatusLevel; label: string }[] = [
  { value: "operational", label: "Operational" },
  { value: "degraded", label: "Degraded" },
  { value: "lag", label: "Laggy" },
  { value: "down", label: "Down" },
];

function SetStatusPage() {
  const qc = useQueryClient();
  const add = useServerFn(addStatusFn);
  const del = useServerFn(deleteStatusFn);

  const { data } = useQuery({ queryKey: ["status"], queryFn: () => listStatusFn() });
  const [service, setService] = useState<StatusService>("overall");
  const [level, setLevel] = useState<StatusLevel>("degraded");
  const [message, setMessage] = useState("");

  const addMut = useMutation({
    mutationFn: () => add({ data: { service, level, message: message.trim() } }),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["status"] });
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["status"] }),
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 pt-4 md:px-10">
        <Link to="/status" aria-label="Kembali" className="inline-flex size-10 items-center justify-center rounded-full bg-surface-variant hover:bg-primary-container">
          <ArrowLeft className="size-5" />
        </Link>
        <span className="text-sm text-muted-foreground">Set status</span>
      </div>

      <main className="mx-auto max-w-3xl px-5 pb-32 pt-4 md:px-10">
        <h1 className="font-display text-3xl md:text-4xl">Tambah status</h1>
        <p className="mt-2 text-muted-foreground">Buat entri status untuk layanan tertentu.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!message.trim()) return;
            addMut.mutate();
          }}
          className="m3-shadow-1 mt-6 space-y-4 rounded-3xl bg-card p-5 md:p-6"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Service</span>
              <select
                value={service}
                onChange={(e) => setService(e.target.value as StatusService)}
                className="mt-1 w-full rounded-2xl bg-surface-variant px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                {SERVICES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Level</span>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as StatusLevel)}
                className="mt-1 w-full rounded-2xl bg-surface-variant px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Contoh: API download sedang lambat karena traffic tinggi."
              className="mt-1 w-full rounded-2xl bg-surface-variant px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <button
            type="submit"
            disabled={addMut.isPending || !message.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {addMut.isPending ? <m3e-loading-indicator variant="contained" className="m3-loading-sm" aria-label="Menyimpan" /> : <Plus className="size-4" />}
            Simpan status
          </button>
        </form>

        <h2 className="mt-10 font-display text-2xl">Entri tersimpan</h2>
        {!data || data.entries.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-surface-variant px-4 py-3 text-sm text-muted-foreground">Belum ada entri.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.entries.map((e) => (
              <li key={e.id} className="m3-shadow-1 flex items-center gap-3 rounded-2xl bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {e.service} · {e.level}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{e.message}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString("id-ID")}</p>
                </div>
                <button
                  onClick={() => delMut.mutate(e.id)}
                  disabled={delMut.isPending}
                  className="inline-flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white disabled:opacity-60"
                  aria-label="Hapus"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}