import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccountAuth } from "@/integrations/auth-supabase/auth-middleware";
import { readAiChatHistory, writeAiChatHistory } from "./ai-chat-history.server";

const sourceSchema = z.object({
  title: z.string().max(300),
  link: z.string().url().max(2_000),
  snippet: z.string().max(2_000).optional(),
});

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(500_000),
  image: z.string().max(5_000_000).optional(),
  imageUrl: z.string().url().max(2_000).optional(),
  imagePrompt: z.string().max(500).optional(),
  searchQuery: z.string().max(1_000).optional(),
  sources: z.array(sourceSchema).max(50).optional(),
  reasoning: z.string().max(500_000).optional(),
  thoughtSeconds: z.number().int().min(0).max(86_400).optional(),
  analyzedImage: z.boolean().optional(),
});

const threadsSchema = z.object({
  threads: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/),
        title: z.string().max(120),
        updatedAt: z.number().int().positive(),
        messages: z.array(messageSchema).max(200),
      }),
    )
    .max(60),
});

export const getAiChatHistoryFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .handler(async ({ context }) => readAiChatHistory(context.userId));

export const saveAiChatHistoryFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((input: unknown) => threadsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await writeAiChatHistory(context.userId, data.threads);
    return { ok: true };
  });
