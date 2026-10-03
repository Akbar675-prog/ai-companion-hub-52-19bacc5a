import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Trash2, Send, Inbox } from "lucide-react";
import { listRequestsFn, deleteRequestFn, type AppRequest } from "@/lib/requests.functions";
import { AppHeader } from "@/components/AppHeader";

const requestsQuery = queryOptions({
  queryKey: ["apk-requests"],
  queryFn: () => listRequestsFn(),
});

export const Route = createFileRoute("/request_/data")({
  loader: ({ context }) => context.queryClient.ensureQueryData(requestsQuery),
  head: () => ({
    meta: [
      { title: "Data Request APK · Galileo Mod APK" },
      { name: "description", content: "Daftar request APK dari pengguna." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Data Request APK" },
      { property: "og:description", content: "Daftar request APK dari pengguna." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestDataPage,
});

function RequestDataPage() {
  const { data: rows } = useSuspenseQuery(requestsQuery);
  const del = useServerFn(deleteRequestFn);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  async function onDelete(r: AppRequest) {
    if (!confirm(`Hapus request "${r.app_name}"?`)) return;
    setBusy(r.id);
    try {
      await del({ data: { id: r.id } });
      await qc.invalidateQueries({ queryKey: ["apk-requests"] });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/request"
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-variant px-3 py-2 text-sm font-medium hover:bg-primary-container"
          >
            <ArrowLeft className="size-4" /> Kembali
          </Link>
          <Link
            to="/request"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Send className="size-4" /> Buat request
          </Link>
        </div>

        <header className="mb-6">
          <h1 className="font-display text-3xl leading-tight md:text-4xl">
            Data Request
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Total {rows.length} request tersimpan.
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="m3-shadow-1 flex flex-col items-center gap-2 rounded-3xl bg-card p-10 text-center text-sm text-muted-foreground">
            <Inbox className="size-8" />
            Belum ada request.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="m3-shadow-1 rounded-2xl bg-card p-4 md:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold">
                        {r.app_name}
                      </p>
                      {r.version && (
                        <span className="rounded-full bg-secondary-container px-2 py-0.5 font-mono text-xs text-on-secondary-container">
                          v{r.version}
                        </span>
                      )}
                    </div>
                    {r.note && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
                        {r.note}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {r.contact && <span>Kontak: {r.contact}</span>}
                      <span>
                        {new Date(r.created_at).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(r)}
                    disabled={busy === r.id}
                    aria-label="Hapus"
                    className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
                  >
                    {busy === r.id ? (
                      <m3e-loading-indicator className="m3-loading-sm" aria-label="Menghapus" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}