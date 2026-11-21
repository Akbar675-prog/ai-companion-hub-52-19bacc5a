import { createServerFn } from "@tanstack/react-start";

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
  .inputValidator((d: { query: string; ratio: number }) => d)
  .handler(async ({ data }) => {
    const key = process.env.SERPER_API_KEY;
    if (!key) throw new Error("SERPER_API_KEY belum diset di server");

    const query = String(data.query ?? "").trim().slice(0, 200);
    const target = Number.isFinite(data.ratio) && data.ratio > 0 ? data.ratio : 1;
    if (!query) return { originals: [] as string[], thumbs: [] as string[] };

    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, gl: "id", hl: "id", num: 10 }),
    });
    if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);

    const json = (await res.json()) as { images?: SerperImage[] };
    const ranked = (json.images ?? [])
      .map((im) => ({ im, score: shapeScore(im, target) }))
      .sort((a, b) => a.score - b.score || (b.im.imageWidth ?? 0) - (a.im.imageWidth ?? 0))
      .map((x) => x.im);

    return {
      originals: ranked.flatMap((i) => (i.imageUrl ? [i.imageUrl] : [])).slice(0, 5),
      thumbs: ranked.flatMap((i) => (i.thumbnailUrl ? [i.thumbnailUrl] : [])).slice(0, 3),
    };
  });

