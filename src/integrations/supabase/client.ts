
import { supabase } from "@/integrations/supabase/client";

// endpointKey hanya digunakan ketika admin mengirim perubahan.
// Nilainya tidak pernah diambil dari tabel katalog.
export type AiModel = {
  id: string;
  name: string;
  tagline: string;
  persona: string;
  isNew: boolean;
  logo: string;
  custom: boolean;
  realModel: string;
  modelType: string;
  abilities: string[];
  endpointUrl: string;
  endpointKey?: string;
};

type AiModelRow = {
  id: string;
  name: string;
  tagline: string;
  persona: string;
  is_new: boolean;
  logo: string;
  custom: boolean;
  real_model: string;
  model_type: string;
  abilities: string[];
  endpoint_url: string;
  is_active: boolean;
  sort_order: number;
};

function fromRow(row: AiModelRow): AiModel {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    persona: row.persona,
    isNew: row.is_new,
    logo: row.logo,
    custom: row.custom,
    realModel: row.real_model,
    modelType: row.model_type,
    abilities: row.abilities ?? [],
    endpointUrl: row.endpoint_url,
    // Jangan pernah mengembalikan endpointKey dari katalog.
  };
}

function toRow(model: AiModel, sortOrder = 0) {
  return {
    id: model.id,
    name: model.name,
    tagline: model.tagline ?? "",
    persona: model.persona ?? "",
    is_new: model.isNew ?? false,
    logo: model.logo ?? "",
    custom: model.custom ?? true,
    real_model: model.realModel ?? "",
    model_type: model.modelType ?? "chat",
    abilities: model.abilities ?? [],
    endpoint_url: model.endpointUrl ?? "",
    is_active: true,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };
}

async function saveSecret(modelId: string, endpointKey?: string) {
  // Kosong berarti jangan mengubah secret yang sudah tersimpan.
  if (!endpointKey?.trim()) return;

  const { error } = await supabase.functions.invoke(
    "manage-ai-model-secret",
    {
      body: {
        action: "upsert",
        modelId,
        endpointKey: endpointKey.trim(),
      },
    },
  );

  if (error) {
    throw new Error(`Gagal menyimpan API key: ${error.message}`);
  }
}

export async function allModels(): Promise<AiModel[]> {
  const { data, error } = await supabase
    .from("ai_models")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => fromRow(row as AiModelRow));
}

export async function loadCustomModels(): Promise<AiModel[]> {
  const models = await allModels();
  return models.filter((model) => model.custom);
}

export async function saveCustomModels(
  models: AiModel[],
): Promise<void> {
  for (const [index, model] of models.entries()) {
    await updateModel(model.id, {
      ...model,
      custom: true,
    });

    // Gán sort order trong một lần cập nhật riêng.
    const { error } = await supabase
      .from("ai_models")
      .update({ sort_order: index })
      .eq("id", model.id);

    if (error) throw error;
  }
}

export async function updateModel(
  id: string,
  patch: Partial<AiModel>,
): Promise<void> {
  const endpointKey = patch.endpointKey;
  const { endpointKey: _ignored, ...publicPatch } = patch;

  const columnMap: Record<string, string> = {
    isNew: "is_new",
    realModel: "real_model",
    modelType: "model_type",
    endpointUrl: "endpoint_url",
  };

  const dbPatch: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(publicPatch)) {
    if (value === undefined || key === "id") continue;
    dbPatch[columnMap[key] ?? key] = value;
  }

  dbPatch.updated_at = new Date().toISOString();

  if (Object.keys(dbPatch).length > 1) {
    const { error } = await supabase
      .from("ai_models")
      .update(dbPatch)
      .eq("id", id);

    if (error) throw error;
  }

  await saveSecret(id, endpointKey);
}

export async function deleteModel(id: string): Promise<void> {
  const { data, error: readError } = await supabase
    .from("ai_models")
    .select("custom")
    .eq("id", id)
    .maybeSingle();

  if (readError) throw readError;
  if (!data) return;

  if (data.custom) {
    const { error } = await supabase
      .from("ai_models")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return;
  }

  // Built-in models are hidden, not permanently deleted.
  const { error } = await supabase
    .from("ai_models")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function restoreBuiltins(): Promise<void> {
  // BUILTIN_MODELS adalah array bawaan yang sudah ada di file lu.
  const rows = BUILTIN_MODELS.map((model, index) => ({
    ...toRow({ ...model, custom: false }, index),
    is_active: true,
    custom: false,
  }));

  const { error } = await supabase
    .from("ai_models")
    .upsert(rows, { onConflict: "id" });

  if (error) throw error;
}

const SELECTED_MODEL_KEY = "gma:ai:model";

export function loadSelectedModelId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SELECTED_MODEL_KEY);
}

export function saveSelectedModelId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SELECTED_MODEL_KEY, id);
}

export async function modelById(
  id: string,
): Promise<AiModel | undefined> {
  const models = await allModels();
  return models.find((model) => model.id === id);
}
