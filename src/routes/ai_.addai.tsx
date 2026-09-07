import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { NewBadge } from "@/components/NewBadge";
import {
  BUILTIN_MODELS,
  loadCustomModels,
  saveCustomModels,
  type AiModel,
} from "@/lib/ai-models";

export const Route = createFileRoute("/ai_/addai")({
  head: () => ({
    meta: [
      { title: "Tambah AI — Galileo Mod APK" },
      {
        name: "description",
        content:
          "Buat AI sendiri: atur nama, logo, dan gaya prompting, lalu pakai langsung di kotak chat GetrixAI.",
      },
      { property: "og:title", content: "Tambah AI — Galileo Mod APK" },
      {
        property: "og:description",
        content: "Bikin model AI kustom dengan nama, logo, dan prompt kamu sendiri.",
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

function AddAiPage() {
  const [custom, setCustom] = useState<AiModel[]>([]);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [tagline, setTagline] = useState("");
  const [persona, setPersona] = useState("");
  const [markNew, setMarkNew] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setCustom(loadCustomModels()), []);

  function persist(list: AiModel[]) {
    setCustom(list);
    saveCustomModels(list);
  }

  function add() {
    setError(null);
    setSaved(false);
    if (name.trim().length < 2) {
      setError("Nama AI minimal 2 karakter.");
      return;
    }
    if (persona.trim().length < 10) {
      setError("Prompting AI minimal 10 karakter supaya gayanya jelas.");
      return;
    }
    const model: AiModel = {
      id: slugId(name),
      name: name.trim().slice(0, 40),
      tagline: tagline.trim().slice(0, 120) || "AI kustom buatan kamu.",
      persona: persona.trim().slice(0, 4000),
      ...(logo.trim() ? { logo: logo.trim() } : {}),
      ...(markNew ? { isNew: true } : {}),
      custom: true,
    };
    persist([...custom, model]);
    setName("");
    setLogo("");
    setTagline("");
    setPersona("");
    setSaved(true);
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
        <h1 className="font-display text-lg">Tambah AI</h1>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-8 px-4 pt-6">
        <p className="text-sm text-muted-foreground">
          Bikin AI kamu sendiri: atur nama, logo, dan cara dia menjawab. Setelah disimpan, AI ini
          langsung muncul di kotak pilihan model pada halaman chat.
        </p>

        <section className="space-y-4 rounded-3xl border border-border/60 bg-surface-variant/40 p-4 md:p-6">
          <Field label="Nama AI">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Getrix Titan"
              className="w-full rounded-2xl bg-background px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary"
            />
          </Field>

          <Field label="Logo AI (URL gambar)">
            <input
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-2xl bg-background px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary"
            />
          </Field>

          <Field label="Deskripsi singkat">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Contoh: Fokus pada analisis panjang dan detail."
              className="w-full rounded-2xl bg-background px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary"
            />
          </Field>

          <Field label="Prompting AI (gaya & aturan menjawab)">
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              rows={5}
              placeholder="Contoh: Jawab formal, selalu beri contoh nyata, dan akhiri dengan ringkasan tiga poin."
              className="w-full resize-y rounded-2xl bg-background px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary"
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
              <Check className="size-4" /> AI berhasil ditambahkan.
            </p>
          )}

          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus className="size-4" /> Tambah AI
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-base">AI buatan kamu</h2>
          {custom.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada AI kustom.</p>
          ) : (
            <ul className="space-y-2">
              {custom.map((m) => (
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
                    </p>
                    <p className="text-xs text-muted-foreground">{m.tagline}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => persist(custom.filter((c) => c.id !== m.id))}
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

        <section className="space-y-3">
          <h2 className="font-display text-base">Model bawaan</h2>
          <ul className="space-y-2">
            {BUILTIN_MODELS.map((m) => (
              <li key={m.id} className="rounded-2xl border border-border/60 p-3">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {m.name}
                  {m.isNew && <NewBadge />}
                </p>
                <p className="text-xs text-muted-foreground">{m.tagline}</p>
              </li>
            ))}
          </ul>
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
