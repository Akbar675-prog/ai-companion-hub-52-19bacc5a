import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccountAuth } from "@/integrations/auth-supabase/auth-middleware";
import {
  deleteAiVoiceAgent,
  listAiVoiceAgents,
  readAiProfile,
  saveAiVoiceAgent,
  selectAiVoiceAgent,
  writeAiProfile,
} from "./ai-profile.server";

export const getAiProfileFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .handler(async ({ context }) => readAiProfile(context.userId));

export const listAiVoiceAgentsFn = createServerFn({ method: "POST" }).handler(() => listAiVoiceAgents());

export const saveAiVoiceAgentFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().trim().regex(/^[A-Za-z0-9_-]{8,80}$/),
        name: z.string().trim().min(1).max(60),
        image: z.string().max(2_000_000).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => saveAiVoiceAgent(context.userId, data));

export const deleteAiVoiceAgentFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().trim().min(8).max(80) }).parse(d))
  .handler(async ({ data, context }) => deleteAiVoiceAgent(context.userId, data.id));

export const selectAiVoiceAgentFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().trim().min(8).max(80) }).parse(d))
  .handler(async ({ data, context }) => selectAiVoiceAgent(context.userId, data.id));

export const saveAiProfileFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        nickname: z.string().trim().max(40),
        fullName: z.string().trim().max(80),
        age: z.number().int().min(1).max(120).nullable(),
        about: z.string().trim().max(600),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => writeAiProfile(context.userId, data));
