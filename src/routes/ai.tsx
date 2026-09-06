import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User } from "lucide-react";
import { PromptBox } from "@/components/ui/chatgpt-prompt-input";
import { ShiningText } from "@/components/ui/shining-text";
import { AiAvatar } from "@/components/ui/plasma-shader";
import { AiHeader } from "@/components/AiHistorySidebar";
import { AiMessage } from "@/components/AiMessage";
import { GeneratingImageCard } from "@/components/GeneratingImageCard";
import type { AiPluginId } from "@/lib/ai-plugins";
import { generateImageFn } from "@/lib/image-gen.functions";
import { getAiProfileFn } from "@/lib/ai-profile.functions";
import { chatCreditsFn, recordChatUsageFn } from "@/lib/ai-credits.functions";
import type { AiProfile } from "@/lib/ai-profile.server";
import { useAccount } from "@/lib/use-account";
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

type Draft = {
  content: string;
  reasoning: string;
  sources?: ChatSource[];
  searchQuery?: string;
  analyzedImage?: boolean;
};

export type CatalogApp = { ID: string; App_name: string; Description: string };

let catalogCache: { at: number; list: CatalogApp[] } | null = null;

/** Katalog aplikasi dibaca dari endpoint publik /apps/index/applist.json. */
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


function AiChatPage() {
  const { userId, profile } = useAccount();
  const [aiProfile, setAiProfile] = useState<AiProfile | null>(null);
  const userName = aiProfile?.nickname?.trim() || profile?.name || profile?.username || null;
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
  const [imaging, setImaging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Selalu mulai dari chat baru saat halaman /ai dibuka.
    // Riwayat tetap dimuat, tapi tidak otomatis dibuka.
    setThreads(loadThreads(userId));
    setActiveId(null);
  }, [userId]);

  // Profil GetrixAI + kredit chat (khusus pengguna yang login).
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
      setThreads(next);
      saveThreads(userId, next);
    },
    [userId],
  );

  // Auto-scroll hanya kalau pengguna memang sedang berada di dasar percakapan,
  // dan tidak dipicu setiap karakter yang diketik AI.
  const atBottomRef = useRef(true);
  useEffect(() => {
    const onScroll = () => {
      atBottomRef.current =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 140;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (atBottomRef.current) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);


  function startNewChat() {
    setActiveId(null);
    setMenuOpen(false);
    setError(null);
    setInput("");
    setImage(null);
    setAttachedDocument(null);
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function run(
    history: ChatMessage[],
    attached: string | null,
    threadIdIn: string | null,
    baseIn: ChatThread[],
  ) {
    const lastUser = history[history.length - 1]?.content ?? "";
    let threadId = threadIdIn;
    let base = baseIn;
    if (!threadId) {
      threadId = newThreadId();
      base = [{ id: threadId, title: "", updatedAt: Date.now(), messages: history }, ...baseIn];
      setActiveId(threadId);
    } else {
      base = baseIn.map((t) =>
        t.id === threadId ? { ...t, updatedAt: Date.now(), messages: history } : t,
      );
    }
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

    // Watchdog: stall hanya memutus percobaan saat ini (bisa disambung ulang),
    // sedangkan MAX_MS memutus semuanya.
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

    // Langkah pra-jawaban (planner/vision/search) dibatasi sendiri supaya
    // tidak pernah menahan jawaban utama.
    const stepSignal = (ms: number) =>
      AbortSignal.any([controller.signal, AbortSignal.timeout(ms)]);

    let acc: Draft = { content: "", reasoning: "" };

    // Teks dimunculkan bertahap lewat rAF supaya burst chunk saat sinyal lag
    // tetap terlihat mengalir mulus, bukan patah-patah.
    let revealed = 0;
    let painting = true;
    let rafId: number | undefined;
    const paint = () => {
      const target = acc.content.length;
      if (revealed < target) {
        revealed = Math.min(target, revealed + Math.max(2, Math.ceil((target - revealed) / 6)));
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
      const deepResearch = plugin === "deepResearch";
      let needsReasoning = tool === "thinkLonger" || plugin === "deepResearch";
      let vision = "";

      // Katalog aplikasi + judul chat diambil paralel sejak awal supaya tidak
      // menahan jawaban utama.
      let catalogDone = false;
      const catalogPromise = fetchAppCatalog(controller.signal).then((list) => {
        catalogDone = true;
        return list;
      });
      const titlePromise = fetch("/api/ai-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: lastUser }),
        signal: stepSignal(15_000),
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((value: { title?: string } | null) => value?.title ?? "")
        .catch(() => "");


      // 1. Gambar → analisis visual dulu, lalu cari info akurat di web.
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
        // 2. Planner: perlu cari? perlu reasoning? judul chat.
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
            needsSearch = !!pj.needsSearch || forceSearch;
            needsReasoning = needsReasoning || !!pj.needsReasoning;
            queries = (pj.queries ?? []).filter(Boolean);
            query = queries[0] ?? pj.query ?? "";
            title = pj.title ?? "";
          }
        } catch {
          /* planner opsional */
        }
        if (forceSearch && !query) query = lastUser;
        if (queries.length === 0 && query) queries = [query];
      }

      // Judul dan query dibuat oleh dua AI spesialis terpisah agar planner
      // tidak mengorbankan ejaan atau kualitas query saat mengerjakan semuanya sekaligus.
      const titlePromise = fetch("/api/ai-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: lastUser }),
        signal: stepSignal(15_000),
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((value: { title?: string } | null) => value?.title ?? "")
        .catch(() => "");
      if (needsSearch) {
        const specialized = await fetch("/api/ai-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: lastUser, deep: deepResearch }),
          signal: stepSignal(15_000),
        })
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null) as { queries?: string[] } | null;
        const improved = (specialized?.queries ?? []).filter(Boolean);
        if (improved.length > 0) {
          queries = improved;
          query = improved[0] ?? query;
        }
      }
      title = (await titlePromise) || title;

      // 3. Pencarian web nyata via Serper.
      let search: { query?: string; direct?: string; results?: ChatSource[] } | null = null;
      if (needsSearch && query) {
        setStatus(
          deepResearch && queries.length > 1
            ? `Riset mendalam: ${queries.length} pencarian…`
            : `Mencari "${query}"`,
        );
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

      // 4. Jawaban streaming — dengan sambung-ulang otomatis kalau koneksi
      //    putus di tengah jalan (sinyal lag), supaya jawaban tidak patah.
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
          }),
          signal,
        });

        if (!res.ok || !res.body) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || "Gagal menghubungi AI.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
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
              const evt = JSON.parse(line.slice(5).trim()) as { type?: string; v?: string };
              if (evt.type === "done") closed = true;
              else if (evt.type === "reasoning")
                acc = { ...acc, reasoning: acc.reasoning + (evt.v ?? "") };
              else if (evt.type === "text") acc = { ...acc, content: acc.content + (evt.v ?? "") };
            } catch {
              /* skip */
            }
          }
          if (closed) {
            void reader.cancel().catch(() => {});
            return true;
          }
        }
        return true;
      };

      let finished = false;
      for (let tries = 0; tries < 3 && !finished; tries++) {
        try {
          finished = await runStream();
        } catch (err) {
          attempt.ctrl = null;
          // Pengguna menekan stop / batas total tercapai → jangan sambung ulang.
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
      persist(
        base.map((t) =>
          t.id === threadId
            ? {
                ...t,
                title: t.title || title || lastUser.slice(0, 40) || "Analisis gambar",
                updatedAt: Date.now(),
                messages: withReply,
              }
            : t,
        ),
      );
    } catch (e) {
      // Jangan pernah membuang jawaban yang sudah terlanjur diketik AI:
      // apa pun penyebab putusnya (abort, watchdog, jaringan), simpan bagian
      // yang sudah masuk sebagai jawaban.
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
        persist(
          base.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  title: t.title || lastUser.slice(0, 40) || "Analisis gambar",
                  updatedAt: Date.now(),
                  messages: withReply,
                }
              : t,
          ),
        );
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
      setLoading(false);
      setStatus(null);
      setDraft(null);
      // Jangan fokus ulang: itu membuat keyboard/input terbuka sendiri.
    }

  }

  async function runImage(prompt: string) {
    if (!userId) {
      setError("Masuk dulu ya untuk membuat gambar.");
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: prompt };
    const history = [...messages, userMsg];

    let threadId = activeId;
    let base = threads;
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat gambar.");
    } finally {
      setImaging(false);
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && !image) || loading || imaging) return;

    if (credits && credits.remaining <= 0) {
      setError("Kredit chat harian kamu sudah habis. Direset lagi pukul 07:00 WIB.");
      return;
    }

    if (plugin === "generateImage") {
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
    await run([...messages, userMsg], attached, activeId, threads);
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
          setMenuOpen(false);
        }}
        onNew={startNewChat}
        onDelete={(id) => {
          const next = threads.filter((t) => t.id !== id);
          persist(next);
          if (id === activeId) setActiveId(next[0]?.id ?? null);
        }}
        userName={userName}
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
                <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-variant md:size-8">
                  <User className="size-3.5 md:size-4" />
                </span>
              </div>

            ) : (
              <AiMessage
                key={i}
                message={m}
                onRegenerate={i === messages.length - 1 ? () => void regenerate() : undefined}
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
              <span key={status ?? "preparing"} className="mt-1 inline-block animate-status-swap">
                <ShiningText text={status ?? "Menyiapkan jawaban..."} />
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
          className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pb-6 pt-3"
        >
          <PromptBox
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
            onValueChange={setInput}
            onStop={stop}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            GetrixAI bisa keliru. Cek info penting lewat sumber yang tertera.
          </p>
        </form>
      </main>
    </div>
  );
}
