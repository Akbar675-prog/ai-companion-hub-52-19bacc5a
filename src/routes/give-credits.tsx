import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { adminCreditDashboardFn, adminSetCreditsFn } from "@/lib/ai-credits.functions";

export const Route = createFileRoute("/give-credits")({
  head: () => ({
    meta: [
      { title: "Kelola Kredit AI — Galileo Mod APK" },
      { name: "description", content: "Panel admin untuk mengatur kredit chat dan gambar AI." },
      { property: "og:title", content: "Kelola Kredit AI — Galileo Mod APK" },
      { property: "og:description", content: "Panel admin kredit AI global dan per pengguna." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GiveCreditsPage,
});

type Dashboard = Awaited<ReturnType<typeof adminCreditDashboardFn>>;

function GiveCreditsPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Dashboard | null>(null);
  const [selected, setSelected] = useState<string | undefined>();
  const [chatLimit, setChatLimit] = useState(100_000);
  const [imageLimit, setImageLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load(search = query) {
    setLoading(true);
    setMessage("");
    try {
      setData(await adminCreditDashboardFn({ data: { query: search } }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal membuka panel admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
  }, []);

  async function save() {
    setLoading(true);
    try {
      await adminSetCreditsFn({ data: { targetUserId: selected, chatLimit, imageLimit } });
      setMessage(selected ? "Kredit pengguna berhasil diperbarui." : "Kredit global berhasil diperbarui.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan kredit.");
      setLoading(false);
    }
  }

  const selectedUser = data?.users.find((user) => user.id === selected);
  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center gap-3">
          <Link to="/ai" aria-label="Kembali" className="inline-flex size-11 items-center justify-center rounded-2xl bg-card m3-shadow-1">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl">Berikan Kredit AI</h1>
            <p className="text-sm text-muted-foreground">Reset otomatis setiap pukul 07:00 WIB.</p>
          </div>
        </header>

        <section className="mt-6 space-y-5 rounded-3xl bg-card p-5 m3-shadow-1">
          <div className="flex rounded-2xl bg-surface-variant p-1">
            <button type="button" onClick={() => setSelected(undefined)} className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${!selected ? "bg-primary text-primary-foreground" : ""}`}>Global</button>
            <span className="flex-1 rounded-xl px-3 py-2 text-center text-sm font-medium">Pengguna terpilih</span>
          </div>

          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void load(); }}>
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-background px-3">
              <Search className="size-4 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari ID, nama, atau username" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
            <button type="submit" aria-label="Cari pengguna" className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Search className="size-4" /></button>
          </form>

          {data && data.users.length > 0 && (
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {data.users.map((user) => (
                <button key={user.id} type="button" onClick={() => {
                  setSelected(user.id);
                  const override = data.config.users?.[user.id];
                  setChatLimit(override?.chatLimit ?? data.config.globalChatLimit ?? 100_000);
                  setImageLimit(override?.imageLimit ?? data.config.globalImageLimit ?? 5);
                }} className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm ${selected === user.id ? "bg-primary-container text-on-primary-container" : "hover:bg-surface-variant"}`}>
                  <span><strong>{user.name}</strong><span className="ml-2 text-muted-foreground">@{user.username}</span></span>
                  <span className="text-xs">ID {user.user_no}</span>
                </button>
              ))}
            </div>
          )}

          <p className="text-sm font-medium">Target: {selectedUser ? `${selectedUser.name} · ID ${selectedUser.user_no}` : "Semua pengguna"}</p>
          <label className="block text-sm font-medium">Token chat per hari<input type="number" min={0} max={1_000_000_000} value={chatLimit} onChange={(event) => setChatLimit(Number(event.target.value))} className="mt-2 h-12 w-full rounded-2xl border border-input bg-background px-4 outline-none focus:ring-2 focus:ring-ring" /></label>
          <label className="block text-sm font-medium">Gambar per hari<input type="number" min={0} max={1_000_000} value={imageLimit} onChange={(event) => setImageLimit(Number(event.target.value))} className="mt-2 h-12 w-full rounded-2xl border border-input bg-background px-4 outline-none focus:ring-2 focus:ring-ring" /></label>
          <button type="button" disabled={loading} onClick={() => void save()} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground disabled:opacity-60">
            {loading ? <m3e-loading-indicator variant="contained" className="m3-loading-sm" aria-label="Menyimpan" /> : <Send className="size-5" />} Simpan kredit
          </button>
          {message && <p className="text-center text-sm text-muted-foreground">{message}</p>}
        </section>
      </div>
    </main>
  );
}