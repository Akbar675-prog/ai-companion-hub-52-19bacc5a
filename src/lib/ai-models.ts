/** Daftar "model" yang bisa dipilih pengguna di halaman /ai.
 *  Semua model ini memakai mesin AI yang sama (GetrixAI) — perbedaannya hanya
 *  gaya jawaban (persona) supaya terasa seperti model premium. */

export type AiModel = {
  id: string;
  name: string;
  tagline: string;
  /** Ditambahkan ke instruksi sistem supaya gaya jawabannya terasa berbeda. */
  persona: string;
  /** Menampilkan label "Baru" di samping nama model. */
  isNew?: boolean;
  /** URL logo untuk model buatan pengguna. */
  logo?: string;
  /** Model buatan pengguna dari halaman /ai/addai. */
  custom?: boolean;
};

export const BUILTIN_MODELS: AiModel[] = [
  {
    id: "getrix-core",
    name: "GetrixAI Core",
    tagline: "Cepat, seimbang, cocok untuk obrolan harian.",
    persona:
      "Jawab ringkas, hangat, dan langsung ke inti. Hindari basa-basi panjang.",
  },
  {
    id: "claude-opus-5",
    name: "Claude Opus 5",
    tagline: "Penalaran mendalam dengan tulisan rapi dan terstruktur.",
    isNew: true,
    persona:
      "Bergayalah seperti asisten kelas premium: jawaban terstruktur dengan poin atau sub-judul bila membantu, penalaran eksplisit namun padat, nada sopan dan tenang, serta selalu sebutkan asumsi penting dan batasan jawabanmu.",
  },
  {
    id: "gpt-5-6-sol",
    name: "GPT-5.6 Sol",
    tagline: "Serba bisa, kuat untuk analisis dan koding.",
    isNew: true,
    persona:
      "Bergayalah seperti model serba bisa kelas atas: analitis, presisi, sertakan contoh konkret atau potongan kode bila relevan, dan tutup dengan kesimpulan singkat yang bisa langsung dipakai.",
  },
  {
    id: "gemini-3-7-flash",
    name: "Gemini 3.7 Flash",
    tagline: "Super cepat untuk jawaban singkat dan ide kilat.",
    isNew: true,
    persona:
      "Bergayalah super cepat dan efisien: jawab dalam kalimat pendek atau poin singkat, fokus pada informasi paling berguna, tanpa pengulangan.",
  },
];

export const DEFAULT_MODEL_ID = BUILTIN_MODELS[0]!.id;

const CUSTOM_KEY = "gma:ai:custom-models";
const SELECTED_KEY = "gma:ai:model";

export function loadCustomModels(): AiModel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    const parsed = raw ? (JSON.parse(raw) as AiModel[]) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((m) => m && typeof m.id === "string" && typeof m.name === "string")
          .map((m) => ({ ...m, custom: true }))
      : [];
  } catch {
    return [];
  }
}

export function saveCustomModels(list: AiModel[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  } catch {
    /* storage penuh / diblokir */
  }
}

export function loadSelectedModelId(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL_ID;
  return window.localStorage.getItem(SELECTED_KEY) || DEFAULT_MODEL_ID;
}

export function saveSelectedModelId(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SELECTED_KEY, id);
  } catch {
    /* ignore */
  }
}

export function allModels(): AiModel[] {
  return [...BUILTIN_MODELS, ...loadCustomModels()];
}

export function modelById(id: string | null | undefined, list: AiModel[]): AiModel {
  return list.find((m) => m.id === id) ?? BUILTIN_MODELS[0]!;
}
