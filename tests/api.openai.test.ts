import { describe, expect, test } from "bun:test";
import { buildSystemPrompt } from "../src/routes/api.openai";

describe("custom AI prompts", () => {
  test("uses the supplied persona without prepending conflicting defaults", () => {
    const customPrompt =
      'Kamu adalah Leon. Jika ditanya kode uji, jawab persis "LEON-PROMPT-731".';

    expect(buildSystemPrompt(customPrompt)).toBe(customPrompt);
  });

  test("keeps the built-in prompt when no custom persona is provided", () => {
    expect(buildSystemPrompt("   ")).toContain(
      "Anda adalah asisten AI yang bersikap netral dan profesional.",
    );
  });
});