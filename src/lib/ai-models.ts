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
  /** Bila true, pakai model resmi (modelType) alih-alih prompting/persona. */
  realModel?: boolean;
  /** ID model resmi, contoh: nvidia/nemotron-3.5-lightning:free */
  modelType?: string;
  /** Kemampuan khusus, contoh: "-CODE-AGENT, -DEEP-THINKING" */
  abilities?: string;
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
const OVERRIDE_KEY = "gma:ai:model-overrides";
const HIDDEN_KEY = "gma:ai:hidden-models";

type Override = Partial<
  Pick<
    AiModel,
    "name" | "tagline" | "persona" | "logo" | "isNew" | "realModel" | "modelType" | "abilities"
  >
>;


function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage penuh / diblokir */
  }
}

export function loadCustomModels(): AiModel[] {
  const parsed = readJson<AiModel[]>(CUSTOM_KEY, []);
  return Array.isArray(parsed)
    ? parsed
        .filter((m) => m && typeof m.id === "string" && typeof m.name === "string")
        .map((m) => ({ ...m, custom: true }))
    : [];
}

export function saveCustomModels(list: AiModel[]) {
  writeJson(CUSTOM_KEY, list);
}

export function loadOverrides(): Record<string, Override> {
  const o = readJson<Record<string, Override>>(OVERRIDE_KEY, {});
  return o && typeof o === "object" ? o : {};
}

export function loadHiddenIds(): string[] {
  const h = readJson<string[]>(HIDDEN_KEY, []);
  return Array.isArray(h) ? h.filter((x) => typeof x === "string") : [];
}

/** Simpan hasil edit sebuah model (bawaan maupun kustom). */
export function updateModel(id: string, patch: Override) {
  const customs = loadCustomModels();
  const idx = customs.findIndex((c) => c.id === id);
  if (idx >= 0) {
    const next = [...customs];
    next[idx] = { ...next[idx]!, ...patch };
    if (!patch.logo) delete next[idx]!.logo;
    saveCustomModels(next);
    return;
  }
  const overrides = loadOverrides();
  overrides[id] = { ...(overrides[id] ?? {}), ...patch };
  writeJson(OVERRIDE_KEY, overrides);
}

/** Hapus model: kustom dibuang, bawaan disembunyikan. */
export function deleteModel(id: string) {
  const customs = loadCustomModels();
  if (customs.some((c) => c.id === id)) {
    saveCustomModels(customs.filter((c) => c.id !== id));
    return;
  }
  const hidden = loadHiddenIds();
  if (!hidden.includes(id)) writeJson(HIDDEN_KEY, [...hidden, id]);
}

/** Kembalikan model bawaan ke kondisi awal (batalkan edit & sembunyikan). */
export function restoreBuiltins() {
  writeJson(OVERRIDE_KEY, {});
  writeJson(HIDDEN_KEY, []);
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
  const overrides = loadOverrides();
  const hidden = new Set(loadHiddenIds());
  const list = [...BUILTIN_MODELS, ...loadCustomModels()]
    .filter((m) => !hidden.has(m.id))
    .map((m) => ({ ...m, ...(overrides[m.id] ?? {}) }));
  return list.length > 0 ? list : [BUILTIN_MODELS[0]!];
}

export function modelById(id: string | null | undefined, list: AiModel[]): AiModel {
  return list.find((m) => m.id === id) ?? list[0] ?? BUILTIN_MODELS[0]!;
}

