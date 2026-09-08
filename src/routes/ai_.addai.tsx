import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { NewBadge } from "@/components/NewBadge";
import {
  allModels,
  deleteModel,
  loadCustomModels,
  restoreBuiltins,
  saveCustomModels,
  updateModel,
  type AiModel,
} from "@/lib/ai-models";

export const Route = createFileRoute("/ai_/addai")({
  head: () => ({
    meta: [
      { title: "Tambah & Kelola AI — Galileo Mod APK" },
      {
        name: "description",
        content:
          "Buat, edit, atau hapus AI sendiri: atur nama, logo, dan gaya prompting, lalu pakai langsung di kotak chat GetrixAI.",
      },
      { property: "og:title", content: "Tambah & Kelola AI — Galileo Mod APK" },
      {
        property: "og:description",
        content: "Bikin, ubah, dan hapus model AI dengan nama, logo, dan prompt kamu sendiri.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AddAiPage,
});

function slugId(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `custom-${base || "ai"}-${Math.random().toString(36).slice(2, 6)}`;
}

const inputClass =
  "w-full rounded-2xl bg-background px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary";

function AddAiPage() {
  const [list, setList] = useState<AiModel[]>([]);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [tagline, setTagline] = useState("");
  const [persona, setPersona] = useState("");
  const [markNew, setMarkNew] = useState(true);
  const [realModel, setRealModel] = useState(false);
  const [modelType, setModelType] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);


  const refresh = () => setList(allModels());
  useEffect(refresh, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setLogo("");
    setTagline("");
    setPersona("");
    setMarkNew(true);
    setRealModel(false);
    setModelType("");
  }

  function startEdit(m: AiModel) {
    setEditingId(m.id);
    setName(m.name);
    setLogo(m.logo ?? "");
    setTagline(m.tagline ?? "");
    setPersona(m.persona ?? "");
    setMarkNew(Boolean(m.isNew));
    setRealModel(Boolean(m.realModel));
    setModelType(m.modelType ?? "");
    setError(null);
    setSaved(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit() {
    setError(null);
    setSaved(null);
    if (name.trim().length < 2) {
      setError("Nama AI minimal 2 karakter.");
      return;
    }
    if (realModel) {
      if (!/^[\w.-]+\/[\w.:-]+$/.test(modelType.trim())) {
        setError("Model type harus seperti: nvidia/nemotron-3.5-lightning:free");
        return;
      }
    } else if (persona.trim().length < 10) {
      setError("Prompting AI minimal 10 karakter supaya gayanya jelas.");
      return;
    }
    const patch = {
      name: name.trim().slice(0, 40),
      tagline: tagline.trim().slice(0, 120) || "AI kustom buatan kamu.",
      persona: realModel ? "" : persona.trim().slice(0, 4000),
      logo: logo.trim() || undefined,
      isNew: markNew,
      realModel,
      modelType: realModel ? modelType.trim().slice(0, 120) : undefined,
    };

    if (editingId) {
      updateModel(editingId, patch);
      setSaved("Perubahan disimpan.");
    } else {
      saveCustomModels([
        ...loadCustomModels(),
        { id: slugId(name), ...patch, custom: true } as AiModel,
      ]);
      setSaved("AI berhasil ditambahkan.");
    }
    resetForm();
    refresh();
  }


  function remove(m: AiModel) {
    deleteModel(m.id);
    if (editingId === m.id) resetForm();
    setSaved(`${m.name} dihapus.`);
    refresh();
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur">
        <Link
          to="/ai"
          className="inline-flex size-9 items-center justify-center rounded-full transition hover:bg-accent"
          aria-label="Kembali ke AI"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg">Tambah & Kelola AI</h1>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-8 px-4 pt-6">
        <p className="text-sm text-muted-foreground">
          Bikin AI kamu sendiri, atau ubah dan hapus AI yang sudah ada. Semua perubahan langsung
          terlihat di kotak pilihan model pada halaman chat.
        </p>

        <section className="space-y-4 rounded-3xl border border-border/60 bg-surface-variant/40 p-4 md:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base">
              {editingId ? "Edit AI" : "Tambah AI baru"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-accent"
              >
                <X className="size-3.5" /> Batal edit
              </button>
            )}
          </div>

          <Field label="Nama AI">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Getrix Titan"
              className={inputClass}
            />
          </Field>

          <Field label="Logo AI (URL gambar)">
            <input
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </Field>

          <Field label="Deskripsi singkat">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Contoh: Fokus pada analisis panjang dan detail."
              className={inputClass}
            />
          </Field>

          <Field label="Prompting AI (gaya & aturan menjawab)">
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              rows={5}
              placeholder="Contoh: Jawab formal, selalu beri contoh nyata, dan akhiri dengan ringkasan tiga poin."
              className={`${inputClass} resize-y`}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={markNew}
              onChange={(e) => setMarkNew(e.target.checked)}
              className="size-4 accent-primary"
            />
            Tandai sebagai model baru
            <NewBadge />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && (
            <p className="inline-flex items-center gap-1.5 text-sm text-primary">
              <Check className="size-4" /> {saved}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            {editingId ? (
              <>
                <Check className="size-4" /> Simpan perubahan
              </>
            ) : (
              <>
                <Plus className="size-4" /> Tambah AI
              </>
            )}
          </button>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base">Semua AI</h2>
            <button
              type="button"
              onClick={() => {
                restoreBuiltins();
                resetForm();
                setSaved("Model bawaan dipulihkan.");
                refresh();
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-accent"
            >
              <RotateCcw className="size-3.5" /> Pulihkan bawaan
            </button>
          </div>

          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada AI.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 p-3"
                >
                  {m.logo ? (
                    <img src={m.logo} alt="" className="size-9 rounded-full object-cover" />
                  ) : (
                    <span className="size-9 rounded-full bg-primary/15" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {m.name}
                      {m.isNew && <NewBadge />}
                      {!m.custom && (
                        <span className="rounded-full bg-surface-variant px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          bawaan
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.tagline}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    aria-label={`Edit ${m.name}`}
                    className="rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    aria-label={`Hapus ${m.name}`}
                    className="rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
