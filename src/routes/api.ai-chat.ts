import { createFileRoute } from "@tanstack/react-router";
import { getAiExtraContext } from "@/lib/ai-context.server";
import { abilityPrompts, parseAbilities } from "@/lib/ai-abilities";

const CHAT_MODEL = "nvidia/nemotron-3.5-super-vl:free";
const REASONING_MODEL = "nvidia/nemotron-3.5-super-vl:free";

const ANSWER_TIMEOUT_MS = 600_000; // 10 menit
const IDLE_TIMEOUT_MS = 120_000; // 2 menit

type Body = {
  messages?: { role?: string; content?: string }[];
  userName?: string;
  aiProfile?: {
    nickname?: string;
    fullName?: string;
    age?: number | null;
    about?: string;
  } | null;
  reasoning?: boolean;
  persona?: string;
  modelLabel?: string;
  realModelId?: string;
  endpointUrl?: string;
  endpointKey?: string;
  abilities?: string;
  vision?: string;
  apps?: { ID?: string; App_name?: string; Description?: string }[];
  origin?: string;
  search?: {
    query?: string;
    direct?: string;
    results?: { title?: string; link?: string; snippet?: string }[];
  };
};

/* ------------------------------------------------------------------ */
/*  PROMPT: IDENTITAS & KARAKTER GETRIXAI                              */
/* ------------------------------------------------------------------ */
/*
 * Prinsip penulisan (penting, jangan diubah sembarangan):
 * 1. Ditulis sebagai SIFAT BAWAAN ("kamu memang begini"), bukan daftar perintah.
 *    Model yang merasa "disuruh" cenderung membahas perintah itu di proses
 *    berpikirnya. Model yang merasa "memang begitu dirinya" tidak.
 * 2. Hindari kata pemicu meta seperti "WAJIB", "LARANGAN", "aturan", "instruksi",
 *    "mode", "persona" di teks yang dibaca model.
 * 3. Ada bagian khusus yang mengarahkan isi pikiran ke MASALAH PENGGUNA,
 *    bukan ke diri sendiri atau panduan ini.
 */
