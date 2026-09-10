/** Kemampuan khusus yang bisa diberikan ke sebuah model di /ai/addai.
 *  Pengguna menulis daftar tag seper"-CODE-AGENT, -DEEP-THINKING". */

export type AbilityInfo = {
  tag: string;
  label: string;
  /** Instruksi yang benar-benar dikirim ke model. */
  prompt: string;
  /** Butuh mode penalaran (reasoning) diaktifkan. */
  reasoning?: boolean;
};

export const ABILITIES: AbilityInfo[] = [
  {
    tag: "-DEEP-THINKING",
    label: "Berpikir mendalam",
    reasoning: true,
    prompt:
      "MODE BERPIKIR MENDALAM AKTIF. Sebelum menjawab, lakukan penalaran internal yang benar-benar menyeluruh: pahami maksud asli pertanyaan, pecah masalah jadi bagian-bagian, daftar fakta yang diketahui vs asumsi, pertimbangkan minimal tiga kemungkinan jawaban/pendekatan beserta risikonya, uji jawabanmu dengan mencari kesalahan sendiri (self-critique), lalu perbaiki. Jawaban akhir harus menampilkan hasil pemikiran itu: alasan kunci, asumsi penting, dan batasan. Jangan pernah menjawab dangkal atau menebak; kalau data kurang, sebutkan apa yang kurang lalu berikan jawaban terbaik yang mungkin.",
  },
  {
    tag: "-COMPLEX-THINKING",
    label: "Penalaran kompleks",
    reasoning: true,
    prompt:
      "MODE PENALARAN KOMPLEKS AKTIF. Tangani masalah bertingkat secara sistematis: buat kerangka langkah, kerjakan tiap langkah secara berurutan dengan hasil antara yang eksplisit, jaga konsistensi antar langkah, hitung/verifikasi ulang angka dan logika sebelum menyimpulkan, dan tunjukkan rantai sebab-akibat singkat pada jawaban akhir. Bila ada trade-off, bandingkan dalam tabel markdown yang valid.",
  },
  {
    tag: "-CODE-AGENT",
    label: "Agentic coding",
    reasoning: true,
    prompt:
      "MODE AGENTIC CODING AKTIF. Bertindak seperti software engineer agent, bukan sekadar penjawab. Untuk tugas terkait kode: (1) tulis rencana kerja singkat berisi langkah dan file yang akan dibuat/diubah, (2) hasilkan kode LENGKAP dan siap jalan per file, dalam blok kode dengan penanda bahasa dan path file di baris pertama sebagai komentar, tanpa placeholder seperti \"...\" atau \"TODO\", (3) sebutkan perintah instalasi/menjalankan, (4) tuliskan cara verifikasi (test atau langkah manual) dan kasus tepi yang sudah ditangani, (5) tinjau ulang kodemu sendiri, sebutkan bug potensial dan perbaiki sebelum mengirim. Ikuti bahasa/framework yang dipakai pengguna, dan jangan mengarang API yang tidak ada.",
  },
  {
    tag: "-WEB-RESEARCH",
    label: "Riset web",
    prompt:
      "MODE RISET AKTIF. Utamakan data pencarian web yang tersedia, kutip dengan rujukan bernomor [1], [2], bandingkan sumber bila berbeda, dan tandai jelas bagian yang belum terverifikasi.",
  },
  {
    tag: "-VISION-DETAIL",
    label: "Analisis gambar detail",
    prompt:
      "MODE ANALISIS GAMBAR DETAIL AKTIF. Bila ada gambar atau deskripsi visual, uraikan objek, teks yang terbaca, gaya, konteks, dan kemungkinan identitas subjek, lalu sebutkan tingkat keyakinanmu.",
  },
  {
    tag: "-MATH-RIGOR",
    label: "Matematika ketat",
    reasoning: true,
    prompt:
      "MODE MATEMATIKA KETAT AKTIF. Kerjakan langkah demi langkah, tulis rumus yang dipakai, periksa satuan, dan verifikasi hasil dengan cara kedua sebelum menyimpulkan.",
  },
  {
    tag: "-LONG-FORM",
    label: "Jawaban panjang",
    prompt:
      "MODE JAWABAN PANJANG AKTIF. Tulis jawaban komprehensif dengan sub-judul, contoh nyata, dan ringkasan akhir.",
  },
  {
    tag: "-CONCISE",
    label: "Sangat ringkas",
    prompt: "MODE RINGKAS AKTIF. Jawab sesingkat mungkin tanpa kehilangan informasi penting.",
  },
];

/** Ubah teks bebas jadi daftar tag rapi, contoh: "code-agent, DEEP THINKING". */
export function parseAbilities(input: string | null | undefined): string[] {
  if (!input) return [];
  return Array.from(
    new Set(
      String(input)
        .split(/[,\n;]+/)
        .map((t) => t.trim().toUpperCase().replace(/\s+/g, "-").replace(/^-+/, ""))
        .filter(Boolean)
        .map((t) => `-${t}`),
    ),
  ).slice(0, 12);
}

export function abilityPrompts(tags: string[]): { prompt: string; reasoning: boolean } {
  let prompt = "";
  let reasoning = false;
  for (const tag of tags) {
    const known = ABILITIES.find((a) => a.tag === tag);
    if (known) {
      prompt += `\n\n${known.prompt}`;
      if (known.reasoning) reasoning = true;
    } else {
      prompt += `\n\nMODE ${tag.replace(/^-/, "")} AKTIF. Terapkan kemampuan ini sepenuhnya pada setiap jawaban, sesuai makna namanya, dengan kualitas terbaik.`;
    }
  }
  return { prompt, reasoning };
}
