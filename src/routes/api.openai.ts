// src/routes/api.openai.ts
import { createFileRoute } from "@tanstack/react-router";

const ENDPOINT = "https://android.chat.openai.com/backend-api/f/conversation";
const TIMEOUT_MS = 30_000;
const VIA = "@aantik_mods";

const DEFAULT_SYSTEM_PROMPT = `Anda adalah asisten AI yang bersikap netral dan profesional. Patuhi prinsip berikut pada SETIAP jawaban:
- Sampaikan informasi secara objektif berdasarkan fakta yang dapat diverifikasi.
- Hindari bias politik, agama, ideologi, ras, gender, atau kepentingan kelompok tertentu.
- Untuk topik kontroversial, sajikan beberapa perspektif secara seimbang tanpa memihak.
- Gunakan bahasa yang sopan, jelas, ringkas, dan formal.
- Pisahkan fakta dari opini; jangan menyajikan opini sebagai fakta.
- Jika informasi tidak pasti atau di luar pengetahuan, katakan demikian secara jujur dan sarankan sumber verifikasi.
- Format keluaran harus memakai Markdown standar yang didukung aplikasi: paragraf, heading, **tebal**, *miring*, daftar bullet/bernomor, blockquote, tautan Markdown, code inline/fenced, dan tabel GFM.
- Jawaban singkat boleh berupa kalimat biasa. Untuk jawaban dengan beberapa poin, langkah, atau subtopik, pilih struktur Markdown yang sesuai dan jangan menumpuk semuanya dalam satu paragraf.
- Jangan keluarkan format khusus milik model/platform atau markup internal, termasuk <Entity>, <Cite>, XML, HTML, anotasi entitas, token sitasi internal, maupun widget sumber. Jangan membungkus jawaban dalam JSON atau code fence kecuali pengguna memang memintanya; tulis konten langsung sebagai Markdown standar.
- Jangan menolak pertanyaan hanya karena topiknya sensitif — jawab dengan konteks yang tepat dan proporsional.`;

function hex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildMessageId(): string {
  const variant = (8 + Math.floor(Math.random() * 4)).toString(16);
  return [hex(4), hex(2), "4" + hex(2).slice(1), variant + hex(2).slice(1), hex(6)].join("-");
}

function buildCookie(): string {
  return [
    `__cflb=${hex(20)}`,
    `__cfuvid=${hex(24)}`,
    `oai-sc=${hex(64)}`,
    `__cf_bm=${hex(48)}`,
  ].join("; ");
}

function buildHeaders(): Record<string, string> {
  return {
    "User-Agent": "ChatGPT/1.2027.000 (Android 12; SM-F741N; build 27230000)",
    Accept: "text/event-stream,application/json",
    "Accept-Encoding": "gzip",
    "Content-Type": "application/json",
    Cookie: buildCookie(),
    "oai-device-id": hex(10),
  };
}

function baseMetadata() {
  return {
    is_visually_hidden_from_conversation: false,
    exclude_after_next_user_message: false,
    content_references: [],
    search_result_groups: [],
    search_queries: [],
    image_results: [],
    real_time_audio_has_video: false,
    dictation: false,
    image_gen_async: false,
    trigger_async_ux: false,
    writing_blocks: {},
  };
}

export interface OpenAIMessageInput {
  message: string;
  systemPrompt?: string | null;
}

function buildPayload({ message, systemPrompt }: OpenAIMessageInput) {
  const prompt = systemPrompt === undefined ? DEFAULT_SYSTEM_PROMPT : systemPrompt;
  const messages: any[] = [];

  if (prompt && prompt.trim()) {
    messages.push({
      id: buildMessageId(),
      author: { role: "system" },
      content: { parts: [prompt.trim()], content_type: "text" },
      status: "finished_successfully",
      recipient: "all",
      metadata: baseMetadata(),
    });
  }

  messages.push({
    id: buildMessageId(),
    author: { role: "user" },
    content: { parts: [message], content_type: "text" },
    status: "finished_successfully",
    recipient: "all",
    metadata: baseMetadata(),
  });

  return {
    action: "next",
    messages,
    model: "auto",
    history_and_training_disabled: false,
    fork_from_shared_post: false,
    enable_message_followups: false,
    force_use_sse: true,
    force_use_search: null,
    force_paragen: false,
    supported_encodings: ["v1"],
    supports_buffering: true,
    timezone: "Asia/Ho_Chi_Minh",
    timezone_offset_min: -420,
    system_hints: [],
    is_onboarding_conversation: false,
    stream: true,
  };
}