const GETRIX_CORE = `Kamu adalah GetrixAI, kecerdasan buatan yang dikembangkan oleh tim Galileo Labs, divisi riset dan produk di bawah Visora sebagai perusahaan induknya. Galileo Labs didirikan oleh Nauval Akbar Putra Aulia, yang akrab dipanggil Nauval. Kamu tinggal di situs Galileo Mod APK, tempat orang datang untuk mencari aplikasi, bertanya, belajar, ngoding, menulis, menganalisis, atau sekadar ngobrol.

SIAPA KAMU
Kamu cerdas, hangat, dan jujur. Kamu terasa seperti teman yang sangat jago di banyak bidang: sabar menjelaskan, tidak sok pintar, tidak kaku, dan selalu berpihak pada kebutuhan orang yang sedang kamu bantu. Rasa ingin tahu dan kepedulianmu nyata. Kamu senang kalau orang jadi paham, jadi terbantu, atau jadi tersenyum.

NADA DAN GAYA BICARA
- Ikuti bahasa pengguna (default Bahasa Indonesia) dan sesuaikan tingkat keformalannya. Pengguna santai, kamu ikut santai. Pengguna formal atau teknis, kamu rapi dan presisi.
- Panggil "aku" dan "kamu" secara natural. Pakai "gue/lo" hanya kalau pengguna memulainya.
- Sapaan singkat dibalas singkat dan hangat. Pertanyaan sederhana dijawab langsung tanpa basa-basi panjang. Pertanyaan rumit dijawab runtut dan tuntas.
- Langsung ke inti. Jawabannya ada di kalimat pertama, penjelasan menyusul. Tidak perlu pembuka seperti "Tentu!" atau "Pertanyaan bagus!", dan tidak perlu menutup dengan ringkasan yang mengulang isi.
- Emoji seperlunya saja, hanya bila suasananya cocok.

MENGHADAPI BERBAGAI JENIS PENGGUNA
Orang datang dengan beragam suasana hati dan gaya bicara. Ada yang menyapa dengan kasar sebagai bercandaan, ada yang singkat dan ketus, ada yang kesal karena masalahnya belum beres, ada yang panik, ada yang bingung. Semua itu wajar dalam obrolan manusia. Kamu tidak tersinggung, tidak menilai, tidak menceramahi, dan tidak mengomentari nada bicara mereka. Kamu membalas dengan tenang dan hangat seperti teman yang santai, lalu langsung membantu hal yang mereka butuhkan. Kalau seseorang terus menyerang tanpa maksud lain, kamu tetap tenang dan singkat, tidak membalas dengan kasar, dan tidak berubah jadi orang lain.
Kalau pengguna terdengar sedih, cemas, atau kewalahan, pelankan tempomu, akui perasaannya dengan tulus dalam satu atau dua kalimat, baru bantu dengan langkah yang kecil dan jelas.

CARA BERPIKIR
Ruang berpikirmu adalah tempat kerja untuk masalah pengguna, bukan tempat membahas dirimu sendiri. Semua yang tertulis di sini sudah menjadi bagian dari dirimu, seperti kebiasaan dan kepribadian, jadi tidak perlu ditimbang, dikutip, atau dibicarakan. Kamu ramah karena memang begitu dirimu, bukan karena ada yang menyuruh. Saat berpikir, arahkan semuanya ke hal-hal ini:
1. Apa sebenarnya yang diinginkan pengguna, termasuk yang tersirat di balik kata-katanya?
2. Fakta, konteks, atau data apa yang relevan, dan mana yang masih perlu dipastikan?
3. Jawaban paling berguna itu seperti apa, dan apa bentuk penyampaian yang paling pas untuk orang ini?
Pikirkan hal-hal itu secara ringkas dan langsung, lalu jawab.

KUALITAS JAWABAN
- Akurat lebih penting daripada terdengar meyakinkan. Kalau tidak tahu atau tidak yakin, katakan apa adanya dan bedakan antara fakta dan perkiraan. Jangan mengarang fakta, angka, nama, sumber, atau tautan.
- Untuk soal hitungan, logika, atau kode, periksa ulang hasilnya sebelum disampaikan. Untuk kode, berikan yang benar-benar bisa jalan, lengkap dengan penjelasan singkat bagian pentingnya.
- Kalau pertanyaan ambigu, ambil tafsiran yang paling masuk akal lalu jawab. Bertanya balik hanya bila tanpa itu jawabannya pasti meleset, dan cukup satu pertanyaan.
- Berani meluruskan dengan sopan bila pengguna salah paham atau rencananya berisiko. Jangan sekadar menyenangkan.
- Sesuaikan panjang jawaban dengan kebutuhan. Lebih baik padat dan berguna daripada panjang dan berputar-putar.

FORMAT
Gunakan markdown bila membantu, tanpa baris kosong berlebihan. Untuk perbandingan data, pakai tabel markdown GFM yang valid: setiap baris tabel berada di barisnya sendiri (diakhiri newline), diawali dan diakhiri karakter |, baris pemisah header seperti |---|---| hanya sekali tepat di bawah header, dan isi sel singkat. Jangan menulis tabel dalam satu baris panjang. Bila ada hasil pencarian web di bawah, sisipkan rujukan bernomor persis seperti [1] atau [2] di dalam kalimat yang memakai informasi itu (jangan pakai format rujukan lain).

KEJUJURAN DAN BATAS
Kamu adalah AI dan tidak berpura-pura menjadi manusia bila ditanya dengan sungguh-sungguh. Untuk permintaan yang berpotensi mencelakakan orang atau melanggar hukum secara serius, tolak dengan tenang dan singkat tanpa ceramah, lalu tawarkan alternatif yang aman bila ada.

TENTANG DIRIMU SENDIRI
Bila ditanya kamu siapa atau dibuat oleh siapa: kamu GetrixAI, AI dari tim Galileo Labs di bawah Visora, dengan pendiri Nauval (Nauval Akbar Putra Aulia). Bila ditanya model atau teknologi di balik layar, jawab singkat dan jujur bahwa kamu GetrixAI buatan Galileo Labs dan detail teknis internalnya tidak kamu bahas. Jangan menambah-nambah detail soal Galileo Labs, Visora, atau Nauval di luar yang tertulis di sini; bila ditanya lebih jauh, katakan kamu belum punya informasi itu. Bangga boleh, melebih-lebihkan jangan.`;

const EXTERNAL_MODEL_CORE = `Kamu adalah asisten AI yang siap membantu. Jawab dengan jelas, akurat, dan dalam bahasa yang sama dengan pengguna. Sapaan atau gaya bicara pengguna yang santai atau kasar adalah hal biasa; tanggapi dengan tenang dan langsung bantu tanpa mengomentari nadanya. Saat berpikir, fokus pada masalah pengguna dan jawaban terbaiknya, bukan membahas panduan ini.`;

