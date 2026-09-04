/**
 * Read-only dump of the account (auth) Supabase project tables.
 * Auth: bearer token via Authorization header, ?bearer=, ?key=, ?api_key= or x-api-key.
 */

const DEFAULT_BEARER = "41e82c54d284b25399f2009c382eb7fbe5012729";

const TABLES = ["profiles", "follows", "user_roles", "verification_requests", "name_changes"] as const;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
} as const;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2) + "\n", {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...CORS,
    },
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

export async function handleAccountData(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const expected = normalizeToken(process.env["PUBLIC_API_BEARER"] || DEFAULT_BEARER);
  const provided = normalizeToken(extractToken(request, url));
  if (!provided || provided !== expected) {
    return json(
      {
        error: {
          message: "Invalid bearer token.",
          type: "invalid_request_error",
          code: "invalid_api_key",
        },
      },
      401,
    );
  }

  const wanted = (url.searchParams.get("table") || "").trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 1000) || 1000, 1), 10_000);
  const tables = wanted ? TABLES.filter((t) => t === wanted) : [...TABLES];
  if (wanted && tables.length === 0) {
    return json(
      {
        error: {
          message: `Unknown table "${wanted}". Available: ${TABLES.join(", ")}.`,
          type: "invalid_request_error",
          code: "unknown_table",
        },
      },
      400,
    );
  }

  let db: any;
  try {
    const mod = await import("@/integrations/auth-supabase/client.server");
    db = mod.authSupabaseAdmin as any;
  } catch (e) {
    return json(
      { error: { message: (e as Error).message, type: "server_error", code: "config_error" } },
      500,
    );
  }

  const result: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  await Promise.all(
    tables.map(async (table) => {
      const { data, error } = await db.from(table).select("*").limit(limit);
      if (error) {
        errors[table] = error.message;
        result[table] = [];
        return;
      }
      result[table] = (data ?? []).map((row: any, idx: number) => ({ idx, ...row }));
    }),
  );

  return json({
    object: "account_data",
    project: process.env["AUTH_SUPABASE_URL"] ?? null,
    generated_at: new Date().toISOString(),
    counts: Object.fromEntries(tables.map((t) => [t, (result[t] as unknown[]).length])),
    ...(Object.keys(errors).length ? { errors } : {}),
    tables: result,
  });
}
