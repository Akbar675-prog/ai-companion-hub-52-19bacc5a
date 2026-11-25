import { describe, expect, test } from "bun:test";
import { mergeStreamContinuation } from "../src/lib/ai-stream";

describe("AI stream continuation", () => {
  test("does not append a replayed answer prefix", () => {
    expect(
      mergeStreamContinuation(
        "Bagian pertama. Bagian kedua",
        "Bagian pertama. Bagian kedua berlanjut.",
      ),
    ).toBe("Bagian pertama. Bagian kedua berlanjut.");
  });

  test("removes an exact overlap at a stream boundary", () => {
    expect(mergeStreamContinuation("Jawaban sampai akhir", "akhir lalu lanjut.")).toBe(
      "Jawaban sampai akhir lalu lanjut.",
    );
  });

  test("keeps new continuation text when there is no overlap", () => {
    expect(mergeStreamContinuation("Teks sebelumnya.", " Lanjutan baru.")).toBe(
      "Teks sebelumnya. Lanjutan baru.",
    );
  });

  test("ignores a retry that only repeats the already shown prefix", () => {
    expect(mergeStreamContinuation("Jawaban yang sudah tampil.", "Jawaban yang sudah")).toBe(
      "Jawaban yang sudah tampil.",
    );
  });

  test("removes a short preamble when a retry replays the answer", () => {
    expect(
      mergeStreamContinuation("Jawaban yang sudah tampil.", "Melanjutkan: Jawaban yang sudah tampil. Tambahan."),
    ).toBe("Jawaban yang sudah tampil. Tambahan.");
  });
});