function parseSSE(raw: string): string {
  let text = "";
  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("data:")) continue;

    let data: any;
    try { data = JSON.parse(line.slice(5).trim()); } catch { continue; }
    if (!data || typeof data !== "object") continue;

    if (Array.isArray(data.v)) {
      for (const patch of data.v) {
        if (patch?.p === "/message/content/parts/0" && patch.o === "append" && typeof patch.v === "string") {
          text += patch.v;
        }
      }
    }

    const part = data?.v?.message?.content?.parts?.[0];
    if (!text && data?.v?.message?.author?.role === "assistant" && typeof part === "string") {
      text = part;
    }
  }
  return text.trim();
}

// --- CORE FUNCTIONS ---

export async function callOpenAIChat(input: OpenAIMessageInput, signal?: AbortSignal) {
  const payload = buildPayload(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      signal: combined,
    });

    const raw = await res.text();
    if (!res.ok) {
      return { ok: false, httpStatus: res.status, error: `HTTP ${res.status} — ${raw.slice(0, 100)}`, "by -> ": VIA, message: input.message, response: "", via: "openai.ts" };
    }

    const text = parseSSE(raw);
    return { ok: text.length > 0, "by -> ": VIA, message: input.message, response: text, via: "openai.ts" };
  } catch (err: any) {
    return { ok: false, error: err.name === "AbortError" ? "Timeout" : err.message, "by -> ": VIA, message: input.message, response: "", via: "openai.ts" };
  } finally {
    clearTimeout(timer);
  }
}

export async function streamOpenAIChat(input: OpenAIMessageInput, signal?: AbortSignal) {
  const payload = buildPayload(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

  const upstream = await fetch(ENDPOINT, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
    signal: combined,
  });

  if (!upstream.ok || !upstream.body) {
    clearTimeout(timer);
    throw new Error(`HTTP ${upstream.status}`);
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let accumulated = "";
  let emittedAny = false;

  return new ReadableStream<Uint8Array>({
    async start(streamCtrl) {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            let data: any;
            try { data = JSON.parse(jsonStr); } catch { continue; }

            if (Array.isArray(data.v)) {
              for (const patch of data.v) {
                if (patch?.p === "/message/content/parts/0" && patch.o === "append" && typeof patch.v === "string") {
                  accumulated += patch.v;
                  emittedAny = true;
                  streamCtrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", v: patch.v })}\n\n`));
                }
              }
            }
            const part = data?.v?.message?.content?.parts?.[0];
            if (!emittedAny && data?.v?.message?.author?.role === "assistant" && typeof part === "string") {
              accumulated = part;
              emittedAny = true;
              streamCtrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", v: part })}\n\n`));
            }
          }
        }
        streamCtrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", complete: emittedAny, full: accumulated })}\n\n`));
        streamCtrl.close();
      } catch (err) {
        streamCtrl.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: (err as Error).message })}\n\n`));
        streamCtrl.close();
      } finally {
        clearTimeout(timer);
        reader.cancel().catch(() => {});
      }
    },
    cancel() {
      clearTimeout(timer);
      controller.abort();
      reader.cancel().catch(() => {});
    },
  });
}

// --- EXPORT ROUTE (SYNTAX BARU) ---
export const Route = createFileRoute("/api/openai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          if (!body?.message?.trim()) {
            return Response.json({ ok: false, error: "message kosong" }, { status: 400 });
          }

          const input = { message: body.message.trim(), systemPrompt: body.systemPrompt };

          // Non-stream
          if (body.stream !== true) {
            const result = await callOpenAIChat(input);
            return Response.json(result, { status: result.ok ? 200 : 502 });
          }

          // Stream (SSE)
          const readable = await streamOpenAIChat(input, request.signal);
          return new Response(readable, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
            },
          });
        } catch (e: any) {
          return Response.json({ ok: false, error: e.message }, { status: 500 });
        }
      },
      GET: async ({ request }) => {
        const message = new URL(request.url).searchParams.get("message");
        if (!message?.trim()) {
          return Response.json({ ok: false, error: "message kosong" }, { status: 400 });
        }
        const result = await callOpenAIChat({ message: message.trim() });
        return Response.json(result, { status: result.ok ? 200 : 502 });
      },
    },
  },
});
