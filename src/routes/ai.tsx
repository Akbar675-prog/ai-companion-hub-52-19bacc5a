import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown } from "lucide-react";
import { PromptInput } from "@/components/ui/ai-chat-input";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import { AiAvatar } from "@/components/ui/plasma-shader";
import { AiHeader } from "@/components/AiHistorySidebar";
import { AiMessage } from "@/components/AiMessage";
import { GeneratingImageCard } from "@/components/GeneratingImageCard";
import type { AiPluginId } from "@/lib/ai-plugins";
import { generateImageFn } from "@/lib/image-gen.functions";
import { getAiProfileFn } from "@/lib/ai-profile.functions";
import { getAiChatHistoryFn, saveAiChatHistoryFn } from "@/lib/ai-chat-history.functions";
import { chatCreditsFn, recordChatUsageFn } from "@/lib/ai-credits.functions";
import { listAiModelsFn } from "@/lib/ai-models.functions";
import type { AiProfile } from "@/lib/ai-profile.server";
import { DEFAULT_AVATAR, useAccount } from "@/lib/use-account";
import {
  allModels,
  loadSelectedModelId,
  modelById,
  saveSelectedModelId,
  OFFICIAL_GPT6,
  type AiModel,
} from "@/lib/ai-models";

import {
  loadThreads,
  saveThreads,
  newThreadId,
  type ChatMessage,
  type ChatSource,
  type ChatThread,
} from "@/lib/ai-history";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "AI Chats — Galileo Mod APK" },
      {
        name: "description",
        content:
          "Ngobrol dengan GetrixAI: reasoning, pencarian web real-time, dan analisis gambar langsung dari browser.",
      },
      { property: "og:title", content: "AI Chats — Galileo Mod APK" },
      {
        property: "og:description",
        content: "Asisten AI GMA dengan reasoning, sumber web, dan analisis gambar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiChatPage,
});

const SUGGESTIONS = [
  "Apa itu mod APK?",
  "Cara install APK di Android 14",
  "Tips biar HP nggak lag",
];

const LOADING_PHRASES = [
  "Memikirkan langkah...",
  "Menyiapkan jawaban...",
  "Sedang berpikir...",
];

function ChatLoadingText({ status }: { status: string | null }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isThinking = !status || status === "Memikirkan langkah...";

  useEffect(() => {
    if (!isThinking) return;
    const interval = window.setInterval(() => {
      setCurrentIndex((previous) => (previous + 1) % LOADING_PHRASES.length);
    }, 2800);
    return () => window.clearInterval(interval);
  }, [isThinking]);

  const text = isThinking ? LOADING_PHRASES[currentIndex] : status;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={text}
        className="inline-block"
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.55, ease: "easeInOut" }}
      >
        <ShimmeringText text={text} />
      </motion.span>
    </AnimatePresence>
  );
}

const IMAGE_REQUEST_RE =
  /\b(?:buat(?:kan|in)?|buatin|generate|hasilkan|gambarkan|lukis|render)\b[\s\S]{0,120}\b(?:gambar|image|ilustrasi|foto|poster|logo|wallpaper|artwork)\b|\b(?:buat|generate|hasilkan|gambarkan|lukis|render)\s+(?:sebuah\s+)?(?:gambar|image|ilustrasi|foto|poster|logo|wallpaper|artwork)\b/i;

function looksLikeImageRequest(text: string) {
  return IMAGE_REQUEST_RE.test(text);
}

