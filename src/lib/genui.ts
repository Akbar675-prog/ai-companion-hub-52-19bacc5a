/**
 * GenUI parser + evaluator ekspresi aman (tanpa eval / new Function).
 * Mendukung: <box>, <row>, <text>, <badge>, <divider>, <AsyncImage>,
 * <AsyncImageGroup>, <radio-group>, <radio>, <button>, {expr},
 * {#each list as item, i}...{/each}, {@body const [x,setX] = DIL.useState(v)}.
 * Parser bersifat lenient: tag yang belum ditutup ditutup otomatis, tidak pernah melempar error.
 */

/* ───────────────────────── AST ───────────────────────── */

export type Attr = { name: string; kind: "str" | "expr" | "bool"; value: string };

export type GNode =
  | { t: "text"; v: string }
  | { t: "expr"; code: string }
  | { t: "el"; tag: string; attrs: Attr[]; children: GNode[] }
  | { t: "each"; code: string; item: string; index?: string; children: GNode[] };

export type StateDecl = { name: string; setter: string; init: string };
export type GBlock = { decls: StateDecl[]; nodes: GNode[]; end: number };
export type Segment = { type: "md"; text: string } | { type: "ui"; block: GBlock };

const TOP_TAGS = new Set([
  "box", "row", "col", "stack", "text", "badge", "chip", "divider",
  "asyncimage", "asyncimagegroup", "radio-group", "button",
]);
const VOID_TAGS = new Set(["divider", "asyncimage", "spacer"]);

