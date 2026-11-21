import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { NewBadge } from "@/components/NewBadge";
import { ABILITIES, parseAbilities } from "@/lib/ai-abilities";
import { useAccount } from "@/lib/use-account";
import { deleteAiModelFn, listAiModelsFn, saveAiModelFn } from "@/lib/ai-models.functions";
import {
  allModels,
  deleteModel,
  restoreBuiltins,
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
  const { userId } = useAccount();
  const [list, setList] = useState<AiModel[]>([]);
  const [cloudModels, setCloudModels] = useState<AiModel[]>([]);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [tagline, setTagline] = useState("");
  const [persona, setPersona] = useState("");
  const [markNew, setMarkNew] = useState(true);
  const [realModel, setRealModel] = useState(false);
  const [gpt6Based, setGpt6Based] = useState(false);
  const [modelType, setModelType] = useState("");
  const [uncensored, setUncensored] = useState(false);
  const [abilities, setAbilities] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [endpointKey, setEndpointKey] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);


  const refresh = (customModels = cloudModels) => setList(allModels(userId ? customModels : []));

  useEffect(() => {
    let alive = true;
    void listAiModelsFn()
      .then((models) => {
        if (!alive) return;
        setCloudModels(models);
        setList(allModels(models));
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Gagal memuat AI."));
    return () => {
      alive = false;
    };
  }, [userId]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setLogo("");
    setTagline("");
    setPersona("");
    setMarkNew(true);
    setRealModel(false);
    setGpt6Based(false);
    setModelType("");
    setUncensored(false);
    setAbilities("");
    setEndpointUrl("");
    setEndpointKey("");
  }

  function startEdit(m: AiModel) {
    setEditingId(m.id);
    setName(m.name);
    setLogo(m.logo ?? "");
    setTagline(m.tagline ?? "");
    setPersona(m.persona ?? "");
    setMarkNew(Boolean(m.isNew));
    setRealModel(Boolean(m.realModel));
    setGpt6Based(Boolean(m.gpt6Based));
    setModelType(m.modelType ?? "");
    setUncensored(Boolean(m.uncensored));
    setAbilities(m.abilities ?? "");
    setEndpointUrl(m.endpointUrl ?? "");
    setEndpointKey(m.endpointKey ?? "");
    setError(null);
    setSaved(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setError(null);
    setSaved(null);
    if (!userId) {
      setError("Masuk dulu untuk menyimpan AI ke Supabase.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Nama AI minimal 2 karakter.");
      return;
    }
    const ep = endpointUrl.trim();
    if (realModel && !gpt6Based) {
      if (modelType.trim() && !/^[\w.:\/-]+$/.test(modelType.trim())) {
        setError("Model type harus seperti: nvidia/nemotron-3.5-lightning:free");
        return;
      }
      if (ep && !/^https:\/\/\S+$/i.test(ep)) {
        setError("Endpoint harus berupa URL https://");
        return;
      }
    } else if (persona.trim().length < 10) {
      setError("Prompting AI minimal 10 karakter supaya gayanya jelas.");
      return;
    }
    const patch = {
      name: name.trim().slice(0, 40),
      tagline: tagline.trim().slice(0, 120) || "AI kustom buatan kamu.",
      persona: realModel && !gpt6Based ? "" : persona.trim().slice(0, 10_000),
      logo: logo.trim() || undefined,
      isNew: markNew,
      realModel: realModel && !gpt6Based,
      gpt6Based,
      modelType: realModel && !gpt6Based && modelType.trim() ? modelType.trim().slice(0, 120) : undefined,
      uncensored,
      abilities: parseAbilities(abilities).join(", ") || undefined,
      endpointUrl: realModel && !gpt6Based && ep ? ep.slice(0, 300) : undefined,
      endpointKey: realModel && !gpt6Based && ep ? endpointKey.trim().slice(0, 400) || undefined : undefined,
    };

    try {
      if (editingId && !editingId.startsWith("custom-")) {
        updateModel(editingId, patch);
        setSaved("Perubahan disimpan di perangkat ini.");
        resetForm();
        refresh();
        return;
      }

      const model = {
        id: editingId ?? slugId(name),
        ...patch,
        custom: true as const,
      } as AiModel;
      const savedModel = await saveAiModelFn({ data: model });
      const next = cloudModels.some((m) => m.id === savedModel.id)
        ? cloudModels.map((m) => (m.id === savedModel.id ? savedModel : m))
        : [...cloudModels, savedModel];
      setCloudModels(next);
      setList(allModels(next));
      setSaved(editingId ? "Perubahan disimpan ke Supabase." : "AI berhasil ditambahkan ke Supabase.");
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan AI ke Supabase.");
    }
  }


  async function remove(m: AiModel) {
    setError(null);
    try {
      if (m.custom && userId) {
        await deleteAiModelFn({ data: { id: m.id } });
        const next = cloudModels.filter((model) => model.id !== m.id);
        setCloudModels(next);
        setList(allModels(next));
      } else {
        deleteModel(m.id);
        refresh();
      }
      if (editingId === m.id) resetForm();
      setSaved(`${m.name} dihapus.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus AI dari Supabase.");
    }
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
          AI di halaman ini adalah katalog global. Setelah disimpan, model langsung tersedia untuk
          semua pengguna yang login.
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

          <label className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-3 text-sm">
            <input
              type="checkbox"
              checked={gpt6Based}
              onChange={(e) => {
                setGpt6Based(e.target.checked);
                if (e.target.checked) setRealModel(false);
              }}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              <span className="font-medium">Use GPT-6 based model AI</span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                Memakai mesin GPT-6 yang sama dengan model utama. Nama, prompt persona hingga 10.000
                karakter, dan kemampuan bisa dikustomisasi. Ini fine-tuning lewat prompt, bukan
                pelatihan ulang model. Model disimpan di katalog global dan dapat dipilih semua
                pengguna.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={realModel}
              onChange={(e) => {
                setRealModel(e.target.checked);
                if (e.target.checked) setGpt6Based(false);
              }}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              Real model (opsional)
              <span className="block text-xs text-muted-foreground">
                Centang hanya jika ingin memakai model resmi, bukan prompting.
              </span>
            </span>
          </label>

          <Field label="Kemampuan khusus (pisahkan dengan koma)">
            <input
              value={abilities}
              onChange={(e) => setAbilities(e.target.value)}
              placeholder="-CODE-AGENT, -DEEP-THINKING"
              className={inputClass}
              autoCapitalize="characters"
              spellCheck={false}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Contoh yang tersedia: {ABILITIES.map((a) => a.tag).join(", ")}. Kemampuan lain boleh
              kamu tulis sendiri.
            </span>
          </Field>

          {realModel && !gpt6Based ? (
            <>
              <Field label="Model type (opsional)">
                <input
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value)}
                  placeholder="nvidia/nemotron-3.5-lightning:free"
                  className={inputClass}
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  ID model tetap sama. Switch di bawah hanya mengubah prompt internal respons.
                </span>
              </Field>
              <Field label="Endpoint API (opsional, kosong = OpenRouter)">
                <input
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className={inputClass}
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  Endpoint apa pun yang kompatibel format OpenAI (OpenAI, Groq, Together, DeepSeek, Ollama publik, dll).
                </span>
              </Field>
              {endpointUrl.trim() && (
                <Field label="API key endpoint">
                  <input
                    type="password"
                    value={endpointKey}
                    onChange={(e) => setEndpointKey(e.target.value)}
                    placeholder="sk-..."
                    className={inputClass}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>
              )}
            </>
          ) : (
            <Field label={gpt6Based ? "Prompt GPT-6 (persona & fine-tuning)" : "Prompting AI (gaya & aturan menjawab)"}>
              <textarea
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                rows={6}
                maxLength={10_000}
                placeholder="Contoh: Tangani tugas kompleks secara sistematis, jelaskan asumsi, format hasil sesuai kebutuhan, dan verifikasi kesimpulan."
                className={`${inputClass} resize-y`}
                aria-describedby="persona-help"
              />
              <span id="persona-help" className="mt-1 block text-xs text-muted-foreground">
                {persona.length.toLocaleString("id-ID")} / 10.000 karakter. Berlaku untuk semua percakapan dengan model ini.
              </span>
            </Field>
          )}

          <label className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <input
              type="checkbox"
              role="switch"
              checked={uncensored}
              onChange={(e) => setUncensored(e.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              <span className="font-medium">Tambahkan prompt uncensored</span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                Menggabungkan prompt kamu dengan mode respons kreatif, termasuk penulisan dewasa/NSFW
                dan roleplay. Gunakan AI dengan bijak; penyedia model tetap dapat menerapkan kebijakan
                keselamatannya.
              </span>
            </span>
          </label>

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
            onClick={() => void submit()}
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
                      {m.gpt6Based && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                          GPT-6 based
                        </span>
                      )}
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
                    onClick={() => void remove(m)}
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
