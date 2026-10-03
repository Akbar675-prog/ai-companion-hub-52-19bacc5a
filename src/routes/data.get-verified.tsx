import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { listVerificationRequestsFn, decideVerificationFn } from "@/lib/account.functions";
import { DEFAULT_AVATAR, useAccount } from "@/lib/use-account";

export const Route = createFileRoute("/data/get-verified")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Permintaan Verifikasi - Panel Owner GMA" },
      { name: "description", content: "Panel owner untuk meninjau dan menyetujui permintaan centang biru pengguna GMA." },
      { property: "og:title", content: "Permintaan Verifikasi - Panel Owner GMA" },
      { property: "og:description", content: "Tinjau permintaan centang biru pengguna GMA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VerificationAdminPage,
});

function VerificationAdminPage() {
  const qc = useQueryClient();
  const { userId, profile, loading } = useAccount();
  const isAdmin = !!profile?.is_admin;

  const { data, isLoading } = useQuery({
    queryKey: ["verification-requests"],
    queryFn: () => listVerificationRequestsFn(),
    enabled: isAdmin,
  });

  return (
    <div className="min-h-screen bg-background pb-16">
      <AppHeader />
      <main className="mx-auto mt-6 w-full max-w-3xl px-4">
        <h1 className="font-display text-3xl">Permintaan Verifikasi</h1>

        {loading ? (
          <m3e-loading-indicator className="m3-loading-md mt-8" aria-label="Memuat" />
        ) : !userId ? (
          <p className="mt-6 text-sm text-muted-foreground">Kamu harus masuk sebagai owner.</p>
        ) : !isAdmin ? (
          <p className="mt-6 text-sm text-destructive">Halaman ini khusus owner.</p>
        ) : isLoading ? (
          <m3e-loading-indicator className="m3-loading-md mt-8" aria-label="Memuat" />
        ) : (data ?? []).length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Belum ada permintaan.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {(data ?? []).map((req: any) => (
              <article key={req.id} className="m3-shadow-1 rounded-3xl bg-card p-5">
                <div className="flex items-center gap-3">
                  <img
                    src={req.profile?.avatar_url || DEFAULT_AVATAR}
                    alt=""
                    className="size-11 rounded-full bg-surface-variant object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-semibold">{req.profile?.name ?? "?"}</p>
                      {req.profile?.verified && <VerifiedBadge className="size-4" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      @{req.profile?.username} · /users/{req.profile?.user_no}/profile
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-variant px-3 py-1 text-xs">{req.status}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm">{req.reason}</p>
                {req.links && (
                  <a href={req.links} target="_blank" rel="noreferrer noopener" className="mt-2 block truncate text-xs text-primary hover:underline">
                    {req.links}
                  </a>
                )}
                {req.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={async () => {
                        await decideVerificationFn({ data: { id: req.id, approve: true } });
                        qc.invalidateQueries({ queryKey: ["verification-requests"] });
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      <Check className="size-4" /> Setujui
                    </button>
                    <button
                      onClick={async () => {
                        await decideVerificationFn({ data: { id: req.id, approve: false } });
                        qc.invalidateQueries({ queryKey: ["verification-requests"] });
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                    >
                      <X className="size-4" /> Tolak
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