const STARTER =
  /^[ \t]*(?:\{@body\b|\{#each\b|<(?:box|row|col|stack|text|badge|chip|divider|asyncimage|asyncimagegroup|radio-group|button)\b)/i;

/* ───────────────────────── Scanner ───────────────────────── */

function skipString(s: string, i: number): number {
  const q = s[i];
  i++;
  while (i < s.length) {
    if (s[i] === "\\") i += 2;
    else if (s[i] === q) return i + 1;
    else i++;
  }
  return s.length;
}

/** s[i] === "{" → indeks "}" pasangannya (peka string), atau -1. */
function matchBrace(s: string, i: number): number {
  let depth = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(s, i) - 1;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

type OpenTag = { tag: string; attrs: Attr[]; selfClose: boolean; end: number };

function parseOpenTag(s: string, i: number): OpenTag | null {
  const m = /^<([A-Za-z][\w-]*)/.exec(s.slice(i, i + 64));
  if (!m) return null;
  const tag = m[1];
  let j = i + m[0].length;
  const attrs: Attr[] = [];
  let selfClose = false;

  while (j < s.length) {
    while (j < s.length && /\s/.test(s[j])) j++;
    if (s[j] === ">") return { tag, attrs, selfClose, end: j + 1 };
    if (s[j] === "/" && s[j + 1] === ">") return { tag, attrs, selfClose: true, end: j + 2 };
    const nm = /^[\w:.-]+/.exec(s.slice(j, j + 64));
    if (!nm) {
      j++; // karakter aneh, lewati
      continue;
    }
    const name = nm[0];
    j += name.length;
    if (s[j] !== "=") {
      attrs.push({ name, kind: "bool", value: "true" });
      continue;
    }
    j++;
    const c = s[j];
    if (c === '"' || c === "'") {
      const e = skipString(s, j);
      attrs.push({ name, kind: "str", value: s.slice(j + 1, e - 1) });
      j = e;
    } else if (c === "{") {
      const e = matchBrace(s, j);
      if (e < 0) return { tag, attrs, selfClose, end: s.length };
      attrs.push({ name, kind: "expr", value: s.slice(j + 1, e) });
      j = e + 1;
    } else {
      const bm = /^[^\s>]+/.exec(s.slice(j));
      let v = bm ? bm[0] : "";
      j += v.length;
      if (v.endsWith("/") && s[j] === ">") {
        v = v.slice(0, -1);
        selfClose = true;
      }
      attrs.push({ name, kind: "str", value: v });
    }
  }
  return { tag, attrs, selfClose, end: s.length };
}

const DECL_RE =
  /^@body\s+(?:const|let)\s+\[\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\]\s*=\s*(?:DIL\.)?useState\s*\(([\s\S]*)\)\s*;?\s*$/;

/** Parse satu blok GenUI mulai dari `start`. */
export function parseBlock(s: string, start: number): GBlock {
  const decls: StateDecl[] = [];
  const root: GNode[] = [];
  type Open = { tag: string; node: GNode & { children: GNode[] } };
  const stack: Open[] = [];
  const cur = () => (stack.length ? stack[stack.length - 1].node.children : root);
  const addText = (v: string) => {
    if (!v) return;
    const list = cur();
    const last = list[list.length - 1];
    if (last && last.t === "text") last.v += v;
    else list.push({ t: "text", v });
  };

  let i = start;
  let end = start;

  while (i < s.length) {
    const top = stack.length === 0;

    if (top) {
      let k = i;
      while (k < s.length && /\s/.test(s[k])) k++;
      if (k >= s.length) break;
      i = k;
    }

    if (s.startsWith("{@body", i)) {
      const j = matchBrace(s, i);
      if (j < 0) break;
      const m = DECL_RE.exec(s.slice(i + 1, j).trim());
      if (m) decls.push({ name: m[1], setter: m[2], init: m[3].trim() });
      i = j + 1;
      if (top) end = i;
      continue;
    }

    if (s.startsWith("{#each", i)) {
      const j = matchBrace(s, i);
      if (j < 0) break;
      const header = s.slice(i + 6, j).trim();
      const m = /^([\s\S]+?)\s+as\s+([A-Za-z_$][\w$]*)(?:\s*,\s*([A-Za-z_$][\w$]*))?$/.exec(header);
      const node: GNode = { t: "each", code: m ? m[1] : "[]", item: m ? m[2] : "_", index: m?.[3], children: [] };
      cur().push(node);
      stack.push({ tag: "#each", node });
      i = j + 1;
      continue;
    }

    if (s.startsWith("{/each}", i)) {
      const at = stack.map((x) => x.tag).lastIndexOf("#each");
      if (at >= 0) stack.length = at;
      i += 7;
      if (stack.length === 0) end = i;
      continue;
    }

    if (s[i] === "{") {
      if (top) break;
      const j = matchBrace(s, i);
      if (j < 0) {
        addText(s.slice(i));
        i = s.length;
        break;
      }
      cur().push({ t: "expr", code: s.slice(i + 1, j) });
      i = j + 1;
      continue;
    }

    if (s[i] === "<") {
      if (s[i + 1] === "/") {
        const m = /^<\/([\w-]+)\s*>/.exec(s.slice(i, i + 64));
        if (m) {
          const name = m[1].toLowerCase();
          const at = stack.map((x) => x.tag).lastIndexOf(name);
          if (at >= 0) stack.length = at;
          i += m[0].length;
          if (stack.length === 0) end = i;
          continue;
        }
      } else {
        const ot = parseOpenTag(s, i);
        if (ot) {
          const lower = ot.tag.toLowerCase();
          if (top && !TOP_TAGS.has(lower)) break;
          const node: GNode & { children: GNode[] } = {
            t: "el",
            tag: lower,
            attrs: ot.attrs,
            children: [],
          };
          cur().push(node);
          i = ot.end;
          if (ot.selfClose || VOID_TAGS.has(lower)) {
            if (stack.length === 0) end = i;
          } else {
            stack.push({ tag: lower, node });
          }
          continue;
        }
      }
      if (top) break;
      addText("<");
      i++;
      continue;
    }

    // teks biasa
    if (top) break;
    let k = i;
    while (k < s.length && s[k] !== "<" && s[k] !== "{") k++;
    addText(s.slice(i, k));
    i = k;
  }

  if (stack.length > 0) end = s.length; // tag belum tertutup → ditutup otomatis
  return { decls, nodes: root, end: Math.max(end, start) };
}

/* ───────────────────── Pemisah markdown / GenUI ───────────────────── */

const FENCE = /^\s*(```|~~~)/;

/** Indeks awal blok GenUI pertama di luar code fence, atau -1. */
export function genUiStart(text: string): number {
  let pos = 0;
  let inFence = false;
  while (pos < text.length) {
    let eol = text.indexOf("\n", pos);
    if (eol < 0) eol = text.length;
    const line = text.slice(pos, eol);
    if (FENCE.test(line)) inFence = !inFence;
    else if (!inFence && STARTER.test(line)) return pos + (line.length - line.trimStart().length);
    pos = eol + 1;
  }
  return -1;
}

export function splitGenUI(text: string): Segment[] {
  const segs: Segment[] = [];
  let pos = 0;
  let mdStart = 0;
  let inFence = false;

  while (pos < text.length) {
    let eol = text.indexOf("\n", pos);
    if (eol < 0) eol = text.length;
    const line = text.slice(pos, eol);

    if (FENCE.test(line)) {
      inFence = !inFence;
    } else if (!inFence && STARTER.test(line)) {
      const lead = line.length - line.trimStart().length;
      const block = parseBlock(text, pos + lead);
      if ((block.nodes.length || block.decls.length) && block.end > pos) {
        if (pos > mdStart) segs.push({ type: "md", text: text.slice(mdStart, pos) });
        segs.push({ type: "ui", block });
        pos = mdStart = block.end;
        continue;
      }
    }
    pos = eol + 1;
  }
  if (mdStart < text.length) segs.push({ type: "md", text: text.slice(mdStart) });
  return segs.filter((x) => x.type === "ui" || x.text.trim() !== "");
}

/** Teks polos untuk disalin / dibacakan (tanpa tag dan elemen interaktif). */
export function toPlainText(text: string): string {
  const skip = new Set(["button", "radio-group", "radio"]);
  const walk = (nodes: GNode[]): string[] =>
    nodes.flatMap((n) => {
      if (n.t === "text") return n.v.replace(/\s+/g, " ").trim() ? [n.v.replace(/\s+/g, " ").trim()] : [];
      if (n.t === "el") return skip.has(n.tag) ? [] : walk(n.children);
      return [];
    });
  return splitGenUI(text)
    .map((x) => (x.type === "md" ? x.text.trim() : walk(x.block.nodes).join("\n")))
    .filter(Boolean)
    .join("\n\n");
}

/* ───────────────────── Evaluator ekspresi aman ───────────────────── */

type E =
  | { n: "lit"; v: unknown }
  | { n: "id"; name: string }
  | { n: "arr"; items: E[] }
  | { n: "obj"; props: [string, E][] }
  | { n: "un"; op: string; a: E }
  | { n: "bin"; op: string; a: E; b: E }
  | { n: "cond"; c: E; a: E; b: E }
  | { n: "mem"; o: E; p: E; opt: boolean }
  | { n: "call"; f: E; args: E[] }
  | { n: "fn"; params: string[]; body: E }
  | { n: "seq"; items: E[] }
  | { n: "tpl"; strs: string[]; exprs: E[] };

type Tok =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "id"; v: string }
  | { k: "p"; v: string }
  | { k: "tpl"; strs: string[]; srcs: string[] };

const PUNCT = ["===", "!==", "=>", "==", "!=", "<=", ">=", "&&", "||", "??", "?."];

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'") {
      const end = skipString(src, i);
      out.push({ k: "str", v: unescape(src.slice(i + 1, end - 1)) });
      i = end;
      continue;
    }
    if (c === "`") {
      const strs: string[] = [];
      const srcs: string[] = [];
      let buf = "";
      i++;
      while (i < src.length && src[i] !== "`") {
        if (src[i] === "\\") { buf += src.slice(i, i + 2); i += 2; continue; }
        if (src[i] === "$" && src[i + 1] === "{") {
          const j = matchBrace(src, i + 1);
          if (j < 0) { i = src.length; break; }
          strs.push(unescape(buf));
          buf = "";
          srcs.push(src.slice(i + 2, j));
          i = j + 1;
          continue;
        }
        buf += src[i++];
      }
      strs.push(unescape(buf));
      i++;
      out.push({ k: "tpl", strs, srcs });
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(src.slice(i))!;
      out.push({ k: "num", v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      const m = /^[\w$]+/.exec(src.slice(i))!;
      out.push({ k: "id", v: m[0] });
      i += m[0].length;
      continue;
    }
    const three = src.slice(i, i + 3);
    const two = src.slice(i, i + 2);
    const p = PUNCT.find((x) => (x.length === 3 ? three === x : two === x));
    if (p) { out.push({ k: "p", v: p }); i += p.length; continue; }
    out.push({ k: "p", v: c });
    i++;
  }
  return out;
}

function unescape(s: string): string {
  return s.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, g: string) => {
    if (g[0] === "u" && g.length === 5) return String.fromCharCode(parseInt(g.slice(1), 16));
    if (g[0] === "x" && g.length === 3) return String.fromCharCode(parseInt(g.slice(1), 16));
    return g === "n" ? "\n" : g === "t" ? "\t" : g === "r" ? "\r" : g;
  });
}

class Parser {
  private p = 0;
  private t: Tok[];
  constructor(t: Tok[]) {
    this.t = t;
  }
  private peek(o = 0) { return this.t[this.p + o]; }
  private isP(v: string, o = 0) { const t = this.peek(o); return !!t && t.k === "p" && t.v === v; }
  private eatP(v: string) { if (this.isP(v)) { this.p++; return true; } return false; }
  private expectP(v: string) { if (!this.eatP(v)) throw new Error(`Diharapkan "${v}"`); }
  done() { return this.p >= this.t.length; }

  parseProgram(): E {
    const e = this.parseSeq();
    if (!this.done()) throw new Error("Token berlebih");
    return e;
  }

  private parseSeq(): E {
    const items: E[] = [];
    while (!this.done() && !this.isP("}")) {
      if (this.eatP(";")) continue;
      const t = this.peek();
      if (t.k === "id" && t.v === "return") this.p++;
      items.push(this.parseAssign());
    }
    return items.length === 1 ? items[0] : { n: "seq", items };
  }

  private arrowAhead(): boolean {
    if (!this.isP("(")) return false;
    let depth = 0;
    for (let k = this.p; k < this.t.length; k++) {
      const t = this.t[k];
      if (t.k === "p" && t.v === "(") depth++;
      else if (t.k === "p" && t.v === ")") {
        depth--;
        if (depth === 0) { const nx = this.t[k + 1]; return !!nx && nx.k === "p" && nx.v === "=>"; }
      }
    }
    return false;
  }

  private parseAssign(): E {
    const t = this.peek();
    if (t && t.k === "id" && this.isP("=>", 1)) {
      this.p += 2;
      return { n: "fn", params: [t.v], body: this.parseArrowBody() };
    }
    if (this.arrowAhead()) {
      this.expectP("(");
      const params: string[] = [];
      while (!this.isP(")")) {
        const id = this.peek();
        if (!id || id.k !== "id") throw new Error("Parameter tidak valid");
        params.push(id.v);
        this.p++;
        if (!this.eatP(",")) break;
      }
      this.expectP(")");
      this.expectP("=>");
      return { n: "fn", params, body: this.parseArrowBody() };
    }
    return this.parseCond();
  }

  private parseArrowBody(): E {
    if (this.isP("{")) {
      this.p++;
      const body = this.parseSeq();
      this.expectP("}");
      return body;
    }
    return this.parseAssign();
  }

  private parseCond(): E {
    const c = this.parseBin(0);
    if (this.eatP("?")) {
      const a = this.parseAssign();
      this.expectP(":");
      const b = this.parseAssign();
      return { n: "cond", c, a, b };
    }
    return c;
  }

  private static LEVELS: string[][] = [
    ["??"], ["||"], ["&&"], ["===", "!==", "==", "!="], ["<", ">", "<=", ">="], ["+", "-"], ["*", "/", "%"],
  ];

  private parseBin(level: number): E {
    if (level >= Parser.LEVELS.length) return this.parseUnary();
    let left = this.parseBin(level + 1);
    for (;;) {
      const t = this.peek();
      if (t && t.k === "p" && Parser.LEVELS[level].includes(t.v)) {
        this.p++;
        left = { n: "bin", op: t.v, a: left, b: this.parseBin(level + 1) };
      } else return left;
    }
  }

  private parseUnary(): E {
    const t = this.peek();
    if (t && t.k === "p" && (t.v === "!" || t.v === "-" || t.v === "+")) {
      this.p++;
      return { n: "un", op: t.v, a: this.parseUnary() };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): E {
    let e = this.parsePrimary();
    for (;;) {
      if (this.eatP(".")) {
        const id = this.peek();
        if (!id || id.k !== "id") throw new Error("Nama properti diharapkan");
        this.p++;
        e = { n: "mem", o: e, p: { n: "lit", v: id.v }, opt: false };
      } else if (this.eatP("?.")) {
        if (this.eatP("[")) {
          const p = this.parseAssign();
          this.expectP("]");
          e = { n: "mem", o: e, p, opt: true };
        } else if (this.isP("(")) {
          e = { n: "call", f: e, args: this.parseArgs() };
        } else {
          const id = this.peek();
          if (!id || id.k !== "id") throw new Error("Nama properti diharapkan");
          this.p++;
          e = { n: "mem", o: e, p: { n: "lit", v: id.v }, opt: true };
        }
      } else if (this.eatP("[")) {
        const p = this.parseAssign();
        this.expectP("]");
        e = { n: "mem", o: e, p, opt: false };
      } else if (this.isP("(")) {
        e = { n: "call", f: e, args: this.parseArgs() };
      } else return e;
    }
  }

  private parseArgs(): E[] {
    this.expectP("(");
    const args: E[] = [];
    while (!this.isP(")")) {
      args.push(this.parseAssign());
      if (!this.eatP(",")) break;
    }
    this.expectP(")");
    return args;
  }

  private parsePrimary(): E {
    const t = this.peek();
    if (!t) throw new Error("Ekspresi terpotong");
    this.p++;
    if (t.k === "num" || t.k === "str") return { n: "lit", v: t.v };
    if (t.k === "tpl") {
      return { n: "tpl", strs: t.strs, exprs: t.srcs.map((s) => new Parser(tokenize(s)).parseProgram()) };
    }
    if (t.k === "id") {
      if (t.v === "true") return { n: "lit", v: true };
      if (t.v === "false") return { n: "lit", v: false };
      if (t.v === "null") return { n: "lit", v: null };
      if (t.v === "undefined") return { n: "lit", v: undefined };
      return { n: "id", name: t.v };
    }
    if (t.v === "(") {
      const e = this.parseAssign();
      this.expectP(")");
      return e;
    }
    if (t.v === "[") {
      const items: E[] = [];
      while (!this.isP("]")) {
        items.push(this.parseAssign());
        if (!this.eatP(",")) break;
      }
      this.expectP("]");
      return { n: "arr", items };
    }
    if (t.v === "{") {
      const props: [string, E][] = [];
      while (!this.isP("}")) {
        const k = this.peek();
        if (!k || (k.k !== "id" && k.k !== "str" && k.k !== "num")) throw new Error("Kunci objek tidak valid");
        this.p++;
        const key = String(k.v);
        props.push([key, this.eatP(":") ? this.parseAssign() : { n: "id", name: key }]);
        if (!this.eatP(",")) break;
      }
      this.expectP("}");
      return { n: "obj", props };
    }
    throw new Error(`Token tak terduga "${t.v}"`);
  }
}

/* ── Evaluasi ── */

export type Scope = Record<string, unknown>;

const BLOCKED = new Set(["constructor", "__proto__", "prototype", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__"]);
const SAFE_METHODS = new Set([
  "includes", "join", "map", "filter", "slice", "indexOf", "find", "some", "every", "at", "concat",
  "toLowerCase", "toUpperCase", "trim", "startsWith", "endsWith", "split", "replace", "replaceAll",
  "toString", "toFixed", "padStart", "padEnd",
]);

function getMember(o: unknown, p: unknown): unknown {
  if (o == null) return undefined;
  const key = String(p);
  if (BLOCKED.has(key)) return undefined;
  if (typeof o === "string" || Array.isArray(o)) {
    if (key === "length" || /^\d+$/.test(key) || SAFE_METHODS.has(key)) return (o as never)[key];
    return undefined;
  }
  if (typeof o === "number") return SAFE_METHODS.has(key) ? (o as never)[key] : undefined;
  if (typeof o === "object" || typeof o === "function") {
    return Object.prototype.hasOwnProperty.call(o, key) ? (o as never)[key] : undefined;
  }
  return undefined;
}

function evalNode(e: E, scope: Scope): unknown {
  switch (e.n) {
    case "lit": return e.v;
    case "id": return scope[e.name];
    case "arr": return e.items.map((x) => evalNode(x, scope));
    case "obj": {
      const o: Record<string, unknown> = {};
      for (const [k, v] of e.props) if (!BLOCKED.has(k)) o[k] = evalNode(v, scope);
      return o;
    }
    case "un": {
      const v = evalNode(e.a, scope) as never;
      return e.op === "!" ? !v : e.op === "-" ? -v : +v;
    }
    case "bin": {
      if (e.op === "&&") { const a = evalNode(e.a, scope); return a ? evalNode(e.b, scope) : a; }
      if (e.op === "||") { const a = evalNode(e.a, scope); return a ? a : evalNode(e.b, scope); }
      if (e.op === "??") { const a = evalNode(e.a, scope); return a ?? evalNode(e.b, scope); }
      const a = evalNode(e.a, scope) as never;
      const b = evalNode(e.b, scope) as never;
      switch (e.op) {
        case "+": return (a as number) + (b as number);
        case "-": return (a as number) - (b as number);
        case "*": return (a as number) * (b as number);
        case "/": return (a as number) / (b as number);
        case "%": return (a as number) % (b as number);
        case "===": case "==": return a === b;
        case "!==": case "!=": return a !== b;
        case "<": return a < b;
        case ">": return a > b;
        case "<=": return a <= b;
        case ">=": return a >= b;
      }
      return undefined;
    }
    case "cond": return evalNode(e.c, scope) ? evalNode(e.a, scope) : evalNode(e.b, scope);
    case "mem": {
      const o = evalNode(e.o, scope);
      if (e.opt && o == null) return undefined;
      return getMember(o, evalNode(e.p, scope));
    }
    case "call": {
      let thisArg: unknown = undefined;
      let fn: unknown;
      if (e.f.n === "mem") {
        thisArg = evalNode(e.f.o, scope);
        if (e.f.opt && thisArg == null) return undefined;
        fn = getMember(thisArg, evalNode(e.f.p, scope));
      } else fn = evalNode(e.f, scope);
      if (typeof fn !== "function") return undefined;
      const args = e.args.map((a) => evalNode(a, scope));
      return (fn as (...a: unknown[]) => unknown).apply(thisArg, args);
    }
    case "fn": {
      return (...args: unknown[]) => {
        const inner: Scope = Object.assign(Object.create(null), scope);
        e.params.forEach((p, i) => { inner[p] = args[i]; });
        return evalNode(e.body, inner);
      };
    }
    case "seq": {
      let last: unknown;
      for (const it of e.items) last = evalNode(it, scope);
      return last;
    }
    case "tpl": {
      let out = e.strs[0];
      e.exprs.forEach((x, i) => { out += String(evalNode(x, scope) ?? "") + e.strs[i + 1]; });
      return out;
    }
  }
}

const cache = new Map<string, E | null>();

function compile(code: string): E | null {
  if (cache.has(code)) return cache.get(code)!;
  let ast: E | null = null;
  try {
    ast = new Parser(tokenize(code)).parseProgram();
  } catch (err) {
    console.warn("[GenUI] ekspresi tidak valid:", code, err);
  }
  if (cache.size > 500) cache.clear();
  cache.set(code, ast);
  return ast;
}

/** Evaluasi ekspresi; tidak pernah melempar error (hasil `undefined` jika gagal). */
export function evalExpr(code: string, scope: Scope): unknown {
  const ast = compile(code);
  if (!ast) return undefined;
  try {
    return evalNode(ast, scope);
  } catch (err) {
    console.warn("[GenUI] gagal mengevaluasi:", code, err);
    return undefined;
  }
}

export const emptyScope = (): Scope => Object.create(null);

