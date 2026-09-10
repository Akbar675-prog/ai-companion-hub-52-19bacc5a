import { createFileRoute } from "@tanstack/react-router";

const VISION_MODEL = "nex-agi/nex-n2.5-pro:free";

export const Route = createFileRoute("/api/ai-vision")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["OPENROUTER_API_KEY"];
        if (!key)
          return Response.json({ error: "OPENROUTER_API_KEY belum diatur." }, { status: 500 });

        let body: { image?: string; question?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Body tidak valid." }, { status: 400 });
        }

        const image =
          typeof body.image === "string" && body.image.startsWith("data:image/")
            ? body.image
            : null;
        if (!image) return Response.json({ error: "Gambar tidak valid." }, { status: 400 });

        const question = String(body.question ?? "").slice(0, 800);

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: VISION_MODEL,
            messages: [
              {
                role: "system",
                content:
                  'You inspect an image and reply ONLY with JSON: {"description": string, "query": string, "title": string}.\n' +
                  "- description: detailed Indonesian description of what is in the image (objects, text, style, franchise/character/product guesses, any readable text or logos). Max 120 words.\n" +
                  "- query: a short ENGLISH web-search query (max 10 words) that would confirm/identify the subject of the image or answer the user's question about it. Never empty.\n" +
                  "- title: very short Indonesian chat title (max 5 words).",
              },
              {
                role: "user",
                content: [
                  { type: "text", text: question || "Identifikasi gambar ini." },
                  { type: "image_url", image_url: { url: image } },
                ],
              },
            ],
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          return Response.json(
            { error: `Vision error (${res.status}): ${text.slice(0, 200)}` },
            { status: 502 },
          );
        }

        const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const raw = json.choices?.[0]?.message?.content ?? "{}";
        try {
          const match = raw.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(match ? match[0] : raw) as {
            description?: string;
            query?: string;
            title?: string;
          };
          return Response.json({
            description: String(parsed.description ?? "").slice(0, 2000),
            query: String(parsed.query ?? "").slice(0, 120),
            title: String(parsed.title ?? "").slice(0, 60),
          });
        } catch {
          return Response.json({ description: raw.slice(0, 2000), query: "", title: "" });
        }
      },
    },
  },
});
