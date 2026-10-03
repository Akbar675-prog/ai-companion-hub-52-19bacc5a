import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Check, ChevronDown, Copy, Download, Globe, RefreshCw, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { AiAvatar } from "@/components/ui/plasma-shader";
import { CodeBlock } from "@/components/CodeBlock";

import { ShiningText } from "@/components/ui/shining-text";
import { faviconOf, hostOf, type ChatMessage } from "@/lib/ai-history";

function SourcesSheet({
  sources,
  onClose,
}: {
  sources: NonNullable<ChatMessage["sources"]>;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Tutup hasil pencarian"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <div className="relative flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-card shadow-2xl duration-200 animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <span className="w-8" />
          <h2 className="font-display text-lg">Hasil Pencarian</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full bg-surface-variant p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <ol className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-8">
          {sources.map((s, i) => (
            <li key={s.link}>
              <a
                href={s.link}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="block space-y-1"
              >
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <img src={faviconOf(s.link)} alt="" className="size-4 rounded-full" loading="lazy" />
                  <span className="truncate font-medium text-foreground">{hostOf(s.link)}</span>
                  <span className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-variant text-[11px]">
                    {i + 1}
                  </span>
                </span>
                <span className="block text-sm font-medium leading-snug">
                  {s.title || hostOf(s.link)}
                </span>
                {s.snippet && (
                  <span className="line-clamp-2 block text-sm text-muted-foreground">
                    {s.snippet}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </div>,
    document.body,
  );
}

function SourcesPill({ sources }: { sources: NonNullable<ChatMessage["sources"]> }) {
  const [open, setOpen] = useState(false);
  const icons = sources.slice(0, 3);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-variant"
      >
        <span className="flex -space-x-1.5">
          {icons.map((s) => (
            <img
              key={s.link}
              src={faviconOf(s.link)}
              alt=""
              className="size-4 rounded-full bg-background ring-1 ring-border"
              loading="lazy"
            />
          ))}
          {icons.length === 0 && <Globe className="size-4" />}
        </span>
        <span>Baca {sources.length} halaman web</span>
        <ChevronDown className="size-4 -rotate-90" />
      </button>

      {open && <SourcesSheet sources={sources} onClose={() => setOpen(false)} />}
    </>
  );
}


function Reasoning({
  text,
  seconds,
  live,
  sources,
}: {
  text: string;
  seconds?: number;
  live?: boolean;
  sources?: ChatMessage["sources"];
}) {
  const [open, setOpen] = useState(!!live);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {live ? (
          <ShiningText text="Sedang berpikir..." />
        ) : (
          `Berpikir selama ${seconds ?? 1} detik`
        )}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-l-2 border-border pl-3 text-muted-foreground">
          <MarkdownBody text={text} sources={sources} muted />
        </div>
      )}
    </div>
  );
}


/** Nama situs pendek dari judul hasil pencarian (fallback: hostname). */
function siteNameOf(source: { title?: string; link: string }) {
  const raw = (source.title ?? "").split(/\s+[-–—|·]\s+/).filter(Boolean);
  const name = (raw.length > 1 ? raw[raw.length - 1] : raw[0]) ?? "";
  const clean = name.trim();
  if (!clean || clean.length > 28) return hostOf(source.link);
  return clean;
}

/** Pill sitasi inline: [logo] [nama situs] + [nomor hasil]. */
function CitationPill({
  source,
  index,
}: {
  source: NonNullable<ChatMessage["sources"]>[number];
  index: number;
}) {
  return (
    <a
      href={source.link}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={source.title || source.link}
      className="mx-0.5 inline-flex max-w-[14rem] translate-y-[1px] items-center gap-1 rounded-full border border-border/70 bg-surface-variant py-0.5 pl-1 pr-1.5 align-baseline text-[11px] font-medium leading-none text-foreground no-underline transition-colors hover:bg-primary-container"
    >
      <img
        src={faviconOf(source.link)}
        alt=""
        className="size-3.5 shrink-0 rounded-full bg-background"
        loading="lazy"
      />
      <span className="truncate">{siteNameOf(source)}</span>
      <span className="shrink-0 text-muted-foreground">+{index}</span>
    </a>
  );
}

function MarkdownBody({
  text,
  sources,
  muted,
}: {
  text: string;
  sources?: ChatMessage["sources"];
  muted?: boolean;
}) {
  // Rapikan keluaran model: hilangkan baris kosong berlebih dan spasi ekor
  // yang membuat jarak antar paragraf terlihat kepanjangan.
  const clean = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    // Baris tabel yang menempel jadi satu baris dipisah lagi supaya GFM
    // bisa mengenalinya sebagai tabel, bukan paragraf berisi garis "|---|".
    .replace(/\|\s+(?=\|)/g, "|\n")
    // Ubah rujukan [1] menjadi tautan khusus supaya bisa dirender jadi pill.
    .replace(/\[(\d{1,2})\](?!\()/g, (m, n: string) => {
      const idx = Number(n);
      return sources && sources[idx - 1] ? `[cite-${idx}](#cite-${idx})` : m;
    });

  return (
    <div
      className={`max-w-none space-y-3 text-sm leading-relaxed [overflow-wrap:anywhere] ${
        muted ? "text-muted-foreground" : "text-foreground"
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="my-1 w-full overflow-x-auto rounded-2xl border border-border/70">
              <table className="w-full border-collapse text-left text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-variant">{children}</thead>,
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/70">{children}</tbody>
          ),
          tr: ({ children }) => <tr className="align-top">{children}</tr>,
          th: ({ children }) => (
            <th className="whitespace-nowrap px-3 py-2 font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="px-3 py-2">{children}</td>,


          p: ({ children }) => <p className="my-0">{children}</p>,
          h1: ({ children }) => (
            <h3 className="mt-1 font-display text-lg leading-snug">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="mt-1 font-display text-base leading-snug">{children}</h3>
          ),
          h3: ({ children }) => <h4 className="mt-1 text-sm font-semibold">{children}</h4>,
          ul: ({ children }) => <ul className="my-0 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-0 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          a: ({ children, href }) => {
            const m = /^#cite-(\d{1,2})$/.exec(href ?? "");
            const src = m ? sources?.[Number(m[1]) - 1] : undefined;
            if (m && src) return <CitationPill source={src} index={Number(m[1])} />;
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-primary underline underline-offset-2"
              >
                {children}
              </a>
            );
          },

          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) =>
            className ? (
              <CodeBlock
                code={String(children).replace(/\n$/, "")}
                lang={/language-([\w-]+)/.exec(className)?.[1]}
              />
            ) : (
              <code className="rounded bg-surface-variant px-1 py-0.5 text-[0.85em]">
                {children}
              </code>
            ),
          pre: ({ children }) => <div className="my-0">{children}</div>,

          hr: () => <hr className="border-border" />,
        }}
      >
        {clean}
      </ReactMarkdown>
    </div>
  );
}

/** Gambar hasil AI + tombol unduh (nama file = id gambar). */
function GeneratedImage({ url, prompt }: { url: string; prompt?: string }) {
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const id = url.split("/").pop()?.split("?")[0] || "ai-image";
      const res = await fetch(url);
      const blob = await res.blob();
      const type = blob.type || "image/png";
      const ext = type.includes("webp") ? "webp" : type.includes("jpeg") ? "jpg" : "png";
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 4000);
    } catch {
      window.open(url, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative aspect-square w-full max-w-[320px] overflow-hidden rounded-[28px] bg-surface-variant">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center" aria-label="Memuat gambar">
          <m3e-loading-indicator className="m3-loading-lg" aria-label="Memuat gambar" />
        </div>
      )}
      <img
        src={url}
        alt={prompt || "Gambar hasil AI"}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
      />
      <button
        type="button"
        onClick={() => void download()}
        disabled={busy}
        aria-label="Unduh gambar"
        className={`absolute bottom-3 right-3 inline-flex size-10 items-center justify-center rounded-full bg-foreground/70 text-background backdrop-blur-sm transition hover:bg-foreground/85 active:scale-95 disabled:opacity-60 ${loaded ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {busy ? <m3e-loading-indicator variant="contained" className="m3-loading-sm" aria-label="Menyiapkan unduhan" /> : <Download className="size-5" />}
      </button>
    </div>
  );
}


export function AiMessage({
  message,

  streaming,
  onRegenerate,
}: {
  message: ChatMessage;
  streaming?: boolean;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="flex gap-2">
      <AiAvatar className="mt-1 size-7 shrink-0" />
      <div className="min-w-0 max-w-full flex-1 space-y-2">
        {message.reasoning && (
          <Reasoning
            text={message.reasoning}
            seconds={message.thoughtSeconds}
            live={streaming && !message.content}
            sources={message.sources}
          />
        )}


        {!message.reasoning && typeof message.thoughtSeconds === "number" && (
          <p className="text-sm text-muted-foreground">
            {message.analyzedImage ? "Menganalisis gambar · " : ""}Berpikir selama{" "}
            {message.thoughtSeconds} detik
          </p>
        )}

        {message.content && (
          <MarkdownBody text={message.content} sources={message.sources} />
        )}


        {message.imageUrl && <GeneratedImage url={message.imageUrl} prompt={message.imagePrompt} />}

        {message.sources && message.sources.length > 0 && <SourcesPill sources={message.sources} />}



        {!streaming && message.content && (
          <div className="flex items-center gap-1 pt-0.5 text-muted-foreground">
            <button
              type="button"
              onClick={() => void copy()}
              aria-label="Salin pesan"
              className="rounded-full p-2 transition-colors hover:bg-surface-variant hover:text-foreground"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => setVote((v) => (v === "up" ? null : "up"))}
              aria-label="Jawaban bagus"
              className={`rounded-full p-2 transition-colors hover:bg-surface-variant hover:text-foreground ${
                vote === "up" ? "text-primary" : ""
              }`}
            >
              <ThumbsUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setVote((v) => (v === "down" ? null : "down"))}
              aria-label="Jawaban kurang"
              className={`rounded-full p-2 transition-colors hover:bg-surface-variant hover:text-foreground ${
                vote === "down" ? "text-destructive" : ""
              }`}
            >
              <ThumbsDown className="size-4" />
            </button>
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                aria-label="Ulangi jawaban"
                className="rounded-full p-2 transition-colors hover:bg-surface-variant hover:text-foreground"
              >
                <RefreshCw className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
