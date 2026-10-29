import { createFileRoute } from "@tanstack/react-router";

const API_BASE = "https://api.alquran.cloud/v1";
const SURAH_NAMES = [
  "Al-Fatihah",
  "Al-Baqarah",
  "Ali 'Imran",
  "An-Nisa",
  "Al-Ma'idah",
  "Al-An'am",
  "Al-A'raf",
  "Al-Anfal",
  "At-Taubah",
  "Yunus",
  "Hud",
  "Yusuf",
  "Ar-Ra'd",
  "Ibrahim",
  "Al-Hijr",
  "An-Nahl",
  "Al-Isra",
  "Al-Kahf",
  "Maryam",
  "Ta-Ha",
  "Al-Anbiya",
  "Al-Hajj",
  "Al-Mu'minun",
  "An-Nur",
  "Al-Furqan",
  "Asy-Syu'ara",
  "An-Naml",
  "Al-Qasas",
  "Al-Ankabut",
  "Ar-Rum",
  "Luqman",
  "As-Sajdah",
  "Al-Ahzab",
  "Saba",
  "Fatir",
  "Yasin",
  "As-Saffat",
  "Sad",
  "Az-Zumar",
  "Ghafir",
  "Fussilat",
  "Asy-Syura",
  "Az-Zukhruf",
  "Ad-Dukhan",
  "Al-Jasiyah",
  "Al-Ahqaf",
  "Muhammad",
  "Al-Fath",
  "Al-Hujurat",
  "Qaf",
  "Az-Zariyat",
  "At-Tur",
  "An-Najm",
  "Al-Qamar",
  "Ar-Rahman",
  "Al-Waqi'ah",
  "Al-Hadid",
  "Al-Mujadilah",
  "Al-Hasyr",
  "Al-Mumtahanah",
  "As-Saff",
  "Al-Jumu'ah",
  "Al-Munafiqun",
  "At-Tagabun",
  "At-Talaq",
  "At-Tahrim",
  "Al-Mulk",
  "Al-Qalam",
  "Al-Haqqah",
  "Al-Ma'arij",
  "Nuh",
  "Al-Jinn",
  "Al-Muzzammil",
  "Al-Muddassir",
  "Al-Qiyamah",
  "Al-Insan",
  "Al-Mursalat",
  "An-Naba",
  "An-Nazi'at",
  "Abasa",
  "At-Takwir",
  "Al-Infitar",
  "Al-Mutaffifin",
  "Al-Insyiqaq",
  "Al-Buruj",
  "At-Tariq",
  "Al-A'la",
  "Al-Gasyiyah",
  "Al-Fajr",
  "Al-Balad",
  "Asy-Syams",
  "Al-Lail",
  "Ad-Duha",
  "Asy-Syarh",
  "At-Tin",
  "Al-Alaq",
  "Al-Qadr",
  "Al-Bayyinah",
  "Az-Zalzalah",
  "Al-Adiyat",
  "Al-Qari'ah",
  "At-Takasur",
  "Al-Asr",
  "Al-Humazah",
  "Al-Fil",
  "Quraisy",
  "Al-Ma'un",
  "Al-Kausar",
  "Al-Kafirun",
  "An-Nasr",
  "Al-Lahab",
  "Al-Ikhlas",
  "Al-Falaq",
  "An-Nas",
];

type Ayah = {
  numberInSurah: number;
  text: string;
  translation?: string;
  transliteration?: string;
};

