import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai-query")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["OPENROUTER_API_KEY"];
        if (!key) return Response.json({ queries: [] });
        const body = (await request.json().catch(() => ({}))) as {
          message?: string;
          deep?: boolean;
        };
        const message = String(body.message ?? "").trim().slice(0, 6000);
        const count = body.deep ? 3 : 1;
        if (!message) return Response.json({ queries: [] });
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "stealth/space-bunny-alpha",
            messages: [
              {
                role: "system",
                content: `Ubah permintaan menjadi ${count} query mesin pencari yang presisi dalam bahasa pengguna. Perbaiki typo, pertahankan entitas (contoh ID berarti Indonesia bila konteksnya negara), perluas singkatan ambigu berdasarkan konteks, tambahkan tahun hanya bila relevan. Jangan menyalin gaya percakapan. ${count === 3 ? "Ketiga query harus membahas sudut berbeda." : ""} Balas JSON saja: {"queries":["..."]}.`,
              },
              { role: "user", content: message },
            ],
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) return Response.json({ queries: [] });
        const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
        const raw = String(json.choices?.[0]?.message?.content ?? "{}");
        try {
          const match = raw.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(match?.[0] ?? raw) as { queries?: unknown[] };
          const queries = (parsed.queries ?? [])
            .map((query) => String(query).replace(/\s+/g, " ").trim().slice(0, 200))
            .filter(Boolean)
            .slice(0, count);
          return Response.json({ queries });
        } catch {
          return Response.json({ queries: [] });
        }
      },
    },
  },
});
