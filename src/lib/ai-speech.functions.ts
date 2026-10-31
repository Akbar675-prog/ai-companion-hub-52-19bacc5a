import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccountAuth } from "@/integrations/auth-supabase/auth-middleware";

export function speechText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12_000);
}

export const speakAiTextFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        text: z.string().trim().min(1).max(20_000),
        voiceId: z.string().trim().regex(/^[A-Za-z0-9_-]{8,80}$/),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY belum dikonfigurasi.");
    const text = speechText(data.text);
    if (!text) return { audio: "" };

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${data.voiceId}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      throw new Error(`ElevenLabs gagal membuat suara (${response.status})${detail ? `: ${detail}` : "."}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer()).toString("base64");
    return { audio: `data:audio/mpeg;base64,${bytes}` };
  });
