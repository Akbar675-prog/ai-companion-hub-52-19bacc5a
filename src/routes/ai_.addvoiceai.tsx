import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, ImagePlus } from "lucide-react";
import { useAccount } from "@/lib/use-account";
import { saveAiVoiceAgentFn } from "@/lib/ai-profile.functions";

export const Route = createFileRoute("/ai_/addvoiceai")({
  head: () => ({ meta: [{ title: "Tambah Voice AI — Galileo Mod APK" }] }),
  component: AddVoiceAiPage,
});

const inputClass =
  "w-full rounded-2xl bg-surface-variant px-4 py-3 text-sm outline-none ring-primary/40 focus:ring-2";

function AddVoiceAiPage() {
  const navigate = useNavigate();
  const { userId, loading: accountLoading } = useAccount();
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Pilih file gambar.");
    if (file.size > 1_500_000) return setError("Ukuran gambar maksimal 1,5 MB.");
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result ?? ""));
    reader.readAsDataURL(file);
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
    setSaving(true);
    try {
      await saveAiVoiceAgentFn({ data: { id: voiceId, name: name.trim(), image } });
      setSaved(true);
      setTimeout(() => void navigate({ to: "/ai/profile" }), 700);
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
          <h1 className="font-display text-2xl md:text-3xl">Tambah Voice AI</h1>
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
          <div className="mt-6 space-y-5 rounded-3xl bg-card p-5 m3-shadow-1">
            <label className="block text-sm font-medium">
              Gambar voice AI
              <span className="mt-2 flex aspect-square max-w-44 cursor-pointer items-center justify-center overflow-hidden rounded-3xl bg-surface-variant">
                {image ? <img src={image} alt="Pratinjau voice" className="h-full w-full object-cover" /> : <ImagePlus className="size-8 text-muted-foreground" />}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => void onImage(e.target.files?.[0])} />
              </span>
            </label>
            <label className="block text-sm font-medium">Nama voice AI<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Misal: Rachel" className={`${inputClass} mt-2`} /></label>
            <label className="block text-sm font-medium">ID voice AI<input value={id} onChange={(e) => setId(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))} maxLength={80} placeholder="r1KmysJdVYZjJCm4mL3b" className={`${inputClass} mt-2 font-mono`} /></label>
            {error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
            <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {saved ? <Check className="size-4" /> : null}{saved ? "Tersimpan" : saving ? "Menyimpan…" : "Simpan voice"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
