import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Vote as VoteIcon } from "lucide-react";
import { createVoteFn } from "@/lib/votes.functions";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/vote-maker")({
  head: () => ({
    meta: [
      { title: "Buat Vote · Galileo Mod APK" },
      {
        name: "description",
        content:
          "Buat voting sendiri: tulis judul, tambah sampai 10 pilihan, atur durasi, lalu bagikan tautannya.",
      },
      { property: "og:title", content: "Buat Vote · Galileo Mod APK" },
      {
        property: "og:description",
        content:
          "Buat voting sendiri: tulis judul, tambah sampai 10 pilihan, atur durasi, lalu bagikan tautannya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VoteMakerPage,
});

const MAX_OPTIONS = 10;

const DURATIONS = [
  { label: "5 menit", minutes: 5 },
  { label: "1 jam", minutes: 60 },
  { label: "2 jam", minutes: 120 },
  { label: "5 jam", minutes: 300 },
  { label: "Kustom", minutes: 0 },
];

function VoteMakerPage() {
  const createVote = useServerFn(createVoteFn);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [duration, setDuration] = useState(60);
  const [custom, setCustom] = useState(30);
  const [customUnit, setCustomUnit] = useState<"minute" | "hour" | "day">("minute");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustom = duration === 0;
  const unitFactor = customUnit === "minute" ? 1 : customUnit === "hour" ? 60 : 1440;
  const finalMinutes = isCustom ? Math.round(custom * unitFactor) : duration;

  function setOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (!title.trim()) return setError("Judul wajib diisi.");
    if (cleaned.length < 2) return setError("Minimal 2 pilihan yang terisi.");
    if (finalMinutes < 1) return setError("Durasi minimal 1 menit.");

    setSubmitting(true);
    try {
      const res = await createVote({
        data: {
          title: title.trim(),
          options: cleaned,
          duration_minutes: finalMinutes,
        },
      });
      navigate({ to: "/vote/$id", params: { id: res.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat vote.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-variant px-3 py-2 text-sm font-medium hover:bg-primary-container"
          >
            <ArrowLeft className="size-4" /> Kembali
          </Link>
        </div>

        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <VoteIcon className="size-6 text-primary" /> Buat Vote
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tulis judul, tambah pilihan (maksimal {MAX_OPTIONS}), lalu atur kapan vote selesai.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-4">
            <label className="text-sm font-semibold" htmlFor="vote-title">
              Judul
            </label>
            <input
              id="vote-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Contoh: Galileo"
              className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Pilihan</span>
              <span className="text-xs text-muted-foreground">
                {options.length}/{MAX_OPTIONS}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <input
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    maxLength={80}
                    placeholder={`Nama pilihan ${i + 1}`}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    aria-label={`Hapus pilihan ${i + 1}`}
                    disabled={options.length <= 2}
                    onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={options.length >= MAX_OPTIONS}
              onClick={() => setOptions((prev) => [...prev, ""])}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-4 py-2 text-sm font-medium text-on-secondary-container transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-4" /> Tambah pilihan
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <span className="text-sm font-semibold">Vote selesai dalam</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setDuration(d.minutes)}
                  className={
                    duration === d.minutes
                      ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                      : "rounded-full bg-surface-variant px-4 py-2 text-sm font-medium transition-colors hover:bg-primary-container"
                  }
                >
                  {d.label}
                </button>
              ))}
            </div>

            {isCustom && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={custom}
                  onChange={(e) => setCustom(Number(e.target.value))}
                  className="w-28 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value as typeof customUnit)}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="minute">menit</option>
                  <option value="hour">jam</option>
                  <option value="day">hari</option>
                </select>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? <m3e-loading-indicator variant="contained" className="m3-loading-sm" aria-label="Membuat vote" /> : <VoteIcon className="size-4" />}
            Buat
          </button>
        </form>
      </main>
    </>
  );
}
