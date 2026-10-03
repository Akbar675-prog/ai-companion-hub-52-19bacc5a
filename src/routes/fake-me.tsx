import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { adminSearchUsersFn, adminUpdateUserFn } from "@/lib/account.functions";
import { DEFAULT_AVATAR, useAccount } from "@/lib/use-account";

export const Route = createFileRoute("/fake-me")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Fake Me - Panel Owner GMA" },
      { name: "description", content: "Panel owner GMA untuk mengatur centang biru dan jumlah pengikut tampilan akun." },
      { property: "og:title", content: "Fake Me - Panel Owner GMA" },
      { property: "og:description", content: "Atur centang biru dan pengikut akun GMA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FakeMePage,
});

function FakeMePage() {
  const qc = useQueryClient();
  const { userId, profile, loading } = useAccount();
  const isAdmin = !!profile?.is_admin;
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["fake-me", q],
    queryFn: () => adminSearchUsersFn({ data: { q } }),
    enabled: isAdmin,
  });

  return (
    <div className="min-h-screen bg-background pb-16">
      <AppHeader />
      <main className="mx-auto mt-6 w-full max-w-3xl px-4">
        <h1 className="flex items-center gap-2 font-display text-3xl">
          <Sparkles className="size-6" /> Fake Me
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atur centang biru dan jumlah pengikut tampilan untuk akun mana pun.
        </p>

        {loading ? (
          <m3e-loading-indicator className="m3-loading-md mt-8" aria-label="Memuat" />
        ) : !userId ? (
          <p className="mt-6 text-sm text-muted-foreground">Kamu harus masuk sebagai owner.</p>
        ) : !isAdmin ? (
          <p className="mt-6 text-sm text-destructive">Halaman ini khusus owner.</p>
        ) : (
          <>
            <label className="relative mt-5 block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari username, nama, atau email..."
                className="w-full rounded-full bg-surface-variant py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            {isLoading ? (
              <m3e-loading-indicator className="m3-loading-md mt-8" aria-label="Memuat" />
            ) : (
              <div className="mt-4 space-y-3">
                {(data ?? [])
                  .filter((u: Row) =>
                    !q.trim()
                      ? true
                      : `${u.username} ${u.name} ${u.email ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()),
                  )
                  .map((u: Row) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      onSaved={() => qc.invalidateQueries({ queryKey: ["fake-me"] })}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

type Row = {
  id: string;
  user_no: number;
  name: string;
  username: string;
  avatar_url: string | null;
  verified: boolean;
  fake_followers: number;
  email: string | null;
};

function UserRow({ user, onSaved }: { user: Row; onSaved: () => void }) {
  const [followers, setFollowers] = useState(String(user.fake_followers ?? 0));
  const [busy, setBusy] = useState(false);

  async function save(patch: { verified?: boolean; fake_followers?: number }) {
    setBusy(true);
    try {
      await adminUpdateUserFn({ data: { target: user.id, ...patch } });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="m3-shadow-1 rounded-3xl bg-card p-4">
      <div className="flex items-center gap-3">
        <img src={user.avatar_url || DEFAULT_AVATAR} alt="" className="size-11 rounded-full bg-surface-variant object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold">{user.name}</p>
            {user.verified && <VerifiedBadge className="size-4" />}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            #{user.user_no} · @{user.username} · {user.email ?? "-"}
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() => save({ verified: !user.verified })}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${
            user.verified
              ? "border border-input bg-background"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {user.verified ? "Cabut centang" : "Beri centang"}
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={followers}
          onChange={(e) => setFollowers(e.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          className="w-full rounded-2xl bg-surface-variant px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="Jumlah pengikut palsu"
        />
        <button
          disabled={busy}
          onClick={() => save({ fake_followers: Math.min(1e15, Number(followers || 0)) })}
          className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <m3e-loading-indicator variant="contained" className="m3-loading-sm" aria-label="Menyimpan" /> : "Simpan"}
        </button>
      </div>
    </article>
  );
}
