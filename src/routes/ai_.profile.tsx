import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { AiAvatar } from "@/components/ui/plasma-shader";
import { useAccount } from "@/lib/use-account";
import { getAiProfileFn, saveAiProfileFn } from "@/lib/ai-profile.functions";

export const Route = createFileRoute("/ai_/profile")({
  head: () => ({
    meta: [
      { title: "Profil GetrixAI — Galileo Mod APK" },
      {
        name: "description",
        content:
          "Atur nama panggilan, nama panjang, umur, dan deskripsi diri yang dipakai GetrixAI saat mengobrol denganmu.",
      },
      { property: "og:title", content: "Profil GetrixAI — Galileo Mod APK" },
      {
        property: "og:description",
        content: "Personalisasi cara GetrixAI menyapa dan memahami kamu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiProfilePage,
});

function AiProfilePage() {
  const { userId, loading: accountLoading } = useAccount();
  const [nickname, setNickname] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [about, setAbout] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    getAiProfileFn()
      .then((p) => {
        if (!alive) return;
        setNickname(p.nickname);
        setFullName(p.fullName);
        setAge(p.age ? String(p.age) : "");
        setAbout(p.about);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const parsedAge = age.trim() ? Number(age.trim()) : null;
      if (parsedAge !== null && (!Number.isFinite(parsedAge) || parsedAge < 1 || parsedAge > 120)) {
        throw new Error("Umur harus antara 1 sampai 120.");
      }
      await saveAiProfileFn({
        data: {
          nickname: nickname.trim(),
          fullName: fullName.trim(),
          age: parsedAge,
          about: about.trim(),
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-10">
        <div className="flex items-center gap-3">
          <Link
            to="/ai"
            aria-label="Kembali ke AI"
            className="m3-shadow-1 inline-flex size-11 items-center justify-center rounded-2xl bg-card"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-display text-2xl md:text-3xl">Profil GetrixAI</h1>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-3xl bg-surface-variant p-4">
          <AiAvatar className="size-10 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Data di sini khusus dipakai GetrixAI saat mengobrol denganmu — terpisah dari profil akun.
          </p>
        </div>

        {!userId && !accountLoading ? (
          <div className="mt-6 rounded-3xl bg-primary-container p-5 text-on-primary-container">
            <p className="text-sm">Masuk dulu untuk mengatur profil GetrixAI.</p>
            <Link
              to="/login"
              className="mt-3 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Masuk
            </Link>
          </div>
        ) : loading || accountLoading ? (
          <div className="mt-8 flex justify-center">
            <m3e-loading-indicator className="m3-loading-md" aria-label="Memuat profil" />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <Field label="Nama panggilan" hint="Yang dipakai GetrixAI buat manggil kamu.">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={40}
                placeholder="Misal: Akbar"
                className="w-full rounded-2xl bg-surface-variant px-4 py-3 text-sm outline-none ring-primary/40 focus:ring-2"
              />
            </Field>

            <Field label="Nama panjang" hint="Opsional.">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={80}
                placeholder="Misal: Akbar Ramadhan"
                className="w-full rounded-2xl bg-surface-variant px-4 py-3 text-sm outline-none ring-primary/40 focus:ring-2"
              />
            </Field>

            <Field label="Umur" hint="Boleh dikosongkan.">
              <input
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                inputMode="numeric"
                placeholder="Misal: 18"
                className="w-full rounded-2xl bg-surface-variant px-4 py-3 text-sm outline-none ring-primary/40 focus:ring-2"
              />
            </Field>

            <Field label="Tentang kamu" hint="Hobi, pekerjaan, gaya jawaban yang kamu suka, dll.">
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                maxLength={600}
                rows={5}
                placeholder="Misal: Aku suka ngoding dan main game, jelasin sesuatu dengan santai ya."
                className="w-full resize-y rounded-2xl bg-surface-variant px-4 py-3 text-sm outline-none ring-primary/40 focus:ring-2"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{about.length}/600</p>
            </Field>

            {error && (
              <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
            )}

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? (
                <m3e-loading-indicator variant="contained" className="m3-loading-sm" aria-label="Menyimpan" />
              ) : saved ? (
                <Check className="size-4" />
              ) : null}
              {saved ? "Tersimpan" : "Simpan"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
