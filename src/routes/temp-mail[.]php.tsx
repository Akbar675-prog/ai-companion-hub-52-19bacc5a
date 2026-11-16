import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Mail, RefreshCw, Send } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { PressButton } from "@/components/Pressable";

const STORAGE_KEY = "galileo-temp-mailboxes-v1";
const BROWSER_KEY = "galileo-temp-mail-browser-v1";
const DOMAIN = "@visora.my.id";
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? "";

type Mailbox = { address: string; token: string; expiresAt: string };
type Message = {
  id: string;
  sender: string;
  subject: string;
  body: string;
  received_at: string;
};
type Recaptcha = {
  render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void }) => number;
  getResponse: (widgetId?: number) => string;
  reset: (widgetId?: number) => void;
};

declare global {
  interface Window {
    grecaptcha?: Recaptcha;
    onTempMailRecaptchaLoad?: () => void;
  }
}

export const Route = createFileRoute("/temp-mail.php")({
  component: TempMailPage,
  head: () => ({
    meta: [
      { title: "Temp Mail Generator · Galileo" },
      { name: "description", content: "Buat inbox sementara untuk visora.my.id." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function readMailboxes(): Mailbox[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Mailbox[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.address === "string" && typeof item.token === "string" && Date.parse(item.expiresAt) > Date.now()).slice(-5)
      : [];
  } catch {
    return [];
  }
}

function browserId(): string {
  try {
    const existing = localStorage.getItem(BROWSER_KEY);
    if (existing && /^[A-Za-z0-9_-]{32,128}$/.test(existing)) return existing;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const value = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    localStorage.setItem(BROWSER_KEY, value);
    return value;
  } catch {
    return "";
  }
}

function TempMailPage() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [activeAddress, setActiveAddress] = useState("");
  const [localPart, setLocalPart] = useState("");
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState("");
  const captchaElement = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const browserIdRef = useRef("");

  useEffect(() => {
    const saved = readMailboxes();
    browserIdRef.current = browserId();
    setMailboxes(saved);
    setActiveAddress(saved[0]?.address ?? "");
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch { /* memory fallback */ }
    const timer = window.setInterval(() => {
      const active = readMailboxes();
      setMailboxes(active);
      setActiveAddress((current) => active.some((mailbox) => mailbox.address === current) ? current : active[0]?.address ?? "");
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(active)); } catch { /* memory fallback */ }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!SITE_KEY) return;
    if (window.grecaptcha) {
      setCaptchaReady(true);
      return;
    }
    window.onTempMailRecaptchaLoad = () => setCaptchaReady(true);
    let script = document.getElementById("temp-mail-recaptcha") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "temp-mail-recaptcha";
      script.src = "https://www.google.com/recaptcha/api.js?onload=onTempMailRecaptchaLoad&render=explicit";
      script.async = true;
      script.defer = true;
      script.onerror = () => setError("Gagal memuat reCAPTCHA. Coba muat ulang halaman.");
      document.head.appendChild(script);
    }
    return () => { window.onTempMailRecaptchaLoad = undefined; };
  }, []);

  useEffect(() => {
    if (!captchaReady || !captchaElement.current || !window.grecaptcha || widgetId.current !== null || !SITE_KEY) return;
    widgetId.current = window.grecaptcha.render(captchaElement.current, {
      sitekey: SITE_KEY,
      callback: (token) => setCaptchaToken(token),
      "expired-callback": () => setCaptchaToken(""),
    });
  }, [captchaReady]);

  const activeMailbox = mailboxes.find((mailbox) => mailbox.address === activeAddress);

  useEffect(() => {
    if (!activeMailbox) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/temp-mail/inbox", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ address: activeMailbox.address, token: activeMailbox.token }),
          cache: "no-store",
        });
        const result = await response.json() as { messages?: Message[]; error?: string };
        if (!response.ok) throw new Error(result.error || "Gagal memuat inbox.");
        if (!cancelled) {
          setMessages(result.messages ?? []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat inbox.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 12_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activeMailbox?.address, activeMailbox?.token]);

  async function generateMailbox(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const cleanLocalPart = localPart.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(cleanLocalPart)) {
      setError("Gunakan 2–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.");
      return;
    }
    if (mailboxes.length >= 5) {
      setError("Batas 5 inbox aktif di browser ini sudah tercapai.");
      return;
    }
    if (!browserIdRef.current) {
      setError("LocalStorage tidak tersedia. Aktifkan penyimpanan browser untuk membuat inbox.");
      return;
    }
    if (!captchaToken) {
      setError("Centang reCAPTCHA sebelum membuat inbox.");
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch("/api/temp-mail/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ localPart: cleanLocalPart, browserId: browserIdRef.current, captchaToken }),
      });
      const result = await response.json() as Mailbox & { error?: string };
      if (!response.ok) throw new Error(result.error || "Gagal membuat inbox.");
      const next = [...mailboxes.filter((mailbox) => Date.parse(mailbox.expiresAt) > Date.now()), {
        address: result.address,
        token: result.token,
        expiresAt: result.expiresAt,
      }].slice(-5);
      setMailboxes(next);
      setActiveAddress(result.address);
      setLocalPart("");
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* keep active mailbox for this page session */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat inbox.");
    } finally {
      setGenerating(false);
      setCaptchaToken("");
      if (widgetId.current !== null) window.grecaptcha?.reset(widgetId.current);
    }
  }

  async function refreshMailbox(mailbox = activeMailbox) {
    if (!mailbox) return;
    setLoading(true);
    try {
      const response = await fetch("/api/temp-mail/inbox", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: mailbox.address, token: mailbox.token }),
        cache: "no-store",
      });
      const result = await response.json() as { messages?: Message[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Gagal memuat inbox.");
      setMessages(result.messages ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat inbox.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!activeMailbox || !captchaToken) {
      setError("Pilih inbox dan selesaikan reCAPTCHA sebelum mengirim.");
      return;
    }
    setError("");
    setSendSuccess("");
    setSending(true);
    try {
      const response = await fetch("/api/temp-mail/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: activeMailbox.address,
          token: activeMailbox.token,
          to: recipient,
          subject,
          text: body,
          captchaToken,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Gagal mengirim email.");
      setRecipient("");
      setSubject("");
      setBody("");
      setShowComposer(false);
      setSendSuccess("Email berhasil dikirim.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim email.");
    } finally {
      setSending(false);
      setCaptchaToken("");
      if (widgetId.current !== null) window.grecaptcha?.reset(widgetId.current);
    }
  }

  async function copyAddress() {
    if (!activeMailbox) return;
    try {
      await navigator.clipboard.writeText(activeMailbox.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Tidak dapat menyalin alamat email.");
    }
  }

  const expiresLabel = activeMailbox
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(activeMailbox.expiresAt))
    : "";

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Tanpa login · Inbox sementara</p>
          <h1 className="mt-2 font-display text-3xl leading-tight md:text-4xl">Temp Mail Generator</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Buat alamat sementara di <span className="font-mono">visora.my.id</span>. Inbox dan pesan akan kedaluwarsa setelah 24 jam.
          </p>
        </header>

        <section className="m3-shadow-1 m3-hairline rounded-3xl bg-card p-5 sm:p-6" aria-labelledby="create-mailbox-heading">
          <h2 id="create-mailbox-heading" className="font-display text-xl">Buat alamat email</h2>
          <form className="mt-4 space-y-4" onSubmit={(event) => void generateMailbox(event)}>
            <label className="block text-sm font-medium" htmlFor="mail-local-part">Nama email</label>
            <div className="flex items-stretch">
              <input
                id="mail-local-part"
                value={localPart}
                onChange={(event) => setLocalPart(event.target.value)}
                placeholder="nama-email"
                autoComplete="off"
                maxLength={32}
                className="input min-w-0 flex-1 rounded-r-none"
                aria-describedby="mail-address-hint"
              />
              <span className="inline-flex items-center rounded-r-xl border border-l-0 border-border bg-surface-variant px-3 font-mono text-sm text-muted-foreground">{DOMAIN}</span>
            </div>
            <p id="mail-address-hint" className="text-xs text-muted-foreground">2–32 karakter; huruf kecil, angka, titik, garis bawah, atau tanda hubung.</p>
            {SITE_KEY ? (
              <>
                <div ref={captchaElement} aria-label="Verifikasi reCAPTCHA untuk membuat inbox atau mengirim email" />
                <p className="text-xs text-muted-foreground">Selesaikan reCAPTCHA sebelum membuat inbox atau mengirim email.</p>
              </>
            ) : (
              <p className="rounded-xl bg-secondary-container px-3 py-2 text-sm text-on-secondary-container">reCAPTCHA belum dikonfigurasi di server.</p>
            )}
            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <PressButton
              type="submit"
              disabled={generating || !SITE_KEY || !captchaReady || !captchaToken || mailboxes.length >= 5}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {generating ? <m3e-loading-indicator className="m3-loading-sm" aria-label="Membuat inbox" /> : <Mail aria-hidden="true" className="size-5" />}
              {generating ? "Membuat…" : "Generate"}
            </PressButton>
            <p className="text-xs text-muted-foreground">Inbox aktif: {mailboxes.length}/5 per browser. Batas IP diterapkan oleh server.</p>
          </form>
        </section>

        {mailboxes.length > 0 && (
          <section className="mt-6 grid gap-5 md:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.3fr)]">
            <div className="m3-shadow-1 m3-hairline rounded-3xl bg-card p-4">
              <h2 className="px-1 font-display text-lg">Inbox saya</h2>
              <ul className="mt-3 space-y-2">
                {mailboxes.map((mailbox) => (
                  <li key={mailbox.address}>
                    <button
                      type="button"
                      onClick={() => setActiveAddress(mailbox.address)}
                      aria-current={activeAddress === mailbox.address ? "true" : undefined}
                      className={`min-h-11 w-full truncate rounded-xl px-3 text-left font-mono text-xs transition-colors ${activeAddress === mailbox.address ? "bg-primary-container text-on-primary-container" : "hover:bg-surface-variant"}`}
                    >
                      {mailbox.address}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="m3-shadow-1 m3-hairline min-w-0 rounded-3xl bg-card p-5 sm:p-6">
              {activeMailbox ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-lg">Inbox</h2>
                      <p className="mt-1 break-all font-mono text-sm">{activeMailbox.address}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Kedaluwarsa {expiresLabel}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void copyAddress()} aria-label="Salin alamat email" className="inline-flex size-11 items-center justify-center rounded-full bg-surface-variant hover:bg-primary-container">
                        {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                      </button>
                      <button type="button" onClick={() => void refreshMailbox()} aria-label="Muat ulang inbox" className="inline-flex size-11 items-center justify-center rounded-full bg-surface-variant hover:bg-primary-container">
                        <RefreshCw aria-hidden="true" className={`size-4 ${loading ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowComposer((open) => !open); setError(""); setSendSuccess(""); }}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-container px-4 font-semibold text-on-primary-container hover:opacity-90"
                    >
                      <Send aria-hidden="true" className="size-4" />
                      {showComposer ? "Tutup formulir" : "Send Mail"}
                    </button>
                    {sendSuccess && <p role="status" className="text-sm text-muted-foreground">{sendSuccess}</p>}
                  </div>
                  {showComposer && (
                    <form className="mt-4 space-y-3 rounded-2xl border border-border/70 bg-background p-4" onSubmit={(event) => void sendMessage(event)}>
                      <label className="block text-sm font-medium" htmlFor="mail-recipient">Kirim ke</label>
                      <input
                        id="mail-recipient"
                        type="email"
                        required
                        maxLength={254}
                        value={recipient}
                        onChange={(event) => setRecipient(event.target.value)}
                        placeholder="tujuan@example.com"
                        className="input w-full"
                      />
                      <label className="block text-sm font-medium" htmlFor="mail-subject">Subjek</label>
                      <input
                        id="mail-subject"
                        required
                        maxLength={200}
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        className="input w-full"
                      />
                      <label className="block text-sm font-medium" htmlFor="mail-body">Pesan</label>
                      <textarea
                        id="mail-body"
                        required
                        maxLength={5000}
                        rows={5}
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        className="input w-full resize-y"
                        aria-describedby="mail-body-hint"
                      />
                      <p id="mail-body-hint" className="text-xs text-muted-foreground">Teks biasa, maksimal 5.000 karakter. Maksimal 5 email per inbox dalam 24 jam.</p>
                      {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
                      <PressButton
                        type="submit"
                        disabled={sending || !captchaToken || !captchaReady}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {sending ? <m3e-loading-indicator className="m3-loading-sm" aria-label="Mengirim email" /> : <Send aria-hidden="true" className="size-4" />}
                        {sending ? "Mengirim…" : "Kirim email"}
                      </PressButton>
                    </form>
                  )}
                  <div className="mt-5 space-y-3" aria-live="polite">
                    {loading && messages.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">Memuat email…</p>
                    ) : messages.length === 0 ? (
                      <div className="rounded-2xl bg-surface-variant/60 px-4 py-8 text-center">
                        <Mail aria-hidden="true" className="mx-auto size-7 text-muted-foreground" />
                        <p className="mt-2 text-sm font-medium">Belum ada email masuk</p>
                        <p className="mt-1 text-xs text-muted-foreground">Inbox diperbarui otomatis setiap 12 detik.</p>
                      </div>
                    ) : messages.map((message) => (
                      <article key={message.id} className="rounded-2xl border border-border/70 bg-background p-4">
                        <h3 className="break-words font-semibold">{message.subject || "(Tanpa subjek)"}</h3>
                        <p className="mt-1 break-all text-xs text-muted-foreground">Dari: {message.sender}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.received_at))}</p>
                        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words border-t border-border/70 pt-3 font-sans text-sm leading-relaxed">{message.body || "(Email tidak memiliki isi teks.)"}</pre>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">Pilih inbox untuk melihat email.</p>
              )}
            </div>
          </section>
        )}

        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Jangan gunakan inbox sementara untuk akun penting atau pemulihan kata sandi. Siapa pun yang memiliki token inbox pada browser ini dapat membaca pesannya.</p>
      </main>
    </>
  );
}
