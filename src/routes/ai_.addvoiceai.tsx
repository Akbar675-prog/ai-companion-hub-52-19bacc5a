import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Pencil, Trash2, X } from "lucide-react";
import { useAccount } from "@/lib/use-account";
import { deleteAiVoiceAgentFn, listAiVoiceAgentsFn, saveAiVoiceAgentFn } from "@/lib/ai-profile.functions";
import type { AiVoiceAgent } from "@/lib/ai-profile.server";

export const Route = createFileRoute("/ai_/addvoiceai")({
  head: () => ({ meta: [{ title: "Tambah Voice AI — Galileo Mod APK" }] }),
  component: AddVoiceAiPage,
});

const inputClass =
  "w-full rounded-2xl bg-surface-variant px-4 py-3 text-sm outline-none ring-primary/40 focus:ring-2";

function AddVoiceAiPage() {
  const { userId, loading: accountLoading } = useAccount();
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [voices, setVoices] = useState<AiVoiceAgent[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    listAiVoiceAgentsFn()
      .then((list) => alive && setVoices(list))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Gagal memuat voice agent."));
    return () => {
      alive = false;
    };
  }, [userId]);

  function editVoice(voice: AiVoiceAgent) {
    setEditingId(voice.id);
    setId(voice.id);
    setName(voice.name);
    setImage(voice.image);
    setSaved(false);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setId("");
    setName("");
    setImage("");
    setSaved(false);
  }

  async function removeVoice(voiceId: string) {
    setError(null);
    try {
      const next = await deleteAiVoiceAgentFn({ data: { id: voiceId } });
      setVoices(next.voiceAgents);
      if (editingId === voiceId) resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus voice agent.");
    }
  }

  async function save() {
    setError(null);
    setSaved(false);
    if (!userId) return setError("Masuk dulu untuk menambahkan voice AI.");
    const voiceId = id.trim();
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(voiceId)) {
      return setError("ID voice tidak valid. Salin ID dari URL ElevenLabs, tanpa spasi.");
    }
    if (name.trim().length < 2) return setError("Nama voice minimal 2 karakter.");
    if (image.trim() && !/^https?:\/\/\S+$/i.test(image.trim())) {
      return setError("URL gambar harus diawali http:// atau https://.");
    }
    setSaving(true);
    try {
      if (editingId && editingId !== voiceId) {
        await deleteAiVoiceAgentFn({ data: { id: editingId } });
      }
      const next = await saveAiVoiceAgentFn({ data: { id: voiceId, name: name.trim(), image: image.trim() } });
      setVoices(next.voiceAgents);
      setSaved(true);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan voice AI.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-10">
        <div className="flex items-center gap-3">
          <Link to="/ai/profile" aria-label="Kembali ke profil" className="m3-shadow-1 inline-flex size-11 items-center justify-center rounded-2xl bg-card">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-display text-2xl md:text-3xl">Kelola Voice AI</h1>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Tambahkan voice dari ElevenLabs. Contoh URL: /voices/r1KmysJdVYZjJCm4mL3b — ID-nya adalah bagian terakhir.
        </p>

        {!userId && !accountLoading ? (
          <div className="mt-6 rounded-3xl bg-primary-container p-5 text-on-primary-container">
            <p className="text-sm">Masuk dulu untuk menambahkan voice AI.</p>
            <Link to="/login" className="mt-3 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Masuk</Link>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {voices.length > 0 && (
              <section className="space-y-2 rounded-3xl bg-card p-5 m3-shadow-1">
                <h2 className="font-display text-lg">Voice global</h2>
                {voices.map((voice) => (
                  <div key={voice.id} className="flex items-center gap-3 rounded-2xl bg-surface-variant p-2">
                    {voice.image ? <img src={voice.image} alt="" className="size-11 rounded-xl object-cover" /> : <div className="size-11 rounded-xl bg-primary/15" />}
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{voice.name}</p><p className="truncate font-mono text-[11px] text-muted-foreground">{voice.id}</p></div>
                    <button type="button" onClick={() => editVoice(voice)} aria-label={`Edit ${voice.name}`} className="rounded-full p-2 text-muted-foreground hover:bg-surface-variant hover:text-foreground"><Pencil className="size-4" /></button>
                    <button type="button" onClick={() => void removeVoice(voice.id)} aria-label={`Hapus ${voice.name}`} className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>
                  </div>
                ))}
              </section>
            )}
            <section className="space-y-5 rounded-3xl bg-card p-5 m3-shadow-1">
            <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg">{editingId ? "Edit voice" : "Tambah voice"}</h2>{editingId && <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-sm text-muted-foreground"><X className="size-4" /> Batal</button>}</div>
            <label className="block text-sm font-medium">
              URL gambar voice AI
              <input type="url" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://example.com/voice.jpg" className={`${inputClass} mt-2`} />
              <span className="mt-1 block text-xs text-muted-foreground">Masukkan URL publik gambar, bukan file upload.</span>
            </label>
            <label className="block text-sm font-medium">Nama voice AI<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Misal: Rachel" className={`${inputClass} mt-2`} /></label>
            <label className="block text-sm font-medium">ID voice AI<input value={id} onChange={(e) => setId(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))} maxLength={80} placeholder="r1KmysJdVYZjJCm4mL3b" className={`${inputClass} mt-2 font-mono`} /></label>
            {error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
            <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {saved ? <Check className="size-4" /> : null}{saved ? "Tersimpan" : saving ? "Menyimpan…" : "Simpan voice"}
            </button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