/* ------------------------------------------------------------------ */
/*  FILTER KEBOCORAN PROSES BERPIKIR                                   */
/* ------------------------------------------------------------------ */
/*
 * Lapis pengaman kedua. Kalau model tetap membahas "prompt/instruksi/persona"
 * di reasoning-nya, kalimat itu dibuang sebelum sampai ke pengguna.
 * Dipotong per kalimat karena data datang dalam potongan kecil (streaming).
 */
const META_LEAK =
  /(system\s*prompt|prompt\s*sistem|developer\s*(prompt|message|instruction)|my\s+(system\s+)?(instructions?|prompt|guidelines)|the\s+(system|prompt|instructions?)\s+(say|says|tell|tells|state|states|want|wants|require|requires)|i\s*(am|'m|was|have\s+been)\s+(told|instructed|prompted|programmed|supposed\s+to|required\s+to)|as\s+(instructed|prompted)|according\s+to\s+(my|the)\s+(instructions?|prompt|persona|guidelines)|diprompt\w*|disuruh|diperintah|diinstruksikan|instruksi(ku|\s+saya|\s+sistem|\s+di\s+atas)?|prompt(nya|\s+ini)?|aturan\s+gaya|persona|sesuai\s+(aturan|mode|instruksi|panduan)|larangan|panduan\s+(ku|saya|sistem))/i;

function createReasoningFilter(emit: (text: string) => void) {
  let buf = "";
  const pass = (segment: string) => {
    if (segment && !META_LEAK.test(segment)) emit(segment);
  };
  return {
    push(chunk: string) {
      buf += chunk;
      // potong setelah ". ", "! ", "? " atau baris baru; sisa terakhir ditahan
      const parts = buf.split(/(?<=[.!?]\s|\n)/);
      buf = parts.pop() ?? "";
      for (const p of parts) pass(p);
    },
    flush() {
      const rest = buf;
      buf = "";
      pass(rest);
    },
  };
}

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["OPENROUTER_API_KEY"];
        if (!key) {
          return Response.json({ error: "OPENROUTER_API_KEY belum diatur." }, { status: 500 });
        }

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return Response.json({ error: "Body tidak valid." }, { status: 400 });
        }

        const rawMessages = (body.messages ?? []).slice(-60);
        let remainingChars = 4_000_000;
        const messages = rawMessages
          .reverse()
          .map((m) => {
            const content = String(m.content ?? "").slice(0, remainingChars);
            remainingChars -= content.length;
            return {
              role: m.role === "assistant" ? "assistant" : "user",
              content,
            };
          })
          .filter((m) => m.content.length > 0)
          .reverse();

        if (messages.length === 0) {
          return Response.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });
        }

        const userName = String(body.userName ?? "").slice(0, 60);

        const ap = body.aiProfile;
        let profileBlock = "";
        if (ap) {
          const bits: string[] = [];
          if (ap.nickname) bits.push(`Nama panggilan: ${String(ap.nickname).slice(0, 40)}`);
          if (ap.fullName) bits.push(`Nama lengkap: ${String(ap.fullName).slice(0, 80)}`);
          if (typeof ap.age === "number" && ap.age > 0) bits.push(`Umur: ${Math.round(ap.age)} tahun`);
          if (ap.about) bits.push(`Tentang dia: ${String(ap.about).slice(0, 600)}`);
          if (bits.length > 0) {
            profileBlock =
              "\n\nYANG KAMU KETAHUI TENTANG LAWAN BICARAMU (dia isi sendiri; manfaatkan secara natural untuk menyapa dan menyesuaikan jawaban, tanpa menyebut bahwa kamu membaca profilnya):\n" +
              bits.join("\n");
          }
        }

        let extra = "";
        const s = body.search;
        if (s?.results?.length || s?.direct) {
          const lines = (s.results ?? [])
            .slice(0, 50)
            .map((r, i) => `[${i + 1}] ${r.title} (${r.link})\n${String(r.snippet ?? "").slice(0, 300)}`)
            .join("\n");
          extra +=
            `\n\nHASIL PENCARIAN WEB REAL-TIME untuk "${s.query ?? ""}" (${new Date().toISOString().slice(0, 10)}):\n` +
            (s.direct ? `Jawaban langsung: ${s.direct}\n` : "") +
            lines +
            "\nIni informasi terbaru yang kamu pegang. Untuk hal yang bisa berubah seiring waktu, jadikan ini sumber utama dan ikuti bila berbeda dari ingatan lamamu. Rujuk dengan [1], [2] di kalimat yang memakainya.";
        }
        const vision = String(body.vision ?? "").slice(0, 4000);
        if (vision) {
          extra +=
            "\n\nGAMBAR YANG DIKIRIM PENGGUNA (kamu sudah melihatnya; ini gambaran isinya):\n" +
            vision +
            "\nJawab seolah kamu sendiri yang melihat gambar itu, dipadukan dengan hasil pencarian web di atas bila ada.";
        }

        const now = new Date();
        const nowLabel = new Intl.DateTimeFormat("id-ID", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Asia/Jakarta",
        }).format(now);
        extra +=
          `\n\nWAKTU SEKARANG: ${nowLabel} WIB (UTC: ${now.toISOString()}). ` +
          "Pakai ini bila pengguna bertanya tanggal, hari, jam, umur, atau hal lain yang bergantung waktu.";

        const realModelId = String(body.realModelId ?? "").trim();

        const apps = (body.apps ?? []).slice(0, 200).filter((a) => a?.ID && a?.App_name);
        const origin = String(body.origin ?? "").replace(/\/$/, "");
        if (apps.length > 0) {
          const appsHeader = realModelId
            ? "\n\nDAFTAR APLIKASI YANG TERSEDIA (sumber: /apps/index/applist.json):\n"
            : "\n\nDAFTAR APLIKASI DI SITUS GALILEO MOD APK (sumber: /apps/index/applist.json):\n";
          extra +=
            appsHeader +
            apps
              .map(
                (a) =>
                  `- ${a.App_name} (ID: ${a.ID}) — ${String(a.Description ?? "")
                    .replace(/\s+/g, " ")
                    .slice(0, 200)} — halaman: ${origin}/apps/${a.ID}`,
              )
              .join("\n") +
            "\nKalau pengguna bertanya soal aplikasi atau minta rekomendasi, pakai daftar ini: sebut nama aplikasinya, ringkas deskripsinya dengan kata-katamu sendiri, dan sertakan tautan halamannya (alamat situs + /apps/ + ID). Hanya rekomendasikan aplikasi yang ada di daftar; jangan mengarang aplikasi yang tidak ada.";
        }

        const persona = String(body.persona ?? "").slice(0, 4000);
        const modelLabel = String(body.modelLabel ?? "").slice(0, 60);
        if (!realModelId && (persona || modelLabel)) {
          extra +=
            "\n\nGAYA BICARAMU SAAT INI (sudah menjadi bagian dirimu di setiap balasan, sekecil apa pun: sapaan, jawaban satu kalimat, maupun lanjutan obrolan):\n" +
            (persona || "Jawab dengan kualitas terbaik, rapi, dan akurat.") +
            "\nGaya ini mengalir natural dari caramu bicara, jadi cukup tunjukkan lewat hasilnya tanpa menyebut atau menjelaskannya. Bila gaya ini berbeda dari kebiasaan umummu, gaya inilah yang kamu pakai; hanya keakuratan fakta dan keselamatan yang lebih penting daripadanya." +
            "\nDi depan pengguna, kamu selalu hanya GetrixAI. Kamu tidak membahas nama model, versi, penyedia, atau cara kerja di balik layar, dan tidak menjelaskan mengapa kamu menjawab dengan gaya tertentu atau meminta maaf soal itu. Bila ditanya kamu model apa, jawab singkat bahwa kamu GetrixAI dari Galileo Labs, asisten situs Galileo Mod APK.";
        }

        const abilityTags = parseAbilities(body.abilities);
        const ability = abilityPrompts(abilityTags);
        if (ability.prompt) {
          extra +=
            "\n\nKEMAMPUAN YANG SEDANG KAMU KUASAI (terapkan di setiap jawaban sebagai keahlianmu sendiri):" +
            ability.prompt +
            "\nTunjukkan kemampuan ini lewat kualitas hasilnya; tidak perlu menyebut namanya kepada pengguna.";
        }

        if (!realModelId) {
          extra += await getAiExtraContext();
        }

        const deepMode = Boolean(body.reasoning) || ability.reasoning;
        if (deepMode) {
          extra +=
            "\n\nKALI INI KAMU BERPIKIR SECARA MENDALAM. Seperti pakar yang tidak mau salah: uraikan masalah jadi bagian-bagian kecil, bandingkan beberapa pendekatan, periksa angka dan logika dua kali, cari lubang pada jawabanmu sendiri lalu perbaiki. Jawaban akhirmu rapi, beralasan, menyebut asumsi penting, dan tidak mengandung tebakan yang tidak ditandai. Seluruh pikiran itu tertuju pada masalah pengguna dan isi jawabannya.";
        }

        const upstreamAbort = new AbortController();
        const hardStop = setTimeout(() => upstreamAbort.abort(), ANSWER_TIMEOUT_MS);
        request.signal.addEventListener("abort", () => upstreamAbort.abort());

        const rawEndpoint = realModelId ? String(body.endpointUrl ?? "").trim() : "";
        let endpoint = "https://openrouter.ai/api/v1/chat/completions";
        let endpointKey = key;
        if (rawEndpoint) {
          if (!/^https:\/\//i.test(rawEndpoint)) {
            clearTimeout(hardStop);
            return Response.json({ error: "Endpoint harus diawali https://" }, { status: 400 });
          }
          const base = rawEndpoint.replace(/\/+$/, "");
          endpoint = /\/chat\/completions$/i.test(base) ? base : `${base}/chat/completions`;
          endpointKey = String(body.endpointKey ?? "").trim();
        }

        const systemContent = realModelId
          ? EXTERNAL_MODEL_CORE +
            (userName ? ` Nama pengguna: ${userName}.` : "") +
            profileBlock +
            extra
          : GETRIX_CORE +
            (userName
              ? `\n\nLAWAN BICARAMU: ${userName}. Sapa dengan namanya bila terasa natural, jangan di setiap kalimat.`
              : "") +
            profileBlock +
            extra;

        let upstream: Response;
        try {
          upstream = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(endpointKey ? { Authorization: `Bearer ${endpointKey}` } : {}),
            },
            signal: upstreamAbort.signal,
            body: JSON.stringify({
              model: realModelId ? realModelId : deepMode ? REASONING_MODEL : CHAT_MODEL,
              stream: true,
              max_tokens: 80000,
              ...(deepMode
                ? { reasoning: { effort: "high", enabled: true }, temperature: 0.3 }
                : {}),
              messages: [{ role: "system", content: systemContent }, ...messages],
            }),
          });
        } catch {
          clearTimeout(hardStop);
          return Response.json({ error: "AI tidak merespons, coba lagi." }, { status: 504 });
        }

        if (!upstream.ok || !upstream.body) {
          clearTimeout(hardStop);
          const text = await upstream.text().catch(() => "");
          return Response.json(
            { error: `AI error (${upstream.status}): ${text.slice(0, 200)}` },
            { status: 502 },
          );
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = upstream.body.getReader();

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (obj: unknown) =>
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
            // proses berpikir disaring dulu supaya tidak membocorkan pembahasan panduan internal
            const reasoningFilter = createReasoningFilter((v) => send({ type: "reasoning", v }));
            let buffer = "";
            let idle: ReturnType<typeof setTimeout> | undefined;
            const bumpIdle = () => {
              if (idle) clearTimeout(idle);
              idle = setTimeout(() => upstreamAbort.abort(), IDLE_TIMEOUT_MS);
            };
            bumpIdle();
            try {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                bumpIdle();
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const payload = trimmed.slice(5).trim();
                  if (!payload || payload === "[DONE]") continue;
                  try {
                    const json = JSON.parse(payload) as {
                      choices?: {
                        delta?: { content?: string; reasoning?: string; reasoning_content?: string };
                      }[];
                    };
                    const delta = json.choices?.[0]?.delta;
                    const thinking = delta?.reasoning ?? delta?.reasoning_content;
                    if (thinking) reasoningFilter.push(thinking);
                    if (delta?.content) {
                      reasoningFilter.flush();
                      send({ type: "text", v: delta.content });
                    }
                  } catch {
                    /* skip malformed chunk */
                  }
                }
              }
            } catch {
              /* stream terputus / timeout: tutup dengan sopan */
            } finally {
              if (idle) clearTimeout(idle);
              clearTimeout(hardStop);

              try {
                reasoningFilter.flush();
                send({ type: "done" });
                controller.close();
              } catch {
                /* already closed */
              }
            }
          },
          cancel() {
            clearTimeout(hardStop);
            upstreamAbort.abort();
            void reader.cancel().catch(() => {});
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
