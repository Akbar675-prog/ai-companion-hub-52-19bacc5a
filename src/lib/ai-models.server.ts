import type { AiModel } from "./ai-models";

export type StoredAiModel = AiModel;

function toModel(row: StoredAiModel): AiModel {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    persona: row.persona,
    isNew: row.is_new,
    logo: row.logo ?? undefined,
    custom: true,
    realModel: row.real_model,
    modelType: row.model_type ?? undefined,
    abilities: row.abilities ?? undefined,
    endpointUrl: row.endpoint_url ?? undefined,
    endpointKey: row.endpoint_key ?? undefined,
  };
}

export async function listStoredAiModels(): Promise<AiModel[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ai_models")
    .select(
      "id, name, tagline, persona, is_new, logo, custom, real_model, model_type, abilities, endpoint_url",
    )
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Gagal memuat AI: ${error.message}`);
  return (data ?? []).map((row) =>
    toModel({
      ...row,
      isNew: row.is_new,
      realModel: row.real_model,
      modelType: row.model_type,
      endpointUrl: row.endpoint_url,
      endpointKey: row.endpoint_key,
    } as StoredAiModel),
  );
}

export async function saveStoredAiModel(model: AiModel): Promise<AiModel> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ai_models")
    .upsert(
      {
        id: model.id,
        name: model.name,
        tagline: model.tagline,
        persona: model.persona,
        is_new: model.isNew ?? false,
        logo: model.logo ?? null,
        custom: true,
        real_model: model.realModel ?? false,
        model_type: model.modelType ?? null,
        abilities: model.abilities ?? null,
        endpoint_url: model.endpointUrl ?? null,
        endpoint_key: model.endpointKey ?? null,
      },
      { onConflict: "id" },
    )
    .select(
      "id, name, tagline, persona, is_new, logo, custom, real_model, model_type, abilities, endpoint_url, endpoint_key",
    )
    .single();

  if (error || !data) throw new Error(`Gagal menyimpan AI: ${error?.message ?? "data kosong"}`);
  return toModel({
    ...data,
    isNew: data.is_new,
    realModel: data.real_model,
    modelType: data.model_type,
    endpointUrl: data.endpoint_url,
    endpointKey: data.endpoint_key,
  } as StoredAiModel);
}

export async function getStoredAiModelConnection(id: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ai_models")
    .select("endpoint_url, endpoint_key")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Gagal memuat konfigurasi AI: ${error.message}`);
  return data ?? undefined;
}

export async function deleteStoredAiModel(id: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("ai_models").delete().eq("id", id);
  if (error) throw new Error(`Gagal menghapus AI: ${error.message}`);
}
