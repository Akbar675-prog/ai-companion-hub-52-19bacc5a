import type { ImageResolver } from "@/components/GenUi";

const TTL_MS = 3 * 24 * 60 * 60 * 1000; // cache URL di browser 3 hari (hemat kredit Serper)
const PREFIX = "genui-img:";

type SearchImageFn = (input: {
  data: { query: string; ratio: number };
}) => Promise<{ originals: string[]; thumbs: string[] }>;

function cacheKey(query: string, ratio: number) {
  const shape = ratio < 0.85 ? "potret" : ratio > 1.2 ? "lanskap" : "kotak";
  return `${query}|${shape}`;
}

/** Resolve jika gambar berhasil dimuat browser (bukan 1x1 / ikon kecil). */
function probe(url: string, ms = 6000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^https?:\/\//i.test(url)) {
      reject(new Error("URL gambar tidak valid"));
      return;
    }
    const img = new Image();
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
  try {
    return await Promise.any(urls.map((url) => probe(url)));
  } catch {
    return null;
  }
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

export function invalidateSerperImageCache(query: string, ratio: number) {
  try {
    localStorage.removeItem(PREFIX + cacheKey(query, ratio));
  } catch {
    /* penyimpanan diblokir */
  }
}

export function createSerperResolver(searchImages: SearchImageFn): ImageResolver {
  return async (rawQuery, ratio) => {
    const query = rawQuery.trim().slice(0, 200);
    if (!query) return null;
    const key = cacheKey(query, ratio);

    const cached = readCache(key);
    if (cached) {
      const stillLoads = await probe(cached).then(() => true).catch(() => false);
      if (stillLoads) return cached;
      invalidateSerperImageCache(query, ratio);
    }

    const { originals, thumbs } = await searchImages({ data: { query, ratio } });
    const url = (await firstOk(originals)) ?? (await firstOk(thumbs));
    if (url) writeCache(key, url);
    return url;
  };
}

