import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, Search, Download, Info, MessageCircle, Settings as SettingsIcon, Gem, Trophy, Send, Activity, LogIn, ChevronRight, Bot, Bug } from "lucide-react";
import { listAppsFn, type AppListItem } from "@/lib/apps.functions";
import { versionLabel } from "@/lib/metadata.functions";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { DEFAULT_AVATAR, useAccount } from "@/lib/use-account";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.5 8.4a6.4 6.4 0 0 1-3.75-1.2v7.3a5.9 5.9 0 1 1-5.9-5.9c.32 0 .63.03.93.08v3.05a2.9 2.9 0 1 0 2 2.76V2h3.02a4.4 4.4 0 0 0 3.7 3.7V8.4z" />
    </svg>
  );
}
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.5 3.5A11 11 0 0 0 3.2 17L2 22l5.2-1.2A11 11 0 1 0 20.5 3.5zm-8.5 17a9 9 0 0 1-4.6-1.3l-.3-.2-3.1.7.7-3-.2-.3A9 9 0 1 1 12 20.5zm5-6.3c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.3-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.6-1.4-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.3-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.4 3.8 3.4.5.2.9.3 1.3.4.5.2 1 .1 1.4.1.4-.1 1.3-.5 1.5-1 .2-.5.2-1 .1-1z"/>
    </svg>
  );
}

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, userId } = useAccount();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const { data: apps } = useQuery({
    queryKey: ["apps"],
    queryFn: () => listAppsFn(),
    enabled: open,
    staleTime: 30_000,
  });

  const keyword = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!keyword || !apps) return [];
    const tokens = keyword.split(/\s+/).filter(Boolean);
    const scored: { app: AppListItem; s: number }[] = [];
    for (const app of apps) {
      const name = app.App_name.toLowerCase();
      const desc = (app.Description || "").toLowerCase();
      const ver = (app.Version || "").toLowerCase();
      let s = 0;
      for (const t of tokens) {
        if (name === t) s += 100;
        if (name.startsWith(t)) s += 40;
        if (name.includes(t)) s += 20;
        if (desc.includes(t)) s += 5;
        if (ver.includes(t)) s += 8;
      }
      if (s > 0) scored.push({ app, s });
    }
    return scored.sort((a, b) => b.s - a.s).slice(0, 12).map((x) => x.app);
  }, [apps, keyword]);

  function goToApp(app: AppListItem) {
    setOpen(false);
    setQ("");
    navigate({ to: "/apps/$id", params: { id: app.ID } });
  }

  return (
    <>
      <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-[1.75rem] border border-border/70 bg-background/85 px-3 py-2 shadow-sm backdrop-blur-xl sm:px-4">
          <Link
            to="/"
            aria-label="Galileo Mod APK — beranda"
            className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Download className="size-5" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-display text-base font-semibold">Galileo</span>
              <span className="truncate text-[11px] text-muted-foreground">Katalog APK</span>
            </span>
          </Link>

          <PrimaryNavigation />

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            aria-expanded={open}
            aria-controls="app-menu-drawer"
            className="m3-shadow-1 inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-card text-foreground transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Drawer */}
      <div
        inert={!open}
        aria-hidden={!open}
        className={`fixed inset-0 z-50 transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <button
          aria-label="Tutup"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          id="app-menu-drawer"
          aria-label="Menu utama"
          className={`absolute left-0 top-0 flex h-full w-[min(88%,24rem)] flex-col overflow-y-auto bg-surface p-5 shadow-2xl transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-xl">Menu</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
              className="inline-flex size-10 items-center justify-center rounded-full bg-surface-variant hover:bg-primary-container"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-5">
            <label className="relative block">
              <span className="sr-only">Cari aplikasi dalam katalog</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari aplikasi..."
                className="min-h-12 w-full rounded-full bg-surface-variant py-3 pl-11 pr-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
                autoFocus={false}
              />
            </label>

            {keyword && (
              <div className="mt-3 space-y-2">
                {results.length === 0 ? (
                  <p className="rounded-2xl bg-surface-variant px-4 py-3 text-sm text-muted-foreground">
                    Tidak ada hasil untuk "{q}"
                  </p>
                ) : (
                  results.map((app, i) => (
                    <button
                      key={app.ID}
                      onClick={() => goToApp(app)}
                      style={{
                        animationDelay: `${Math.min(i * 30, 300)}ms`,
                        animationFillMode: "backwards",
                      }}
                      className="m3-shadow-1 flex w-full animate-fade-in items-center gap-3 rounded-2xl bg-card p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:m3-shadow-2 active:scale-[0.98]"
                    >
                      {app.App_icon ? (
                        <img
                          src={app.App_icon}
                          alt=""
                          className="size-11 shrink-0 rounded-lg bg-surface-variant object-cover"
                        />
                      ) : (
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-tertiary-container font-display text-base text-on-tertiary-container">
                          {app.App_name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold">
                            {app.App_name}
                          </p>
                          {app.Is_exclusive && (
                            <Gem className="size-3.5 shrink-0 text-amber-500" />
                          )}
                        </div>
                        <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted-foreground">
                          <span className="font-mono">v{versionLabel(app.Version)}</span>
                          <span className="opacity-40">·</span>
                          <span className="truncate">
                            {app.Description || "Tidak ada deskripsi."}
                          </span>
                        </p>
                      </div>
                      <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                        <Download className="size-4" />
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {!keyword && (
            <>
              <div className="mt-6">
                <p className="px-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Navigasi
                </p>
                <nav className="mt-2 flex flex-col gap-1">
                  <DrawerLink to="/" icon={<Download className="size-4" />} label="Katalog" />
                  <DrawerLink to="/ai" icon={<Bot className="size-4" />} label="AI Chat" />
                  <DrawerLink to="/leaderboard" icon={<Trophy className="size-4" />} label="Papan peringkat" />
                  <DrawerLink to="/request" icon={<Send className="size-4" />} label="Ajukan APK" />
                  <DrawerLink to="/report" icon={<Bug className="size-4" />} label="Laporan Tiket Masalah" />
                  <DrawerLink to="/my-report" icon={<Bug className="size-4" />} label="Laporan saya" />
                  <DrawerLink to="/status" icon={<Activity className="size-4" />} label="Status" />
                  <DrawerLink to="/settings" icon={<SettingsIcon className="size-4" />} label="Pengaturan" />
                  <DrawerLink to="/about" icon={<Info className="size-4" />} label="Tentang" />
                </nav>
              </div>

              <div className="mt-6">
                <p className="px-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Media sosial
                </p>
                <nav className="mt-2 flex flex-col gap-1">
                  <SocialLink
                    href="https://www.tiktok.com/@kntmlz"
                    icon={<TikTokIcon className="size-4" />}
                    label="TikTok"
                    sub="@kntmlz"
                  />
                  <SocialLink
                    href="https://wa.me/6289531606677"
                    icon={<WhatsAppIcon className="size-4" />}
                    label="WhatsApp"
                    sub="Chat langsung"
                  />
                  <SocialLink
                    href="https://whatsapp.com/channel/0029VbDY5dR29753oLbbVc1c"
                    icon={<MessageCircle className="size-4" />}
                    label="WA Channel"
                    sub="Ikuti channel"
                  />
                </nav>
              </div>

              <div className="mt-6">
                {userId && profile ? (
                  <Link
                    to="/profile"
                    className="m3-shadow-1 flex items-center gap-3 rounded-3xl bg-card p-3 transition hover:-translate-y-0.5"
                  >
                    <img
                      src={profile.avatar_url || DEFAULT_AVATAR}
                      alt=""
                      className="size-11 shrink-0 rounded-full bg-surface-variant object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">{profile.name}</p>
                        {profile.verified && <VerifiedBadge className="size-4 shrink-0" />}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors hover:bg-primary-container"
                  >
                    <span className="inline-flex size-9 items-center justify-center rounded-xl bg-surface-variant">
                      <LogIn className="size-4" />
                    </span>
                    Masuk
                  </Link>
                )}
              </div>

              <div className="mt-auto pt-6 text-xs text-muted-foreground">
                Galileo Mod APK · Material 3 Expressive
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function DrawerLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors hover:bg-primary-container"
    >
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-surface-variant">
        {icon}
      </span>
      {label}
    </Link>
  );
}

function SocialLink({
  href, icon, label, sub,
}: { href: string; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors hover:bg-secondary-container"
    >
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-surface-variant">
        {icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </span>
    </a>
  );
}

function PrimaryNavigation() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/", label: "Katalog" },
    { to: "/ai", label: "AI Chat" },
    { to: "/request", label: "Ajukan" },
    { to: "/about", label: "Tentang" },
  ];

  return (
    <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
      {items.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              active
                ? "bg-primary-container text-on-primary-container"
                : "text-foreground hover:bg-surface-variant"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
