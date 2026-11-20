import { createFileRoute } from "@tanstack/react-router";

type SerperJson = {
  answerBox?: { answer?: string; snippet?: string; title?: string; link?: string };
  knowledgeGraph?: { title?: string; description?: string };
  organic?: { title?: string; link?: string; snippet?: string; date?: string }[];
};

let nextKeyIndex = 0;

function serperKeys() {
  return [1, 2, 3]
    .map((index) => process.env[`SERPER_GOOGLE_API_${index}`]?.trim())
    .filter((key): key is string => Boolean(key));
}

async function searchWithKeyRotation(query: string, num: number, keys: string[]) {
  const start = nextKeyIndex++ % keys.length;
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = keys[(start + attempt) % keys.length];
    try {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": key, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num }),
        signal: AbortSignal.timeout(12_000),
      });
      if (response.ok) return (await response.json()) as SerperJson;
      // Hanya pindah key untuk limit/kuota atau kredensial yang ditolak.
      if (response.status !== 429 && response.status !== 403) return null;
    } catch {
      return null;
    }
  }
  return null;
}

export const Route = createFileRoute("/api/ai-search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const keys = serperKeys();
        if (keys.length === 0) {
          return Response.json(
            { error: "SERPER_GOOGLE_API_1, SERPER_GOOGLE_API_2, atau SERPER_GOOGLE_API_3 belum diatur." },
            { status: 500 },
          );
        }

        let body: { query?: string; queries?: string[]; limit?: number };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Body tidak valid." }, { status: 400 });
        }

        const queries = (
          Array.isArray(body.queries) && body.queries.length > 0 ? body.queries : [body.query ?? ""]
        )
          .map((q) => String(q ?? "").trim().slice(0, 200))
          .filter(Boolean)
          .slice(0, 3);

        if (queries.length === 0) return Response.json({ error: "Query kosong." }, { status: 400 });

        // Total maksimal 50 web; dibagi rata ke tiap query.
        const limit = Math.min(50, Math.max(1, Number(body.limit) || (queries.length > 1 ? 50 : 8)));
        const perQuery = Math.min(30, Math.ceil(limit / queries.length));

        const responses = await Promise.all(
          queries.map((query) => searchWithKeyRotation(query, perQuery, keys)),
        );

        if (responses.every((r) => r === null))
          return Response.json({ error: "Search error." }, { status: 502 });

        const seen = new Set<string>();
        const results: { title: string; link: string; snippet: string }[] = [];
        let direct = "";

        for (const json of responses) {
          if (!json) continue;
          if (!direct) {
            direct =
              json.answerBox?.answer ||
              json.answerBox?.snippet ||
              (json.knowledgeGraph?.title
                ? `${json.knowledgeGraph.title}: ${json.knowledgeGraph.description ?? ""}`
                : "");
          }
          for (const r of json.organic ?? []) {
            const link = r.link ?? "";
            if (!link || seen.has(link)) continue;
            seen.add(link);
            results.push({
              title: r.title ?? "",
              link,
              snippet: [r.date, r.snippet].filter(Boolean).join(" — "),
            });
            if (results.length >= limit) break;
          }
          if (results.length >= limit) break;
        }

        return Response.json({ query: queries[0], queries, direct, results });
      },
    },
  },
});
