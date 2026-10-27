import { Link } from "@tanstack/react-router";
import { Menu, X, Plus, MessageSquare, LogIn, Trash2, Home, ChevronDown, UserRound, Coins } from "lucide-react";
import { AiAvatar } from "@/components/ui/plasma-shader";
import type { ChatThread } from "@/lib/ai-history";

export function AiHeader({
  open,
  setOpen,
  threads,
  activeId,
  onSelect,
  onNew,
  onDelete,
  userName,
  userAvatar,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  threads: ChatThread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  userName: string | null;
  userAvatar: string;
}) {
  return (
    <>
      <div className="sticky top-0 z-40 px-4 pt-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Riwayat chat"
            className="m3-shadow-1 inline-flex size-12 items-center justify-center rounded-2xl bg-card text-foreground transition-transform active:scale-95 hover:scale-105"
          >
            <Menu className="size-5" />
          </button>
          <button
            onClick={() => setOpen(true)}
            aria-label="Buka riwayat chat"
            className="m3-shadow-1 inline-flex min-w-0 items-center gap-2 rounded-full bg-card px-4 py-2.5 text-foreground transition-transform active:scale-95 hover:scale-[1.03]"
          >
            <AiAvatar className="size-7 shrink-0" />
            <span className="truncate font-display text-lg leading-none">GetrixAI</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <button
            onClick={onNew}
            aria-label="Chat baru"
            className="m3-shadow-1 inline-flex size-12 items-center justify-center rounded-2xl bg-card text-foreground transition-transform active:scale-95 hover:scale-105"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <button aria-label="Tutup" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
        <aside
          className={`absolute left-0 top-0 flex h-full w-[82%] max-w-sm flex-col overflow-y-auto bg-surface p-5 shadow-2xl transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-xl">Riwayat chat</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
              className="inline-flex size-10 items-center justify-center rounded-full bg-surface-variant hover:bg-primary-container"
            >
              <X className="size-5" />
            </button>
          </div>

          {userName ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-variant p-3">
              <img
                src={userAvatar}
                alt={`Foto profil ${userName}`}
                className="size-10 shrink-0 rounded-full bg-background object-cover"
              />
              <p className="min-w-0 truncate text-sm text-muted-foreground">Masuk sebagai {userName}</p>
            </div>
          ) : (
            <Link
              to="/login"
              className="mt-3 flex items-center gap-3 rounded-2xl bg-primary-container px-4 py-3 text-sm font-medium text-on-primary-container"
            >
              <LogIn className="size-4" /> Masuk untuk menyimpan riwayat chat
            </Link>
          )}

          <button
            onClick={onNew}
            className="mt-4 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
          >
            <Plus className="size-4" /> Chat baru
          </button>

          <div className="mt-4 flex flex-col gap-1">
            {threads.length === 0 && (
              <p className="rounded-2xl bg-surface-variant px-4 py-3 text-sm text-muted-foreground">
                Belum ada riwayat chat.
              </p>
            )}
            {threads.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition-colors ${
                  t.id === activeId ? "bg-secondary-container" : "hover:bg-surface-variant"
                }`}
              >
                <button onClick={() => onSelect(t.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{t.title || "Chat baru"}</span>
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  aria-label="Hapus chat"
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-1 border-t border-border pt-3">
            <Link
              to="/ai/profile"
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:bg-secondary-container"
            >
              <UserRound className="size-4" /> Profil GetrixAI
            </Link>
            <Link
              to="/ai/credits"
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:bg-secondary-container"
            >
              <Coins className="size-4" /> Kredit AI
            </Link>
            <Link
              to="/"
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:bg-secondary-container"
            >
              <Home className="size-4" /> Kembali ke Download
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}