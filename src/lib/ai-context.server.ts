// Konteks tambahan untuk GetrixAI (instruksi admin + katalog aplikasi).
// PENTING: jangan panggil createServerFn dari dalam route handler — itu memicu
// HTTP call ke server sendiri dan bisa menggantung sangat lama. Di sini kita
// query Supabase langsung, dengan batas waktu supaya jawaban AI tidak tertahan.

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function instructionsBlock(): Promise<string> {
  const { readInstructions } = await import("@/lib/ai-training.server");
  const instructions = await readInstructions();
  if (instructions.length === 0) return "";
  return (
    "\n\nINSTRUKSI KHUSUS DARI ADMIN (prioritas tertinggi, ikuti bila relevan dengan pertanyaan pengguna):\n" +
    instructions.map((i, idx) => `${idx + 1}. ${i.text}`).join("\n")
  );
}

async function factsBlock(): Promise<string> {
  const { readFacts } = await import("@/lib/ai-facts.server");
  const facts = await readFacts();
  if (facts.length === 0) return "";
  return (
    "\n\nINFO RESMI (fakta yang sudah diverifikasi admin — pakai ini sebagai jawaban pasti, jangan dibantah atau dikarang ulang):\n" +
    facts.map((f) => `- ${f.label}: ${f.value}`).join("\n")
  );
}

export async function getAiExtraContext(): Promise<string> {
  const [instructions, facts] = await Promise.all([
    withTimeout(instructionsBlock(), 1200, ""),
    withTimeout(factsBlock(), 1200, ""),
  ]);
  return instructions + facts;
}
