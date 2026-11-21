import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ImageOff } from "lucide-react";
import { emptyScope, evalExpr, type Attr, type GBlock, type GNode, type Scope } from "@/lib/genui";

/* ───────────────────── Pencari gambar (AsyncImage) ───────────────────── */

/** `ratio` = lebar/tinggi bingkai (mis. 0.75 untuk 3:4). Pilih gambar yang bentuknya paling mendekati. */
export type ImageResolver = (query: string, ratio: number) => Promise<string | null>;

/** Default: GET /api/image-search?q=... → { url }. Ganti lewat configureGenUiImages(). */
let resolver: ImageResolver = async (query, ratio) => {
  const res = await fetch(`/api/image-search?q=${encodeURIComponent(query)}&ratio=${ratio.toFixed(3)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string | null };
  return data.url ?? null;
};

const imageCache = new Map<string, Promise<string | null>>();

export function configureGenUiImages(fn: ImageResolver) {
  resolver = fn;
  imageCache.clear();
}

function ratioOf(ratio?: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/.exec((ratio ?? "").trim());
  return m ? Number(m[1]) / Number(m[2]) : 1;
}

function resolveImage(query: string, ratio?: string) {
  const r = ratioOf(ratio);
  const key = `${query}|${r < 0.85 ? "potret" : r > 1.2 ? "lanskap" : "kotak"}`;
  let p = imageCache.get(key);
  if (!p) {
    p = resolver(query, r).catch(() => null);
    imageCache.set(key, p);
  }
  return p;
}

/* ───────────────────── Helper gaya ───────────────────── */

type Props = Record<string, unknown>;

const ALIGN: Record<string, string> = {
  start: "flex-start",
  end: "flex-end",
  center: "center",
  stretch: "stretch",
  between: "space-between",
  around: "space-around",
  baseline: "baseline",
};

/** Angka → kelipatan 4px (gap={3} = 12px), string CSS dipakai apa adanya. */
function sp(v: unknown): string | number | undefined {
  if (v == null || v === false) return undefined;
  if (typeof v === "number") return v * 4;
  const s = String(v);
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) * 4 : s;
}

function cssSize(v: unknown): string | number | undefined {
  if (v == null) return undefined;
  const s = String(v);
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : s;
}

const RADIUS: Record<string, string> = {
  none: "rounded-none",
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
  full: "rounded-full",
};

const TEXT_SIZE: Record<string, string> = {
  xs: "text-xs",
  sm: "text-[13px]",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

const TEXT_COLOR: Record<string, string> = {
  primary: "text-primary",
  secondary: "text-muted-foreground",
  tertiary: "text-muted-foreground/70",
  subtle: "text-muted-foreground/70",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-destructive",
  error: "text-destructive",
};

const TEXT_WEIGHT: Record<string, string> = {
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const BADGE_COLOR: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  danger: "bg-destructive/15 text-destructive",
  error: "bg-destructive/15 text-destructive",
  info: "bg-primary/15 text-primary",
  primary: "bg-primary/15 text-primary",
};

function layoutStyle(p: Props, dir: "row" | "col"): CSSProperties {
  const d = p.direction === "row" ? "row" : p.direction === "col" || p.direction === "column" ? "column" : dir === "row" ? "row" : "column";
  return {
    display: "flex",
    flexDirection: d,
    gap: sp(p.gap),
    padding: sp(p.padding),
    alignItems: ALIGN[String(p.align)] ?? (p.align as string | undefined),
    justifyContent: ALIGN[String(p.justify)] ?? (p.justify as string | undefined),
    flex: p.flex as CSSProperties["flex"],
    width: cssSize(p.width),
    maxWidth: cssSize(p.maxWidth),
    minWidth: 0,
    flexWrap: p.wrap ? "wrap" : undefined,
  };
}

function boxClass(p: Props) {
  return [
    p.border ? "border border-border/70" : "",
    RADIUS[String(p.radius)] ?? "",
    p.surface || p.tone === "subtle" ? "bg-surface-variant" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function inline(text: string, keyBase: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={`${keyBase}${i}`} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return <code key={`${keyBase}${i}`} className="font-mono text-[0.9em] text-primary">{part.slice(1, -1)}</code>;
    return <Fragment key={`${keyBase}${i}`}>{part}</Fragment>;
  });
}

function stringify(v: unknown): string {
  if (v == null || typeof v === "function" || typeof v === "boolean") return "";
  if (Array.isArray(v)) return v.map(stringify).join(", ");
  if (typeof v === "object") return "";
  return String(v);
}

function readProps(attrs: Attr[], scope: Scope): Props {
  const o: Props = {};
  for (const a of attrs) {
    o[a.name] = a.kind === "bool" ? true : a.kind === "str" ? a.value : evalExpr(a.value, scope);
  }
  return o;
}

/* ───────────────────── Radio ───────────────────── */

const RadioCtx = createContext<{ value: unknown; onChange?: (v: unknown) => void }>({ value: undefined });

function Radio({ value, children }: { value: unknown; children: ReactNode }) {
  const g = useContext(RadioCtx);
  const checked = String(g.value) === String(value);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={() => g.onChange?.(value)}
      className="flex w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left text-sm transition-colors hover:bg-surface-variant"
    >
      <span
        className={`grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
          checked ? "border-primary" : "border-muted-foreground/50"
        }`}
      >
        {checked && <span className="size-2.5 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </button>
  );
}

/* ───────────────────── AsyncImage ───────────────────── */

function AsyncImageView({ query, ratio, width, maxWidth, radius, fill, alt }: {
  query: string;
  ratio?: string;
  width?: unknown;
  maxWidth?: unknown;
  radius?: string;
  fill?: boolean;
  alt?: string;
}) {
  const [src, setSrc] = useState<string | null | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let off = false;
    setSrc(undefined);
    setLoaded(false);
    if (!query) { setSrc(null); return; }
    void resolveImage(query, ratio).then((u) => { if (!off) setSrc(u); });
    return () => { off = true; };
  }, [query, ratio]);

  const style: CSSProperties = fill
    ? { width: "100%", height: "100%" }
    : {
        width: cssSize(width) ?? "100%",
        maxWidth: cssSize(maxWidth),
        aspectRatio: ratio ? ratio.replace(":", "/") : "1 / 1",
        flexShrink: 0,
        alignSelf: "flex-start", // cegah bingkai melar saat baris memakai align stretch
      };

  return (
    <div
      style={style}
      className={`relative overflow-hidden bg-surface-variant ${RADIUS[String(radius)] ?? "rounded-xl"} ${
        src === undefined || (src && !loaded) ? "animate-pulse" : ""
      }`}
    >
      {src === null && (
        <div className="absolute inset-0 grid place-items-center text-muted-foreground/60">
          <ImageOff className="size-5" aria-hidden="true" />
        </div>
      )}
      {src && (
        <img
          src={src}
          alt={alt || query}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setSrc(null)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}

/* ───────────────────── Render node ───────────────────── */

type Ctx = { issueTurn: (text: string) => void };
type Mode = "block" | "inline";

function isRunNode(n: GNode) {
  return n.t === "text" || n.t === "expr";
}

function renderChildren(nodes: GNode[], scope: Scope, mode: Mode, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i];

    if (isRunNode(n)) {
      let raw = "";
      const start = i;
      while (i < nodes.length && isRunNode(nodes[i])) {
        const r = nodes[i];
        raw += r.t === "text" ? r.v : r.t === "expr" ? stringify(evalExpr(r.code, scope)) : "";
        i++;
      }
      const text = raw.replace(/\s+/g, " ").trim();
      if (!text) continue;
      const k = `${key}.${start}`;
      if (mode === "inline") out.push(<Fragment key={k}>{inline(text, k)}</Fragment>);
      else {
        const isTitle = /^\d+[.)]\s/.test(text);
        out.push(
          <div key={k} className={`[overflow-wrap:anywhere] ${isTitle ? "font-semibold" : ""}`}>
            {inline(text, k)}
          </div>,
        );
      }
      continue;
    }

    if (n.t === "each") {
      const list = evalExpr(n.code, scope);
      const items = Array.isArray(list) ? list.slice(0, 200) : [];
      items.forEach((item, idx) => {
        const inner: Scope = Object.assign(emptyScope(), scope);
        inner[n.item] = item;
        if (n.index) inner[n.index] = idx;
        out.push(<Fragment key={`${key}.${i}.${idx}`}>{renderChildren(n.children, inner, mode, `${key}.${i}.${idx}`)}</Fragment>);
      });
      i++;
      continue;
    }

    if (n.t === "el") out.push(renderEl(n, scope, `${key}.${i}`, mode));
    i++;
  }
  return out;
}

function renderEl(n: Extract<GNode, { t: "el" }>, scope: Scope, key: string, mode: Mode): ReactNode {
  const p = readProps(n.attrs, scope);

  switch (n.tag) {
    case "box":
    case "col":
    case "stack":
      return (
        <div key={key} style={layoutStyle(p, "col")} className={boxClass(p)}>
          {renderChildren(n.children, scope, "block", key)}
        </div>
      );

    case "row":
      return (
        <div key={key} style={layoutStyle(p, "row")} className={boxClass(p)}>
          {renderChildren(n.children, scope, "block", key)}
        </div>
      );

    case "text":
    case "title":
    case "heading":
    case "caption": {
      const heading = n.tag === "title" || n.tag === "heading";
      const cls = [
        TEXT_SIZE[String(p.size)] ?? (heading ? "text-base" : "text-sm"),
        TEXT_COLOR[String(p.color)] ?? "",
        TEXT_WEIGHT[String(p.weight)] ?? (heading ? "font-semibold" : ""),
        "[overflow-wrap:anywhere]",
      ].join(" ");
      const Tag = mode === "inline" ? "span" : "div";
      return <Tag key={key} className={cls}>{renderChildren(n.children, scope, "inline", key)}</Tag>;
    }

    case "badge":
    case "chip": {
      const color = BADGE_COLOR[String(p.color)] ?? "bg-surface-variant text-foreground";
      return (
        <span
          key={key}
          className={`inline-flex w-fit shrink-0 items-center self-start rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5 ${color}`}
        >
          {renderChildren(n.children, scope, "inline", key)}
        </span>
      );
    }

    case "divider":
      return <hr key={key} className={`w-full border-t ${p.color === "subtle" ? "border-border/50" : "border-border"}`} />;

    case "asyncimage":
      return (
        <AsyncImageView
          key={key}
          query={stringify(p.query)}
          ratio={p.aspectRatio ? String(p.aspectRatio) : undefined}
          width={p.width}
          maxWidth={p.maxWidth}
          radius={p.radius ? String(p.radius) : undefined}
          alt={p.alt ? String(p.alt) : undefined}
        />
      );

    case "asyncimagegroup": {
      const layout = String(p.layout ?? "grid");
      const bento = layout === "bento";
      const imgs = n.children.filter((c): c is Extract<GNode, { t: "el" }> => c.t === "el" && c.tag === "asyncimage");
      return (
        <div
          key={key}
          className="grid w-full gap-1.5 overflow-hidden rounded-2xl"
          style={{
            gridTemplateColumns: bento ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))",
            gridAutoRows: bento ? "88px" : "120px",
            maxWidth: cssSize(p.maxWidth),
          }}
        >
          {imgs.slice(0, bento ? 5 : 6).map((img, idx) => {
            const ip = readProps(img.attrs, scope);
            const big = bento && idx === 0;
            return (
              <div
                key={`${key}.${idx}`}
                className="min-h-0 min-w-0"
                style={big ? { gridColumn: "span 2", gridRow: "span 2" } : undefined}
              >
                <AsyncImageView fill ratio={bento ? "1:1" : "4:3"} query={stringify(ip.query)} radius="none" alt={ip.alt ? String(ip.alt) : undefined} />
              </div>
            );
          })}
        </div>
      );
    }

    case "radio-group": {
      const onChange = typeof p.onChange === "function" ? (p.onChange as (v: unknown) => void) : undefined;
      const row = p.direction === "row";
      return (
        <RadioCtx.Provider key={key} value={{ value: p.value, onChange }}>
          <div
            role="radiogroup"
            className={row ? "flex flex-wrap gap-x-3" : "flex flex-col"}
            style={{ gap: sp(p.gap) }}
          >
            {renderChildren(n.children, scope, "block", key)}
          </div>
        </RadioCtx.Provider>
      );
    }

    case "radio":
      return (
        <Radio key={key} value={p.value}>
          {renderChildren(n.children, scope, "inline", key)}
        </Radio>
      );

    case "button": {
      const onClick = typeof p.onClick === "function" ? (p.onClick as () => void) : undefined;
      const variant = String(p.variant ?? "primary");
      const look =
        variant === "outline" || variant === "secondary"
          ? "border border-border bg-card text-foreground hover:bg-surface-variant"
          : "bg-primary text-primary-foreground hover:opacity-90";
      return (
        <button
          key={key}
          type="button"
          disabled={!onClick || p.disabled === true}
          onClick={() => {
            try {
              onClick?.();
            } catch (err) {
              console.warn("[GenUI] onClick gagal:", err);
            }
          }}
          className={`min-h-11 rounded-full px-5 py-2.5 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 ${look} ${
            p.block ? "w-full" : "self-start"
          }`}
        >
          {renderChildren(n.children, scope, "inline", key)}
        </button>
      );
    }

    default:
      // Tag tak dikenal: tampilkan isinya saja supaya tidak error.
      return (
        <div key={key} className="flex flex-col gap-1">
          {renderChildren(n.children, scope, "block", key)}
        </div>
      );
  }
}

/* ───────────────────── Komponen utama ───────────────────── */

export function GenUiBlock({
  block,
  onIssueTurn,
}: {
  block: GBlock;
  onIssueTurn?: (text: string) => void;
}) {
  const [vars, setVars] = useState<Scope>(() => {
    const o = emptyScope();
    for (const d of block.decls) o[d.name] = evalExpr(d.init, emptyScope());
    return o;
  });

  const scope = useMemo(() => {
    const s: Scope = Object.assign(emptyScope(), vars);
    for (const d of block.decls) {
      s[d.setter] = (v: unknown) =>
        setVars((prev) => {
          const next = Object.assign(emptyScope(), prev);
          next[d.name] = typeof v === "function" ? (v as (x: unknown) => unknown)(prev[d.name]) : v;
          return next;
        });
    }
    s.GenUI = {
      issueNewTurn: (text: unknown) => {
        const t = String(text ?? "").trim();
        if (!t) return;
        if (onIssueTurn) onIssueTurn(t);
        else window.dispatchEvent(new CustomEvent("genui:new-turn", { detail: { text: t } }));
      },
    };
    return s;
  }, [vars, block.decls, onIssueTurn]);

  return <div className="w-full min-w-0 text-sm text-foreground">{renderChildren(block.nodes, scope, "block", "g")}</div>;
}

