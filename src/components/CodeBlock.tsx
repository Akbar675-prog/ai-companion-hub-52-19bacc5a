import { useMemo, useState } from "react";

/* ---------- Ikon (dikonversi dari vector drawable) ---------- */

function HandIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.58 7.634c-1.126 -2.933 -4.539 -4.418 -7.667 -3.218 -3.127 1.2 -4.67 4.586 -3.543 7.519 0.13 0.338 0.29 0.656 0.475 0.952a1 1 0 1 1 -1.697 1.06 7.55 7.55 0 0 1 -0.646 -1.296c-1.547 -4.027 0.6 -8.53 4.694 -10.102 4.095 -1.57 8.706 0.34 10.253 4.369 0.034 0.09 0.067 0.18 0.098 0.27a1 1 0 1 1 -1.894 0.646 5.507 5.507 0 0 0 -0.072 -0.2ZM11 9.66a1 1 0 0 0 -1.869 0.716l2.152 5.602a1 1 0 0 1 -1.238 1.311l-1.127 -0.358c-0.793 -0.216 -1.33 0.016 -1.648 0.349l3.394 2.967a1 1 0 1 1 -1.318 1.506l-3.509 -3.069c-0.538 -0.47 -0.975 -1.442 -0.382 -2.328 0.646 -0.965 1.81 -1.63 3.257 -1.49l-1.45 -3.773a3.002 3.002 0 0 1 5.605 -2.15l1.073 2.791c0.92 -0.324 1.84 -0.535 2.72 -0.592 1.188 -0.077 2.368 0.125 3.337 0.787 2.015 1.378 2.506 4.237 1.486 8.313a1 1 0 0 1 -1.942 -0.485c0.982 -3.923 0.222 -5.564 -0.675 -6.177 -0.487 -0.334 -1.178 -0.5 -2.077 -0.442 -0.897 0.058 -1.933 0.337 -3.019 0.813a1.001 1.001 0 0 1 -1.336 -0.557L10.999 9.66Zm-3.847 7.517l0.001 0.001 -0.001 -0.002Z"
      />
    </svg>
  );
}

function CodeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M7.7929,9.0429C8.1834,8.6524 8.8166,8.6524 9.2071,9.0429L11.4571,11.2929C11.8476,11.6834 11.8476,12.3166 11.4571,12.7071L9.2071,14.9571C8.8166,15.3476 8.1834,15.3476 7.7929,14.9571C7.4024,14.5666 7.4024,13.9334 7.7929,13.5429L9.3358,12L7.7929,10.4571C7.4024,10.0666 7.4024,9.4334 7.7929,9.0429ZM12.25,14.25C12.25,13.6977 12.6977,13.25 13.25,13.25H15.5C16.0523,13.25 16.5,13.6977 16.5,14.25C16.5,14.8023 16.0523,15.25 15.5,15.25H13.25C12.6977,15.25 12.25,14.8023 12.25,14.25Z" />
      <path d="M2,8C2,5.7909 3.7909,4 6,4C6.5523,4 7,4.4477 7,5C7,5.5523 6.5523,6 6,6C4.8954,6 4,6.8954 4,8V16C4,17.1046 4.8954,18 6,18C6.5523,18 7,18.4477 7,19C7,19.5523 6.5523,20 6,20C3.7909,20 2,18.2091 2,16V8ZM17,5C17,4.4477 17.4477,4 18,4C20.2091,4 22,5.7909 22,8V16C22,18.2091 20.2091,20 18,20C17.4477,20 17,19.5523 17,19C17,18.4477 17.4477,18 18,18C19.1046,18 20,17.1046 20,16V8C20,6.8954 19.1046,6 18,6C17.4477,6 17,5.5523 17,5Z" />
    </svg>
  );
}

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M5.75 6.274c0-1.987 2.206-3.179 3.868-2.092l8.759 5.726c1.509 0.987 1.509 3.199 0 4.186L9.618 19.82c-1.663 1.088-3.868-0.106-3.868-2.092V6.274zm2 11.454c0 0.397 0.441 0.636 0.773 0.419l8.759-5.727c0.302-0.197 0.302-0.641 0-0.838L8.523 5.856C8.191 5.638 7.75 5.877 7.75 6.274v11.454z" />
    </svg>
  );
}

function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.2002 1.93994C20.2987 1.94005 21.9999 3.64122 22 5.73975V13.1401C21.9999 15.2387 20.2987 16.9398 18.2002 16.9399H17V18.1401C16.9999 20.2387 15.2987 21.9398 13.2002 21.9399H5.7998C3.70128 21.9398 2.00011 20.2387 2 18.1401V10.7397C2.00011 8.64122 3.70128 6.94005 5.7998 6.93994H7V5.73975C7.00011 3.64122 8.70128 1.94005 10.7998 1.93994H18.2002ZM5.7998 8.93994C4.80585 8.94005 4.00011 9.74579 4 10.7397V18.1401C4.00011 19.1341 4.80585 19.9398 5.7998 19.9399H13.2002C14.1942 19.9398 14.9999 19.1341 15 18.1401V10.7397C14.9999 9.74579 14.1942 8.94005 13.2002 8.93994H5.7998ZM10.7998 3.93994C9.80585 3.94005 9.00011 4.74579 9 5.73975V6.93994H13.2002C15.2987 6.94005 16.9999 8.64122 17 10.7397V14.9399H18.2002C19.1942 14.9398 19.9999 14.1341 20 13.1401V5.73975C19.9999 4.74579 19.1942 3.94005 18.2002 3.93994H10.7998Z"
      />
    </svg>
  );
}

