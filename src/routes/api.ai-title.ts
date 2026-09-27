import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai-title")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["OPENROUTER_API_KEY"];
        if (!key) return Response.json({ title: "" });
        const body = (await request.json().catch(() => ({}))) as { message?: string };
        const message = String(body.message ?? "").trim().slice(0, 6000);
        if (!message) return Response.json({ title: "" });
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "stealth/space-bunny-alpha",
            messages: [
              {
                role: "system",
                content:
                  "Buat judul percakapan Bahasa Indonesia 2-5 kata. Pertahankan ejaan nama, singkatan, dan istilah dari pesan dengan tepat. Rangkum maksudnya, jangan menyalin kalimat mentah, jangan pakai tanda kutip/titik. Balas judul saja.",
              },
              { role: "user", content: message },
            ],
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) return Response.json({ title: "" });
        const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
        const title = String(json.choices?.[0]?.message?.content ?? "")
          .replace(/["“”'.]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 60);
        return Response.json({ title });
      },
    },
  },
});
