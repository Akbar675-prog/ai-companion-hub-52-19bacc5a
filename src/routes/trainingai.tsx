import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BrainCircuit, Info, Lock, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { PressButton } from "@/components/Pressable";
import { useAccount } from "@/lib/use-account";
import {
  listInstructionsFn,
  addInstructionFn,
  updateInstructionFn,
  deleteInstructionFn,
  type AiInstruction,
} from "@/lib/ai-training.functions";
import {
  listFactsFn,
  addFactFn,
  updateFactFn,
  deleteFactFn,
  type AiFact,
} from "@/lib/ai-facts.functions";

const FACT_PRESETS = [
  "Pembuat / pemilik AI",
  "Presiden Indonesia saat ini",
  "Nomor WhatsApp pembuat",
  "Instagram pembuat",
  "Telegram pembuat",
];

function FactsSection() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");

  const { data: facts, isLoading } = useQuery({
    queryKey: ["ai-facts"],
    queryFn: () => listFactsFn(),
  });

  async function guard(fn: () => Promise<AiFact[]>) {
    setBusy(true);
    setError(null);
    try {
      qc.setQueryData(["ai-facts"], await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 font-display text-2xl">
        <Info className="size-5" /> Info resmi
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Fakta pasti yang wajib dipakai GetrixAI, misal siapa pembuat AI-nya, presiden Indonesia
        sekarang, sampai nomor & akun media sosial pembuat.
      </p>

      <div className="mt-4 rounded-3xl bg-surface-variant p-4">
        <div className="flex flex-wrap gap-2">
          {FACT_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setLabel(p)}
              className="rounded-full bg-background px-3 py-1.5 text-xs transition hover:bg-primary-container"
            >
              {p}
            </button>
          ))}
        </div>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nama info (mis. Presiden Indonesia saat ini)"
          className="mt-3 w-full rounded-2xl bg-background p-3 text-sm outline-none ring-primary/40 focus:ring-2"
        />
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          placeholder="Isi info (mis. Prabowo Subianto)"
          className="mt-2 w-full resize-y rounded-2xl bg-background p-3 text-sm outline-none ring-primary/40 focus:ring-2"
        />
        <div className="mt-3 flex justify-end">
          <PressButton
            type="button"
            disabled={busy || label.trim().length < 2 || value.trim().length < 1}
            onClick={() =>
              void guard(async () => {
                const next = await addFactFn({ data: { label, value } });
                setLabel("");
                setValue("");
                return next;
              })
            }
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? <m3e-loading-indicator variant="contained" className="m3-loading-sm" aria-label="Menyimpan" /> : <Plus className="size-4" />}
            Tambah info
          </PressButton>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <m3e-loading-indicator className="m3-loading-md" aria-label="Memuat" />}
        {facts?.length === 0 && <p className="text-sm text-muted-foreground">Belum ada info.</p>}
        {(facts ?? []).map((f) => (
          <div key={f.id} className="rounded-3xl border border-border/70 bg-card p-4">
            {editing === f.id ? (
              <>
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full rounded-2xl bg-surface-variant p-3 text-sm outline-none"
                />
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-y rounded-2xl bg-surface-variant p-3 text-sm outline-none"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm hover:bg-surface-variant"
                  >
                    <X className="size-4" /> Batal
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void guard(async () => {
                        const next = await updateFactFn({
                          data: { id: f.id, label: editLabel, value: editValue },
                        });
                        setEditing(null);
                        return next;
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                  >
                    <Save className="size-4" /> Simpan
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{f.value}</p>
                <div className="mt-2 flex justify-end gap-1 text-muted-foreground">
                  <button
                    type="button"
                    aria-label="Ubah info"
                    onClick={() => {
                      setEditing(f.id);
                      setEditLabel(f.label);
                      setEditValue(f.value);
                    }}
                    className="rounded-full p-2 hover:bg-surface-variant hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Hapus info"
                    disabled={busy}
                    onClick={() => void guard(() => deleteFactFn({ data: { id: f.id } }))}
                    className="rounded-full p-2 hover:bg-surface-variant hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/trainingai")({
  head: () => ({
    meta: [
      { title: "Training AI — Galileo Mod APK" },
      {
        name: "description",
        content:
          "Beri instruksi khusus untuk GetrixAI agar menjawab pertanyaan pengguna sesuai panduan resmi.",
      },
      { property: "og:title", content: "Training AI — Galileo Mod APK" },
      {
        property: "og:description",
        content: "Kelola instruksi khusus yang dipakai GetrixAI saat menjawab pengguna.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrainingAi,
});

function TrainingAi() {
  const { profile, loading } = useAccount();
  const isAdmin = !!profile?.is_admin;
  const qc = useQueryClient();

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const { data: list, isLoading } = useQuery({
    queryKey: ["ai-instructions"],
    queryFn: () => listInstructionsFn(),
    enabled: isAdmin,
  });

  function setList(next: AiInstruction[]) {
    qc.setQueryData(["ai-instructions"], next);
  }

  async function guard(fn: () => Promise<AiInstruction[]>) {
    setBusy(true);
    setError(null);
    try {
      setList(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex justify-center py-24">
          <m3e-loading-indicator className="m3-loading-md" aria-label="Memuat" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto mt-16 w-full max-w-md px-4 text-center">
          <Lock className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-3 font-display text-2xl">Halaman khusus admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hanya admin yang bisa memberi instruksi ke GetrixAI.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto mt-6 w-full max-w-3xl px-4 pb-16">
        <h1 className="flex items-center gap-2 font-display text-3xl">
          <BrainCircuit className="size-6" /> Training AI
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tulis instruksi khusus di sini. GetrixAI akan membaca semua instruksi ini setiap kali
          menjawab pengguna, lalu mengikutinya bila relevan.
        </p>

        <div className="mt-6 rounded-3xl bg-surface-variant p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder='Contoh: Jika pengguna bertanya cara memperbarui aplikasi Ultra Motion, arahkan ke https://ultramotionofficial.com lalu jelaskan langkah unduhnya.'
            className="w-full resize-y rounded-2xl bg-background p-3 text-sm outline-none ring-primary/40 focus:ring-2"
          />
          <div className="mt-3 flex justify-end">
            <PressButton
              type="button"
              disabled={busy || text.trim().length < 5}
              onClick={() =>
                void guard(async () => {
                  const next = await addInstructionFn({ data: { text } });
                  setText("");
                  return next;
                })
              }
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {busy ? <m3e-loading-indicator variant="contained" className="m3-loading-sm" aria-label="Menyimpan" /> : <Plus className="size-4" />}
              Tambah instruksi
            </PressButton>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>

        <div className="mt-6 space-y-3">
          {isLoading && <m3e-loading-indicator className="m3-loading-md" aria-label="Memuat" />}
          {list?.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada instruksi.</p>
          )}
          {(list ?? []).map((item) => (
            <div key={item.id} className="rounded-3xl border border-border/70 bg-card p-4">
              {editing === item.id ? (
                <>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    className="w-full resize-y rounded-2xl bg-surface-variant p-3 text-sm outline-none"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm hover:bg-surface-variant"
                    >
                      <X className="size-4" /> Batal
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void guard(async () => {
                          const next = await updateInstructionFn({
                            data: { id: item.id, text: editText },
                          });
                          setEditing(null);
                          return next;
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                    >
                      <Save className="size-4" /> Simpan
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.text}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("id-ID")}
                    </span>
                    <span className="flex gap-1 text-muted-foreground">
                      <button
                        type="button"
                        aria-label="Ubah instruksi"
                        onClick={() => {
                          setEditing(item.id);
                          setEditText(item.text);
                        }}
                        className="rounded-full p-2 hover:bg-surface-variant hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Hapus instruksi"
                        disabled={busy}
                        onClick={() =>
                          void guard(() => deleteInstructionFn({ data: { id: item.id } }))
                        }
                        className="rounded-full p-2 hover:bg-surface-variant hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <FactsSection />
      </main>
    </div>
  );
}