/* ---------- Pewarnaan sederhana (ikut tema) ---------- */

type Tok = { t: string; c: string };

const C = {
  tag: "text-[#c0387a] dark:text-[#ff4f8b]",
  attr: "text-[#3f7d18] dark:text-[#c3e88d]",
  str: "text-[#0d7490] dark:text-[#89ddff]",
  cmt: "text-[#8b8f98] dark:text-[#6b7280]",
  kw: "text-[#2f5fd0] dark:text-[#82aaff]",
  fn: "text-[#9a6700] dark:text-[#ffcb6b]",
  txt: "text-[#24292f] dark:text-[#e6e6e6]",
};

const KEYWORDS =
  /\b(function|return|const|let|var|if|else|for|while|new|class|import|export|from|await|async|try|catch|typeof|of|in|null|true|false|def|print|self)\b/;
const MAX_HIGHLIGHT_CHARS = 50_000;

function tokenize(code: string): Tok[] {
  const re =
    /(<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(<\/?[A-Za-z][\w-]*|\/?>)|([A-Za-z_][\w-]*)(?=\s*=)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g;
  const out: Tok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push({ t: code.slice(last, m.index), c: C.txt });
    const [full, cmt, str, tag, attr, fn, word] = m;
    if (cmt) out.push({ t: full, c: C.cmt });
    else if (str) out.push({ t: full, c: C.str });
    else if (tag) out.push({ t: full, c: C.tag });
    else if (attr) out.push({ t: full, c: C.attr });
    else if (fn) out.push({ t: full, c: KEYWORDS.test(fn) ? C.kw : C.fn });
    else if (word) out.push({ t: full, c: KEYWORDS.test(word) ? C.kw : C.txt });
    last = m.index + full.length;
  }
  if (last < code.length) out.push({ t: code.slice(last), c: C.txt });
  return out;
}

/* ---------- Komponen utama ---------- */

export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"code" | "preview">("code");
  const language = (lang || "").toLowerCase();
  const isHtml =
    language === "html" ||
    language === "htm" ||
    (!language && /<html[\s>]|<!doctype html/i.test(code));

  const tokens = useMemo(
    () => (code.length > MAX_HIGHLIGHT_CHARS ? [{ t: code, c: C.txt }] : tokenize(code)),
    [code],
  );
  const preview = isHtml && mode === "preview";

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  const pillBtn =
    "inline-flex size-8 items-center justify-center rounded-full transition-colors";
  const idleBtn =
    "text-foreground/70 hover:bg-foreground/10 hover:text-foreground";
  const activeBtn = "bg-foreground text-background";

  return (
    <div className="my-2 overflow-hidden rounded-3xl bg-muted/50 ring-1 ring-border dark:bg-[#0b0b0d] dark:ring-white/10">
      <div className="flex items-center justify-between gap-3 bg-muted px-4 py-2.5 dark:bg-[#141416]">
        <div className="flex min-w-0 items-center gap-2 text-foreground/85">
          <HandIcon className="size-5 shrink-0" />
          <span className="truncate text-xs font-bold uppercase tracking-wider">
            {language || (isHtml ? "html" : "code")}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-foreground/10 p-1">
          <button
            type="button"
            onClick={copy}
            aria-label="Salin kode"
            className={`${pillBtn} ${idleBtn}`}
          >
            {copied ? (
              <span className="text-[10px] font-semibold">OK</span>
            ) : (
              <CopyIcon className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMode("code")}
            aria-label="Lihat kode asli"
            aria-pressed={!preview}
            className={`${pillBtn} ${!preview ? activeBtn : idleBtn}`}
          >
            <CodeIcon className="size-4" />
          </button>
          {isHtml && (
            <button
              type="button"
              onClick={() => setMode((m) => (m === "preview" ? "code" : "preview"))}
              aria-label={preview ? "Tutup pratinjau" : "Jalankan pratinjau"}
              aria-pressed={preview}
              className={`${pillBtn} ${preview ? activeBtn : idleBtn}`}
            >
              <PlayIcon className="size-4" />
            </button>
          )}
        </div>
      </div>

      {preview ? (
        <iframe
          title="Pratinjau HTML"
          sandbox="allow-scripts allow-modals allow-forms"
          srcDoc={code}
          className="h-80 w-full border-0 bg-white"
        />
      ) : (
        <div className="relative">
          {/* Efek blur lembut di tepi atas kode */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-muted/80 to-transparent backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,black,transparent)] dark:from-[#141416]/90"
          />
          <pre className="m-0 overflow-x-auto px-4 py-3 text-[12.5px] leading-relaxed">
            <code className="font-mono">
              {tokens.map((t, i) => (
                <span key={i} className={t.c}>
                  {t.t}
                </span>
              ))}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}