function compact(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function resolveSurah(input: string) {
  const text = input.toLowerCase();
  const number = text.match(/(?:q\.?\s*s\.?|surah|surat)\s*(\d{1,3})\b/i)?.[1];
  if (number && Number(number) >= 1 && Number(number) <= 114) return Number(number);

  const withoutPrefix = text
    .replace(/\b(?:q\.?\s*s\.?|surah|surat|ayat|ayatnya)\b/gi, " ")
    .replace(/\d{1,3}/g, " ");
  const normalized = compact(withoutPrefix);
  let best: { number: number; length: number } | null = null;
  for (let i = 0; i < SURAH_NAMES.length; i++) {
    const name = compact(SURAH_NAMES[i]);
    if (name && normalized.includes(name) && (!best || name.length > best.length)) {
      best = { number: i + 1, length: name.length };
    }
  }
  return best?.number ?? null;
}

function resolveAyahRange(input: string) {
  const match =
    input.match(/(?:q\.?\s*s\.?|surah|surat)\s*\d{1,3}\s*[:/]\s*(\d{1,3})(?:\s*(?:-|sampai)\s*(\d{1,3}))?/i) ??
    input.match(/(?:ayat|ayatnya)\s*(?:ke\s*)?(\d{1,3})(?:\s*(?:-|sampai)\s*(\d{1,3}))?/i);
  if (!match) return null;
  const from = Number(match[1]);
  const to = Number(match[2] ?? match[1]);
  if (from < 1 || to < from || to - from > 30) return null;
  return { from, to };
}

function formatMarkdown(
  arabicName: string,
  englishName: string,
  meaning: string,
  ayahs: Ayah[],
  includeTranslation: boolean,
) {
  const lines = [
    "<!-- quran -->",
    `## ${arabicName}`,
    `# ${englishName}`,
    `_${meaning}_`,
    "",
  ];
  for (const ayah of ayahs) {
    lines.push(`> **${ayah.text} ۝${ayah.numberInSurah}**`);
    if (ayah.transliteration) lines.push(">", `> _${ayah.transliteration}_`);
    if (includeTranslation && ayah.translation) lines.push(">", `> ${ayah.translation}`);
    lines.push(">", "---", "");
  }
  return lines.join("\n").trim();
}

export const Route = createFileRoute("/api/ai-surah")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { query?: string };
        try {
          body = (await request.json()) as { query?: string };
        } catch {
          return Response.json({ error: "Body tidak valid." }, { status: 400 });
        }

        const query = String(body.query ?? "").trim().slice(0, 500);
        const number = resolveSurah(query);
        if (!number) return Response.json({ found: false });

        const range = resolveAyahRange(query);
        const url = `${API_BASE}/surah/${number}/editions/quran-uthmani,id.indonesian,en.transliteration`;
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
          if (!response.ok) return Response.json({ error: "API Al-Qur'an sedang tidak tersedia." }, { status: 502 });
          const payload = (await response.json()) as {
            data?: {
              name?: string;
              englishName?: string;
              englishNameTranslation?: string;
              ayahs?: Ayah[];
            }[];
          };
          const arabic = payload.data?.[0];
          const translation = payload.data?.[1];
          const transliteration = payload.data?.[2];
          const allAyahs = (arabic?.ayahs ?? []).map((ayah, index) => ({
            ...ayah,
            translation: translation?.ayahs?.[index]?.text,
            transliteration: transliteration?.ayahs?.[index]?.text,
          }));
          const ayahs = range
            ? allAyahs.filter((ayah) => ayah.numberInSurah >= range.from && ayah.numberInSurah <= range.to)
            : allAyahs;
          if (!ayahs.length) return Response.json({ error: "Nomor ayat tidak ditemukan." }, { status: 404 });

          const name = arabic?.englishName || SURAH_NAMES[number - 1];
          const arabicName = arabic?.name || `سُورَةُ ${name}`;
          const meaning = arabic?.englishNameTranslation || "";
          const includeTranslation = !/arab saja|arabnya saja|tanpa terjemah/i.test(query);
          const markdown = formatMarkdown(arabicName, name, meaning, ayahs, includeTranslation);
          return Response.json({
            found: true,
            number,
            name,
            markdown,
            instruction:
              "Gunakan blok Markdown Al-Qur'an di bawah ini sebagai sumber utama. Pertahankan teks Arab dan nomor ayat persis; jangan mengubah ejaan Arab.",
          });
        } catch {
          return Response.json({ error: "Gagal mengambil data surah." }, { status: 502 });
        }
      },
    },
  },
});
