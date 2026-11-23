import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Pencarian gambar Serper di SERVER (API key tidak pernah sampai ke browser).
 * Kunci: set env SERPER_API_KEY.
 * Mengembalikan kandidat yang sudah diurutkan dari bentuk paling mirip rasio bingkai;
 * pengecekan "bisa dimuat atau tidak" dilakukan di browser (lihat genui-images.ts),
 * karena hotlink-blocking bergantung pada browser pengguna, bukan server.
 */

type SerperImage = {
  imageUrl?: string;
  thumbnailUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
};

function shapeScore(im: SerperImage, target: number) {
  if (!im.imageWidth || !im.imageHeight) return 0.6;
  return Math.abs(Math.log(im.imageWidth / im.imageHeight / target));
}

export const searchGenUiImagesFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        query: z.string().trim().min(1).max(200),
        ratio: z.number().finite().positive().max(10),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env["SERPER_API_KEY"];
    if (!key) throw new Error("SERPER_API_KEY belum diset di server");

    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: data.query, gl: "id", hl: "id", num: 10 }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);

    const json = (await res.json()) as { images?: SerperImage[] };
    const ranked = (json.images ?? [])
      .map((im) => ({ im, score: shapeScore(im, data.ratio) }))
      .sort((a, b) => a.score - b.score || (b.im.imageWidth ?? 0) - (a.im.imageWidth ?? 0))
      .map((x) => x.im);

    return {
      originals: ranked.flatMap((i) => (i.imageUrl ? [i.imageUrl] : [])).slice(0, 5),
      thumbs: ranked.flatMap((i) => (i.thumbnailUrl ? [i.thumbnailUrl] : [])).slice(0, 3),
    };
  });

