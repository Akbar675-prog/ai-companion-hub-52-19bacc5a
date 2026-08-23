/**
 * OpenAI-compatible chat completions proxy.
 * Auth: bearer token via Authorization header, ?bearer=, ?key= or x-api-key.
 * Accepted token forms: lowercase hex, uppercase hex, and colon-separated hex.
 */

const MODEL = "deepseek/deepseek-chat";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
} as const;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS },
  });
}

function normalizeToken(raw: string): string {
  return raw.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
}

function extractToken(request: Request, url: URL): string {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  return (
    bearer ||
    url.searchParams.get("bearer") ||
    url.searchParams.get("key") ||
    url.searchParams.get("api_key") ||
    request.headers.get("x-api-key") ||
    ""
  );
}

type ChatMessage = { role: string; content: string };

type Body = {
  model?: string;
  messages?: { role?: string; content?: unknown }[];
  message?: string;
  prompt?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  system?: string;
};

function toMessages(body: Body, url: URL): ChatMessage[] {
  const out: ChatMessage[] = [];
  const system = body.system ?? url.searchParams.get("system");
  if (system) out.push({ role: "system", content: String(system).slice(0, 20_000) });

  if (Array.isArray(body.messages) && body.messages.length > 0) {
    for (const m of body.messages.slice(-80)) {
      const role = m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user";
      const content =
        typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
            ? (m.content as { text?: string }[]).map((p) => String(p?.text ?? "")).join("\n")
            : String(m.content ?? "");
      if (content.trim()) out.push({ role, content: content.slice(0, 400_000) });
    }
    return out;
  }

  const single =
    body.message ??
    body.prompt ??
    url.searchParams.get("message") ??
    url.searchParams.get("q") ??
    url.searchParams.get("prompt") ??
    "";
  if (String(single).trim()) out.push({ role: "user", content: String(single).slice(0, 400_000) });
  return out;
}

export async function handleChatCompletions(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const url = new URL(request.url);

  const expected = normalizeToken(process.env["PUBLIC_API_BEARER"] ?? "");
  const provided = normalizeToken(extractToken(request, url));
  if (!expected || !provided || provided !== expected) {
    return json(
      { error: { message: "Invalid bearer token.", type: "invalid_request_error", code: "invalid_api_key" } },
      401,
    );
  }

  const apiKey = process.env["PUBLIC_API_OPENROUTER_KEY"] ?? process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    return json({ error: { message: "Upstream API key is not configured.", type: "server_error" } }, 500);
  }

  let body: Body = {};
  if (request.method === "POST") {
    body = ((await request.json().catch(() => ({}))) ?? {}) as Body;
  }

  const messages = toMessages(body, url);
  if (messages.filter((m) => m.role !== "system").length === 0) {
    return json(
      {
        error: {
          message: 'No input. Send {"messages":[{"role":"user","content":"..."}]} or ?message=...',
          type: "invalid_request_error",
        },
      },
      400,
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        ...(typeof body.temperature === "number" ? { temperature: body.temperature } : {}),
        ...(typeof body.max_tokens === "number"
          ? { max_tokens: Math.max(1, Math.min(32_000, Math.round(body.max_tokens))) }
          : {}),
      }),
    });
  } catch {
    return json({ error: { message: "Upstream did not respond in time.", type: "upstream_timeout" } }, 504);
  }

  const raw = await upstream.text();
  if (!upstream.ok) {
    return json(
      { error: { message: `Upstream error (${upstream.status}): ${raw.slice(0, 400)}`, type: "upstream_error" } },
      502,
    );
  }

  let parsed: {
    id?: string;
    created?: number;
    choices?: { index?: number; message?: { role?: string; content?: string }; finish_reason?: string }[];
    usage?: Record<string, unknown>;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: { message: "Upstream returned invalid JSON.", type: "upstream_error" } }, 502);
  }

  const choice = parsed.choices?.[0];
  const usage = (parsed.usage ?? {}) as {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;

  return json({
    id: parsed.id ?? `chatcmpl-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: parsed.created ?? Math.floor(Date.now() / 1000),
    model: MODEL,
    choices: [
      {
        index: choice?.index ?? 0,
        message: {
          role: choice?.message?.role ?? "assistant",
          content: choice?.message?.content ?? "",
        },
        finish_reason: choice?.finish_reason ?? "stop",
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: usage.total_tokens ?? promptTokens + completionTokens,
    },
  });
}
