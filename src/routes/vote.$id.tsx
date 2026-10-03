import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Clock, Share2 } from "lucide-react";
import { castVoteFn, getVoteFn, type Vote } from "@/lib/votes.functions";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/vote/$id")({
  head: () => ({
    meta: [
      { title: "Vote · Galileo Mod APK" },
      {
        name: "description",
        content: "Ikut voting dan lihat hasilnya secara langsung.",
      },
      { property: "og:title", content: "Vote · Galileo Mod APK" },
      {
        property: "og:description",
        content: "Ikut voting dan lihat hasilnya secara langsung.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VotePage,
});

function remaining(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}h ${h}j ${m}m`;
  if (h > 0) return `${h}j ${m}m ${s}d`;
  return `${m}m ${s}d`;
}

function VotePage() {
  const { id } = Route.useParams();
  const getVote = useServerFn(getVoteFn);
  const castVote = useServerFn(castVoteFn);

  const [local, setLocal] = useState<Vote | null>(null);
  const [voted, setVoted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [, tick] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["vote", id],
    queryFn: () => getVote({ data: { id } }),
  });

  useEffect(() => {
    setVoted(
      typeof window !== "undefined" ? localStorage.getItem(`vote:${id}`) : null,
    );
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => tick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const vote = local ?? data ?? null;

  if (isLoading) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto flex max-w-2xl items-center justify-center px-4 py-24">
          <m3e-loading-indicator className="m3-loading-md" aria-label="Memuat vote" />
        </main>
      </>
    );
  }

  if (!vote) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-xl font-semibold">Vote tidak ditemukan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tautan mungkin salah atau vote sudah dihapus.
          </p>
          <Link
            to="/vote-maker"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Buat vote baru
          </Link>
        </main>
      </>
    );
  }

  const left = remaining(vote.ends_at);
  const ended = left === null;
  const total = vote.options.reduce((a, o) => a + o.count, 0);

  async function onVote(optionId: string) {
    if (busy || ended || voted) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await castVote({ data: { id, option_id: optionId } });
      setLocal(updated);
      setVoted(optionId);
      localStorage.setItem(`vote:${id}`, optionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim suara.");
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-variant px-3 py-2 text-sm font-medium hover:bg-primary-container"
          >
            <ArrowLeft className="size-4" /> Kembali
          </Link>
          <button
            onClick={onShare}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-variant px-3 py-2 text-sm font-medium hover:bg-primary-container"
          >
            <Share2 className="size-4" /> {copied ? "Tersalin" : "Bagikan"}
          </button>
        </div>

        <h1 className="text-2xl font-bold tracking-tight">{vote.title}</h1>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-4" />
          {ended ? "Vote sudah selesai" : `Sisa waktu ${left}`}
        </p>

        <div className="mt-6 space-y-3">
          {vote.options.map((o) => {
            const pct = total > 0 ? Math.round((o.count / total) * 100) : 0;
            const showResult = ended || voted !== null;
            const picked = voted === o.id;
            return (
              <button
                key={o.id}
                onClick={() => onVote(o.id)}
                disabled={busy || ended || voted !== null}
                className={`relative w-full overflow-hidden rounded-2xl border px-4 py-3 text-left transition-colors ${
                  picked ? "border-primary" : "border-border"
                } ${!showResult ? "hover:bg-primary-container" : "cursor-default"}`}
              >
                {showResult && (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-primary/15"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <span className="relative flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {picked && <Check className="size-4 text-primary" />}
                    {o.label}
                  </span>
                  {showResult && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {o.count} suara · {pct}%
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Total {total} suara
          {voted && !ended ? " · Kamu sudah memilih" : ""}
        </p>

        {error && (
          <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </main>
    </>
  );
}