function splitReasoningSummary(text: string) {
  const match = text.match(/\n?###\s+Ringkasan alasan\s*\n([\s\S]*)$/i);
  if (!match) return { content: text.trim(), reasoning: "" };
  return {
    content: text.slice(0, match.index).trim(),
    reasoning: match[1].trim(),
  };
}

type Draft = {
  content: string;
  reasoning: string;
  sources?: ChatSource[];
  searchQuery?: string;
  analyzedImage?: boolean;
};

type QuranContext = {
  markdown: string;
  name: string;
  number: number;
};

export type CatalogApp = { ID: string; App_name: string; Description: string };

let catalogCache: { at: number; list: CatalogApp[] } | null = null;

function mergeThreads(...lists: ChatThread[][]): ChatThread[] {
  const byId = new Map<string, ChatThread>();
  for (const list of lists) {
    for (const thread of list) {
      const current = byId.get(thread.id);
      if (!current || thread.updatedAt >= current.updatedAt) byId.set(thread.id, thread);
    }
  }
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

async function fetchAppCatalog(signal?: AbortSignal): Promise<CatalogApp[]> {
  if (catalogCache && Date.now() - catalogCache.at < 5 * 60_000) return catalogCache.list;
  try {
    const res = await fetch("/apps/index/applist.json", { signal });
    if (!res.ok) return catalogCache?.list ?? [];
    const raw = (await res.json()) as Record<string, unknown>[];
    const list = (Array.isArray(raw) ? raw : [])
      .map((a) => ({
        ID: String(a["ID"] ?? ""),
        App_name: String(a["App_name"] ?? ""),
        Description: String(a["Description"] ?? ""),
      }))
      .filter((a) => a.ID && a.App_name)
      .slice(0, 200);
    catalogCache = { at: Date.now(), list };
    return list;
  } catch {
    return catalogCache?.list ?? [];
  }
}

async function fetchQuranContext(query: string, signal: AbortSignal): Promise<QuranContext | null> {
  try {
    const response = await fetch("/api/ai-surah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal,
    });
    if (!response.ok) return null;
    const result = (await response.json()) as Partial<QuranContext> & { found?: boolean };
    if (!result.found || !result.markdown || !result.name || !result.number) return null;
    return { markdown: result.markdown, name: result.name, number: result.number };
  } catch {
    return null;
  }
}

export function AiChatPage({ requestedThreadId }: { requestedThreadId?: string } = {}) {
  const navigate = useNavigate();
  const { userId, profile } = useAccount();
  const [aiProfile, setAiProfile] = useState<AiProfile | null>(null);
  const userName = aiProfile?.nickname?.trim() || profile?.name || profile?.username || null;
  const userAvatar = profile?.avatar_url || DEFAULT_AVATAR;
  const [credits, setCredits] = useState<{ used: number; limit: number; remaining: number } | null>(
    null,
  );

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [attachedDocument, setAttachedDocument] = useState<{ name: string; text: string } | null>(null);
  const [tool, setTool] = useState<string | null>(null);
  const [plugin, setPlugin] = useState<AiPluginId | null>(null);
  const [models, setModels] = useState<AiModel[]>([]);
  const [modelId, setModelId] = useState("");
  const [modelsLoading, setModelsLoading] = useState(true);

  const [imaging, setImaging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingSendRef = useRef<string | null>(null);
  const runningThreadRef = useRef<string | null>(null);
  const autoStartedThreadRef = useRef<string | null>(null);
  const followLatestRef = useRef(true);

  useEffect(() => {
    let alive = true;
    const cached = loadThreads(userId ?? null);
    setThreads(cached);
    setActiveId(
      requestedThreadId && cached.some((thread) => thread.id === requestedThreadId)
        ? requestedThreadId
        : null,
    );

    if (!userId) {
      return () => {
        alive = false;
      };
    }

    void getAiChatHistoryFn()
      .then((history) => {
        if (!alive) return;
        const merged = mergeThreads(cached, history);
        setThreads(merged);
        if (requestedThreadId && merged.some((thread) => thread.id === requestedThreadId)) {
          setActiveId(requestedThreadId);
        }
      })
      .catch(() => {
        // Cache lokal tetap dipakai jika request history server gagal.
      });

    return () => {
      alive = false;
    };
  }, [requestedThreadId, userId]);

  useEffect(() => {
    let alive = true;
    setModels([]);
    setModelId("");
    setModelsLoading(true);

    const official = OFFICIAL_GPT6 as AiModel;

    void listAiModelsFn()
      .then((storedModels) => {
        if (!alive) return;
        const custom = allModels(storedModels).filter((model) => model.custom);
        const list = [official, ...custom];
        const saved = loadSelectedModelId();
        setModels(list);
        setModelId(list.some((model) => model.id === saved) ? saved : official.id);
        setModelsLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setModels([official]);
        setModelId(official.id);
        setModelsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (modelsLoading || pendingSendRef.current === null) return;
    const pending = pendingSendRef.current;
    pendingSendRef.current = null;
    void send(pending);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsLoading]);

  useEffect(() => {
    if (!userId || !requestedThreadId || modelsLoading || loading || imaging) return;
    if (runningThreadRef.current === requestedThreadId) return;
    if (autoStartedThreadRef.current === requestedThreadId) return;

    const thread = threads.find((item) => item.id === requestedThreadId);
    const lastMessage = thread?.messages.at(-1);
    if (!thread || lastMessage?.role !== "user") return;

    autoStartedThreadRef.current = requestedThreadId;
    if (looksLikeImageRequest(lastMessage.content)) {
      void runImage(lastMessage.content, thread.messages, thread.id, threads);
    } else {
      void run(thread.messages, lastMessage.image ?? null, thread.id, threads);
    }
  }, [imaging, loading, modelsLoading, requestedThreadId, threads, userId]);

  useEffect(() => {
    if (!userId) {
      setAiProfile(null);
      setCredits(null);
      return;
    }
    let alive = true;
    void getAiProfileFn()
      .then((p) => alive && setAiProfile(p))
      .catch(() => {});
    void chatCreditsFn()
      .then((c) => alive && setCredits({ used: c.used, limit: c.limit, remaining: c.remaining }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  const messages = useMemo<ChatMessage[]>(
    () => threads.find((t) => t.id === activeId)?.messages ?? [],
    [threads, activeId],
  );

  const persist = useCallback(
    (next: ChatThread[]) => {
      const limited = next.slice(0, 60);
      setThreads(limited);
      saveThreads(userId ?? null, limited);
      if (userId) {
        void saveAiChatHistoryFn({ data: { threads: limited } }).catch(() => {});
      }
    },
    [userId],
  );

  const atBottomRef = useRef(true);
  const lastStreamScrollRef = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 140;
      atBottomRef.current = atBottom;
      followLatestRef.current = atBottom;
      setShowJumpToLatest(!atBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (atBottomRef.current) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!loading || !followLatestRef.current || (!draft?.content && !draft?.reasoning)) return;
    const now = performance.now();
    if (now - lastStreamScrollRef.current < 100) return;
    lastStreamScrollRef.current = now;
    endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [draft?.content, draft?.reasoning, loading]);

  function jumpToLatest() {
    followLatestRef.current = true;
    atBottomRef.current = true;
    setShowJumpToLatest(false);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function startNewChat() {
    setActiveId(null);
    if (userId) void navigate({ to: "/ai" });
    setMenuOpen(false);
    setError(null);
    setInput("");
    setImage(null);
    setAttachedDocument(null);
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function runThirdParty(
    history: ChatMessage[],
    _attached: string | null,
    threadIdIn: string | null,
    baseIn: ChatThread[],
    model: AiModel,
  ) {
    const lastUser = history[history.length - 1]?.content ?? "";
    let threadId = threadIdIn;
    let base = baseIn;
    const createdThread = !threadId;

    if (!threadId) {
      threadId = newThreadId();
      base = [
        { id: threadId, title: lastUser.slice(0, 40), updatedAt: Date.now(), messages: history },
        ...baseIn,
      ];
      setActiveId(threadId);
    } else {
      base = baseIn.map((t) =>
        t.id === threadId ? { ...t, updatedAt: Date.now(), messages: history } : t,
      );
    }
    runningThreadRef.current = threadId;
    persist(base);

    setInput("");
    setImage(null);
    setError(null);
    setLoading(true);
    setDraft({ content: "", reasoning: "" });
    setStatus("Memikirkan langkah...");

    const started = Date.now();
    const controller = new AbortController();
    abortRef.current = controller;

    let acc = "";

    try {
      const res = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: lastUser,
          messages: history.map((item) => ({
            role: item.role,
            content: item.content,
          })),
          systemPrompt: model.persona,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody?.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      const consumeEvent = (part: string) => {
        const line = part.trim();
        if (!line.startsWith("data:")) return;

        let evt: {
          type?: string;
          v?: string;
          complete?: boolean;
          error?: string;
        };
        try {
          evt = JSON.parse(line.slice(5).trim());
        } catch {
          return;
        }

        if (evt.type === "done") {
          finished = evt.complete === true;
        } else if (evt.type === "error") {
          throw new Error(evt.error || "Stream error");
        } else if (evt.type === "text" && evt.v) {
          acc += evt.v;
          setDraft({ content: acc, reasoning: "" });
        }
      };

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) consumeEvent(part);
        }
        buffer += decoder.decode();
        if (buffer.trim()) consumeEvent(buffer);
      } finally {
        await reader.cancel().catch(() => {});
      }

      if (!finished && !acc.trim()) {
        throw new Error("Stream berakhir tanpa jawaban");
      }

      const answer = splitReasoningSummary(acc);
      setDraft({ content: answer.content, reasoning: answer.reasoning });

      const reply: ChatMessage = {
        role: "assistant",
        content: answer.content,
        ...(answer.reasoning ? { reasoning: answer.reasoning } : {}),
        thoughtSeconds: Math.max(1, Math.round((Date.now() - started) / 1000)),
      };

      const withReply = [...history, reply];
      const completed = base.map((t) =>
        t.id === threadId
          ? {
              ...t,
              title: t.title || lastUser.slice(0, 40) || "Chat baru",
              updatedAt: Date.now(),
              messages: withReply,
            }
          : t,
      );
      persist(completed);

      if (createdThread && userId) {
        void navigate({ to: "/ai/c/$threadId", params: { threadId } });
      }
    } catch (e) {
      if (acc.trim()) {
        setDraft({ content: acc, reasoning: "" });
        const withReply = [
          ...history,
          {
            role: "assistant" as const,
            content: acc,
            thoughtSeconds: Math.max(1, Math.round((Date.now() - started) / 1000)),
          },
        ];
        persist(
          base.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  title: t.title || lastUser.slice(0, 40) || "Chat baru",
                  updatedAt: Date.now(),
                  messages: withReply,
                }
              : t,
          ),
        );
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          setError("Jawaban terputus. Tekan ulangi kalau mau versi lengkapnya.");
        }
      } else if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "Gagal menghubungi GPT-6.");
      }
    } finally {
      abortRef.current = null;
      if (runningThreadRef.current === threadId) runningThreadRef.current = null;
      setLoading(false);
      setStatus(null);
      setDraft(null);
    }
  }

  async function run(
    history: ChatMessage[],
    attached: string | null,
    threadIdIn: string | null,
    baseIn: ChatThread[],
  ) {
    if (models.length === 0) {
      setError("Belum ada model AI yang tersedia dari Supabase.");
      return;
    }

    const lastUser = history[history.length - 1]?.content ?? "";

    const activeModel = modelById(modelId, models);
    if (activeModel?.id === "gpt-6" || activeModel?.gpt6Based) {
      return runThirdParty(history, attached, threadIdIn, baseIn, activeModel);
    }

    let threadId = threadIdIn;
    let base = baseIn;
    const createdThread = !threadId;
    if (!threadId) {
      threadId = newThreadId();
      base = [{ id: threadId, title: "", updatedAt: Date.now(), messages: history }, ...baseIn];
      setActiveId(threadId);
    } else {
      base = baseIn.map((t) =>
        t.id === threadId ? { ...t, updatedAt: Date.now(), messages: history } : t,
      );
    }
    runningThreadRef.current = threadId;
    persist(base);

    setInput("");
    setImage(null);
    setError(null);
    setLoading(true);
    setDraft({ content: "", reasoning: "" });

    const started = Date.now();
    const elapsed = () => Math.max(1, Math.round((Date.now() - started) / 1000));
    const controller = new AbortController();
    abortRef.current = controller;

    const STALL_MS = 45_000;
    const MAX_MS = 300_000;

    const attempt: { ctrl: AbortController | null } = { ctrl: null };
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    const bumpWatchdog = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        if (attempt.ctrl) attempt.ctrl.abort();
        else controller.abort();
      }, STALL_MS);
    };
    const maxTimer = setTimeout(() => controller.abort(), MAX_MS);
    bumpWatchdog();

    const stepSignal = (ms: number) =>
      AbortSignal.any([controller.signal, AbortSignal.timeout(ms)]);

    let acc: Draft = { content: "", reasoning: "" };

    let revealed = 0;
    let painting = true;
    let rafId: number | undefined;
    const paint = () => {
      const target = acc.content.length;
      if (revealed < target) {
        const diff = target - revealed;
        revealed += diff > 80 ? Math.ceil(diff / 4) : Math.max(1, Math.ceil(diff / 6));
        if (revealed > target) revealed = target;
      }
      setDraft({ ...acc, content: acc.content.slice(0, revealed) });
      if (painting) rafId = requestAnimationFrame(paint);
    };
    const stopPaint = () => {
      painting = false;
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      revealed = acc.content.length;
    };
    rafId = requestAnimationFrame(paint);

    try {
      let title = "";
      let query = "";
      let queries: string[] = [];
      let needsSearch = false;
      const forceSearch =
        tool === "searchWeb" || plugin === "searchWeb" || plugin === "deepResearch";
      const asksForFreshInfo =
        /\b(?:terbaru|terkini|saat ini|sekarang|hari ini|kemarin|minggu ini|bulan ini|tahun ini|rilis terbaru|lagi ramai|trending|latest|newest|currently|right now|today|this week|this month|this year|upcoming)\b/i.test(
          lastUser,
        );
      const deepResearch = plugin === "deepResearch";
      let needsReasoning = tool === "thinkLonger" || plugin === "deepResearch";
      let vision = "";
      let quran: QuranContext | null = null;

      let catalogDone = false;
      const catalogPromise = fetchAppCatalog(controller.signal).then((list) => {
        catalogDone = true;
        return list;
      });
      const quranPromise = fetchQuranContext(lastUser, stepSignal(12_000));

      if (attached) {
        setStatus("Menganalisis gambar...");
        try {
          const vr = await fetch("/api/ai-vision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: attached, question: lastUser }),
            signal: stepSignal(15_000),
          });
          if (vr.ok) {
            const vj = (await vr.json()) as {
              description?: string;
              query?: string;
              title?: string;
            };
            vision = vj.description ?? "";
            query = vj.query ?? "";
            title = vj.title ?? "";
            needsSearch = !!query;
            queries = query ? [query] : [];
          }
        } catch {
          /* lanjut tanpa analisis */
        }
      } else {
        setStatus("Memikirkan langkah...");
        try {
          const pr = await fetch("/api/ai-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: history.map((m) => ({ role: m.role, content: m.content })),
              deep: deepResearch,
            }),
            signal: stepSignal(15_000),
          });
          if (pr.ok) {
            const pj = (await pr.json()) as {
              needsSearch?: boolean;
              needsReasoning?: boolean;
              query?: string;
              queries?: string[];
              title?: string;
            };
            needsSearch = !!pj.needsSearch || forceSearch || asksForFreshInfo;
            needsReasoning = needsReasoning || !!pj.needsReasoning;
            queries = (pj.queries ?? []).filter(Boolean);
            query = queries[0] ?? pj.query ?? "";
          }
        } catch {
          /* planner opsional */
        }
        needsSearch = needsSearch || forceSearch || asksForFreshInfo;

        try {
          const tr = await fetch("/api/ai-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: lastUser }),
            signal: stepSignal(15_000),
          });
          if (tr.ok) {
            const tj = (await tr.json()) as { title?: string };
            title = tj.title?.trim() ?? "";
          }
        } catch {
          /* judul opsional */
        }
        if ((forceSearch || asksForFreshInfo) && !query) query = lastUser;
        if (queries.length === 0 && query) queries = [query];
      }

      quran = await quranPromise;

      if (needsSearch) {
        const specialized = await fetch("/api/ai-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: lastUser, deep: deepResearch }),
          signal: stepSignal(12_000),
        })
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null) as { queries?: string[] } | null;
        const improved = (specialized?.queries ?? []).filter(Boolean);
        if (improved.length > 0) {
          queries = improved;
          query = improved[0] ?? query;
        }
      }

      let search: { query?: string; direct?: string; results?: ChatSource[] } | null = null;
      if (needsSearch && query) {
        setStatus('Menggunakan alat "search_web"...');
        try {
          const sr = await fetch("/api/ai-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              queries,
              query,
              limit: deepResearch ? 50 : 8,
            }),
            signal: stepSignal(deepResearch ? 40_000 : 15_000),
          });
          if (sr.ok) {
            search = (await sr.json()) as {
              query?: string;
              direct?: string;
              results?: ChatSource[];
            };
            acc = {
              ...acc,
              sources: (search.results ?? []).filter((r) => !!r.link),
              searchQuery: query,
            };
            setDraft({ ...acc });
          }
        } catch {
          /* pakai pengetahuan model */
        }
      }

      if (attached) acc = { ...acc, analyzedImage: true };

      if (!catalogDone) setStatus("Fetching data...");
      const apps = await Promise.race([
        catalogPromise,
        new Promise<CatalogApp[]>((r) => setTimeout(() => r([]), 6_000)),
      ]);
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      setStatus(null);
      bumpWatchdog();

      const baseMessages = history.map((m) => ({ role: m.role, content: m.content }));

      const runStream = async (): Promise<boolean> => {
        const ctrl = new AbortController();
        attempt.ctrl = ctrl;
        const signal = AbortSignal.any([controller.signal, ctrl.signal]);

        const resume = acc.content.trim();

        const messages = resume
          ? [
              ...baseMessages,
              { role: "assistant", content: resume },
              {
                role: "user",
                content:
                  "Lanjutkan jawaban di atas persis dari karakter terakhir. Jangan mengulang bagian yang sudah ditulis dan jangan menulis kalimat pembuka apa pun.",
              },
            ]
          : baseMessages;

        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            userName,
            aiProfile,
            reasoning: needsReasoning && !resume,
            vision,
            search,
            quran,
            apps,
            origin,
            persona: modelById(modelId, models).persona,
            modelLabel: modelById(modelId, models).name,
            uncensored: modelById(modelId, models).uncensored,
            catalogModelId: modelById(modelId, models).custom
              ? modelById(modelId, models).id
              : undefined,
            realModelId: modelById(modelId, models).realModel
              ? modelById(modelId, models).modelType
              : undefined,
            abilities: modelById(modelId, models).abilities,
            endpointUrl: modelById(modelId, models).realModel
              ? modelById(modelId, models).endpointUrl
              : undefined,
            endpointKey: modelById(modelId, models).realModel
              ? modelById(modelId, models).endpointKey
              : undefined,
          }),
          signal,
        });

        if (!res.ok || !res.body) {
          throw new Error("Gagal menghubungi AI.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;

            bumpWatchdog();
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop() ?? "";

            let closed = false;
            for (const part of parts) {
              const line = part.trim();
              if (!line.startsWith("data:")) continue;
              try {
                const evt = JSON.parse(line.slice(5).trim()) as {
                  type?: string;
                  v?: string;
                  complete?: boolean;
                };
                if (evt.type === "done") {
                  closed = evt.complete === true;
                } else if (evt.type === "reasoning")
                  acc = { ...acc, reasoning: acc.reasoning + (evt.v ?? "") };
                else if (evt.type === "text") acc = { ...acc, content: acc.content + (evt.v ?? "") };
              } catch {
                /* skip */
              }
            }
            if (closed) return true;
          }
          return false;
        } finally {
          await reader.cancel().catch(() => {});
        }
      };

      let finished = false;
      for (let tries = 0; tries < 3 && !finished; tries++) {
        try {
          finished = await runStream();
          if (!finished) throw new Error("Stream jawaban terputus.");
        } catch (err) {
          attempt.ctrl = null;
          if (controller.signal.aborted) throw err;
          if (tries === 2) throw err;
          setStatus(acc.content.trim() ? "Menyambung ulang jawaban..." : "Menyambung ulang...");
          await new Promise((r) => setTimeout(r, 700 * (tries + 1)));
          setStatus(null);
          bumpWatchdog();
        }
      }
      attempt.ctrl = null;

      if (!acc.content.trim()) throw new Error("AI tidak memberi jawaban. Coba ulangi.");

      title = title || lastUser.slice(0, 40);

      const reply: ChatMessage = {
        role: "assistant",
        content: acc.content,
        thoughtSeconds: elapsed(),
        ...(acc.reasoning ? { reasoning: acc.reasoning } : {}),
        ...(acc.searchQuery ? { searchQuery: acc.searchQuery } : {}),
        ...(acc.sources?.length ? { sources: acc.sources } : {}),
        ...(attached ? { analyzedImage: true } : {}),
      };
      const withReply = [...history, reply];
      const usedTitle =
        base.find((t) => t.id === threadId)?.title || title || lastUser.slice(0, 40) || "Chat baru";
      if (userId) {
        const chars =
          baseMessages.reduce((n, m) => n + m.content.length, 0) +
          acc.content.length +
          acc.reasoning.length;
        void recordChatUsageFn({
          data: { tokens: Math.min(1_000_000, Math.ceil(chars / 4)), title: usedTitle.slice(0, 60) },
        })
          .then((c) => setCredits({ used: c.used, limit: c.limit, remaining: c.remaining }))
          .catch(() => {});
      }
      const completedThreads = base.map((t) =>
        t.id === threadId
          ? {
              ...t,
              title: t.title || title || lastUser.slice(0, 40) || "Analisis gambar",
              updatedAt: Date.now(),
              messages: withReply,
            }
          : t,
      );
      persist(completedThreads);
      if (createdThread && userId) {
        void navigate({ to: "/ai/c/$threadId", params: { threadId } });
      }
    } catch (e) {
      if (acc.content.trim()) {
        const withReply = [
          ...history,
          {
            role: "assistant" as const,
            content: acc.content,
            thoughtSeconds: elapsed(),
            ...(acc.reasoning ? { reasoning: acc.reasoning } : {}),
            ...(acc.searchQuery ? { searchQuery: acc.searchQuery } : {}),
            ...(acc.sources?.length ? { sources: acc.sources } : {}),
            ...(attached ? { analyzedImage: true } : {}),
          },
        ];
        const partialThreads = base.map((t) =>
          t.id === threadId
            ? {
                ...t,
                title: t.title || lastUser.slice(0, 40) || "Analisis gambar",
                updatedAt: Date.now(),
                messages: withReply,
              }
            : t,
        );
        persist(partialThreads);
        if (createdThread && userId) {
          void navigate({ to: "/ai/c/$threadId", params: { threadId } });
        }
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          setError("Jawaban terputus. Tekan tombol ulangi kalau mau versi lengkapnya.");
        }
      } else if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "Gagal menghubungi AI.");
      }
    } finally {
      stopPaint();
      if (stallTimer) clearTimeout(stallTimer);
      clearTimeout(maxTimer);
      abortRef.current = null;
      if (runningThreadRef.current === threadId) runningThreadRef.current = null;
      setLoading(false);
      setStatus(null);
      setDraft(null);
    }
  }

  function respondImageLoginRequired(prompt: string) {
    const userMsg: ChatMessage = { role: "user", content: prompt };
    const reply: ChatMessage = {
      role: "assistant",
      content:
        "Sebelum aku buatin gambarnya, silakan masuk dulu ke akun kamu ya. Setelah login, kirim ulang permintaan ini dan aku langsung buatkan gambarnya.",
    };
    const history = [...messages, userMsg, reply];
    const threadId = activeId ?? newThreadId();
    const base = activeId
      ? threads.map((thread) =>
          thread.id === threadId ? { ...thread, updatedAt: Date.now(), messages: history } : thread,
        )
      : [{ id: threadId, title: prompt.slice(0, 40), updatedAt: Date.now(), messages: history }, ...threads];
    setActiveId(threadId);
    persist(base);
  }

  async function runImage(
    prompt: string,
    historyOverride?: ChatMessage[],
    threadIdOverride?: string | null,
    baseOverride?: ChatThread[],
  ) {
    if (!userId) {
      respondImageLoginRequired(prompt);
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: prompt };
    const history = historyOverride ?? [...messages, userMsg];

    let threadId = threadIdOverride ?? activeId;
    let base = baseOverride ?? threads;
    const createdThread = !threadId;
    if (!threadId) {
      threadId = newThreadId();
      base = [
        { id: threadId, title: prompt.slice(0, 40), updatedAt: Date.now(), messages: history },
        ...threads,
      ];
      setActiveId(threadId);
    } else {
      base = threads.map((t) =>
        t.id === threadId ? { ...t, updatedAt: Date.now(), messages: history } : t,
      );
    }
    persist(base);

    setInput("");
    setError(null);
    setImaging(true);
    try {
      const r = await generateImageFn({ data: { prompt } });
      const reply: ChatMessage = {
        role: "assistant",
        content: "",
        imageUrl: r.url,
        imagePrompt: r.prompt,
      };
      const withReply = [...history, reply];
      persist(base.map((t) => (t.id === threadId ? { ...t, messages: withReply } : t)));
      if (createdThread && userId) {
        void navigate({ to: "/ai/c/$threadId", params: { threadId } });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat gambar.");
    } finally {
      setImaging(false);
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && !image) || loading || imaging) return;

    if (modelsLoading) {
      pendingSendRef.current = text;
      setError("Model AI sedang disiapkan. Pesan akan dikirim otomatis sebentar lagi.");
      return;
    }

    if (credits && credits.remaining <= 0) {
      setError("Kredit chat bulan ini sudah habis. Direset pada tanggal 1 bulan depan.");
      return;
    }

    const wantsImage = Boolean(trimmed) && !image && looksLikeImageRequest(trimmed);
    if (plugin === "generateImage" || wantsImage) {
      if (!trimmed) return;
      await runImage(trimmed);
      return;
    }

    const attached = image;
    const documentContext = attachedDocument
      ? `\n\n[Lampiran dokumen: ${attachedDocument.name}]\n${attachedDocument.text}`
      : "";
    const userMsg: ChatMessage = {
      role: "user",
      content: `${trimmed || "Tolong analisis lampiran ini."}${documentContext}`,
      ...(attached ? { image: attached } : {}),
    };
    setAttachedDocument(null);

    const history = [...messages, userMsg];
    if (!activeId && userId) {
      const threadId = newThreadId();
      const next = [
        { id: threadId, title: "", updatedAt: Date.now(), messages: history },
        ...threads,
      ];
      setActiveId(threadId);
      persist(next);
      setInput("");
      setImage(null);
      setError(null);
      void navigate({ to: "/ai/c/$threadId", params: { threadId } });
      return;
    }

    await run(history, attached, activeId, threads);
  }

  async function regenerate() {
    if (loading) return;
    const lastUserIdx = [...messages].map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx < 0) return;
    const history = messages.slice(0, lastUserIdx + 1);
    await run(history, history[lastUserIdx]?.image ?? null, activeId, threads);
  }

  const showEmpty = messages.length === 0 && !draft && !imaging;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AiHeader
        open={menuOpen}
        setOpen={setMenuOpen}
        threads={threads}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          if (userId) void navigate({ to: "/ai/c/$threadId", params: { threadId: id } });
          setMenuOpen(false);
        }}
        onNew={startNewChat}
        onDelete={(id) => {
          const next = threads.filter((t) => t.id !== id);
          persist(next);
          if (id === activeId) setActiveId(next[0]?.id ?? null);
        }}
        userName={userName}
        userAvatar={userAvatar}
      />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-6 md:px-8 md:pt-10 lg:max-w-4xl">
        <h1 className="sr-only">AI Chats</h1>

        <div className="flex-1 space-y-5 pb-4 md:space-y-8 md:pb-8">
          {showEmpty && (
            <div className="flex flex-col items-center justify-center gap-6 py-14 text-center md:gap-8 md:py-24">
              <AiAvatar className="size-16 md:size-20" />
              <p className="font-display text-3xl leading-tight md:text-5xl">
                {userName ? `Halo ${userName}, ada yang bisa dibantu?` : "Ada yang bisa dibantu?"}
              </p>
              <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full bg-surface-variant px-4 py-2 text-sm transition hover:bg-primary-container md:px-5 md:py-2.5 md:text-base"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end gap-2 md:gap-3">
                <div className="max-w-[85%] space-y-2 md:max-w-[75%]">
                  {m.image && (
                    <img
                      src={m.image}
                      alt="Gambar dari pengguna"
                      className="ml-auto max-h-64 rounded-3xl rounded-br-lg object-cover md:max-h-80"
                    />
                  )}
                  <div className="rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground md:px-5 md:py-3 md:text-[15px]">
                    {m.content}
                  </div>
                </div>
                <img
                  src={userAvatar}
                  alt={userName ? `Foto profil ${userName}` : "Foto profil pengguna"}
                  className="mt-1 size-7 shrink-0 rounded-full bg-surface-variant object-cover md:size-8"
                />
              </div>
            ) : (
              <AiMessage
                key={i}
                message={m}
                voiceId={aiProfile?.selectedVoiceId}
                onRegenerate={i === messages.length - 1 ? () => void regenerate() : undefined}
                onIssueTurn={(text) => void send(text)}
              />
            ),
          )}

          {draft && (draft.content || draft.reasoning) && (
            <AiMessage
              streaming
              message={{
                role: "assistant",
                content: draft.content,
                reasoning: draft.reasoning || undefined,
                sources: draft.sources,
                searchQuery: draft.searchQuery,
              }}
            />
          )}

          {loading && !draft?.content && !draft?.reasoning && (
            <div className="flex gap-2">
              <AiAvatar className="mt-1 size-7" />
              <span className="mt-1 inline-block">
                <ChatLoadingText status={status} />
              </span>
            </div>
          )}

          {imaging && <GeneratingImageCard />}

          {error && (
            <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="sticky bottom-0 relative bg-gradient-to-t from-background via-background to-transparent pb-6 pt-3"
        >
          {showJumpToLatest && (
            <div className="absolute bottom-full right-2 mb-2">
              {loading || imaging ? (
                <span
                  aria-hidden="true"
                  className="absolute -inset-1 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
                />
              ) : null}
              <button
                type="button"
                onClick={jumpToLatest}
                aria-label="Lompat ke jawaban terbaru"
                className="relative inline-flex size-11 items-center justify-center rounded-full border border-border/70 bg-card text-primary shadow-lg transition hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowDown aria-hidden="true" className="size-5" />
              </button>
            </div>
          )}

          <PromptInput
            ref={boxRef}
            value={input}
            isLoading={loading || imaging}
            image={image}
            onImageChange={setImage}
            document={attachedDocument}
            onDocumentChange={setAttachedDocument}
            onToolChange={setTool}
            plugin={plugin}
            onPluginChange={setPlugin}
            models={models}
            modelsLoading={modelsLoading}
            modelId={modelId}
            onModelChange={(id) => {
              setModelId(id);
              saveSelectedModelId(id);
            }}
            onValueChange={setInput}
            onStop={stop}
            onChange={(e) => setInput(e.target.value)}
          />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            GetrixAI bisa keliru. Cek info penting lewat sumber yang tertera.
          </p>
        </form>
      </main>
    </div>
  );
}
