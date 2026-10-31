// Profil khusus GetrixAI (terpisah dari profil akun /profile).
// Disimpan di storage bucket app-metadata: ai-profile/<userId>.json

const BUCKET = "app-metadata";

export type AiVoiceAgent = {
  id: string;
  name: string;
  image: string;
};

export type AiProfile = {
  nickname: string;
  fullName: string;
  age: number | null;
  about: string;
  voiceAgents: AiVoiceAgent[];
  selectedVoiceId: string;
};

export const EMPTY_AI_PROFILE: AiProfile = {
  nickname: "",
  fullName: "",
  age: null,
  about: "",
  voiceAgents: [],
  selectedVoiceId: "",
};

function keyFor(userId: string) {
  return `ai-profile/${userId}.json`;
}

export async function listAiVoiceAgents(): Promise<AiVoiceAgent[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("ai_voice_agents")
    .select("voice_id, name, image_data, is_selected")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Gagal memuat voice agent: ${error.message}`);
  return (data ?? [])
    .sort((a: any, b: any) => Number(Boolean(b.is_selected)) - Number(Boolean(a.is_selected)))
    .map((v: any) => ({
      id: String(v.voice_id),
      name: String(v.name),
      image: String(v.image_data ?? "").slice(0, 2_000_000),
    }));
}

export async function readAiProfile(userId: string): Promise<AiProfile> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(BUCKET).download(keyFor(userId));
  let p: Partial<AiProfile> = {};
  if (data) {
    try {
      p = JSON.parse(await data.text()) as Partial<AiProfile>;
    } catch {
      p = {};
    }
  }
  let voiceAgents: AiVoiceAgent[] = [];
  try {
    voiceAgents = await listAiVoiceAgents();
  } catch {
    // Voice table may not be migrated yet; the rest of the profile remains usable.
  }
  const selectedVoiceId = voiceAgents.find((v) => v.id === p.selectedVoiceId)?.id ?? voiceAgents[0]?.id ?? "";
  return {
    nickname: String(p.nickname ?? "").slice(0, 40),
    fullName: String(p.fullName ?? "").slice(0, 80),
    age: typeof p.age === "number" && p.age > 0 ? Math.min(120, Math.round(p.age)) : null,
    about: String(p.about ?? "").slice(0, 600),
    voiceAgents,
    selectedVoiceId,
  };
}

export async function writeAiProfile(userId: string, profile: Partial<AiProfile>): Promise<AiProfile> {
  const existing = await readAiProfile(userId);
  const clean: AiProfile = {
    nickname: String(profile.nickname ?? existing.nickname).trim().slice(0, 40),
    fullName: String(profile.fullName ?? existing.fullName).trim().slice(0, 80),
    age: profile.age !== undefined ? (profile.age && profile.age > 0 ? Math.min(120, Math.round(profile.age)) : null) : existing.age,
    about: String(profile.about ?? existing.about).trim().slice(0, 600),
    voiceAgents: profile.voiceAgents ?? existing.voiceAgents,
    selectedVoiceId: profile.selectedVoiceId ?? existing.selectedVoiceId,
  };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const body = new Blob(
    [JSON.stringify({
      nickname: clean.nickname,
      fullName: clean.fullName,
      age: clean.age,
      about: clean.about,
      selectedVoiceId: clean.selectedVoiceId,
    })],
    { type: "application/json" },
  );
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(keyFor(userId), body, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return clean;
}

export async function saveAiVoiceAgent(
  userId: string,
  voice: AiVoiceAgent,
): Promise<AiProfile> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const existing = await listAiVoiceAgents();
  const { error } = await (supabaseAdmin as any).from("ai_voice_agents").upsert(
    {
      voice_id: voice.id.trim().slice(0, 80),
      name: voice.name.trim().slice(0, 60),
      image_data: voice.image.trim().slice(0, 2_000_000),
      is_selected: existing.length === 0,
    },
    { onConflict: "voice_id" },
  );
  if (error) throw new Error(`Gagal menyimpan voice agent: ${error.message}`);
  return readAiProfile(userId);
}

export async function deleteAiVoiceAgent(userId: string, voiceId: string): Promise<AiProfile> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await (supabaseAdmin as any)
    .from("ai_voice_agents")
    .delete()
    .eq("voice_id", voiceId);
  if (error) throw new Error(`Gagal menghapus voice agent: ${error.message}`);
  return readAiProfile(userId);
}

export async function selectAiVoiceAgent(userId: string, voiceId: string): Promise<AiProfile> {
  const voices = await listAiVoiceAgents();
  if (!voices.some((voice) => voice.id === voiceId)) throw new Error("Voice agent tidak ditemukan.");
  return writeAiProfile(userId, { selectedVoiceId: voiceId });
}
