import type { ImageResolver } from "@/components/GenUi";
import { searchGenUiImagesFn } from "./genui-image.functions";

const TTL_MS = 3 * 24 * 60 * 60 * 1000; // cache URL di browser 3 hari (hemat kredit Serper)
const PREFIX = "genui-img:";

/** Resolve jika gambar berhasil dimuat browser (bukan 1x1 / ikon kecil). */
function probe(url: string, ms = 6000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    const timer = window.setTimeout(() => {
      img.src = "";
      reject(new Error("timeout"));
    }, ms);
    img.onload = () => {
      window.clearTimeout(timer);
      if (img.naturalWidth < 40 || img.naturalHeight < 40) reject(new Error("terlalu kecil"));
      else resolve(url);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("gagal dimuat"));
    };
    img.src = url;
  });
}

/** Ambil URL pertama (urutan prioritas dijaga) yang berhasil dimuat. */
async function firstOk(urls: string[]): Promise<string | null> {
  if (!urls.length) return null;
  const results = await Promise.allSettled(urls.map((u) => probe(u)));
  const i = results.findIndex((r) => r.status === "fulfilled");
  return i >= 0 ? urls[i] : null;
}

function readCache(key: string): string | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { url, at } = JSON.parse(raw) as { url: string; at: number };
    return Date.now() - at < TTL_MS ? url : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, url: string) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ url, at: Date.now() }));
  } catch {
    /* penyimpanan penuh / diblokir */
  }
}

export const serperResolver: ImageResolver = async (query, ratio) => {
  const shape = ratio < 0.85 ? "potret" : ratio > 1.2 ? "lanskap" : "kotak";
  const key = `${query}|${shape}`;

  const cached = readCache(key);
  if (cached) return cached;

  const { originals, thumbs } = await searchGenUiImagesFn({ data: { query, ratio } });
  const url = (await firstOk(originals)) ?? (await firstOk(thumbs));
  if (url) writeCache(key, url);
  return url;
};

