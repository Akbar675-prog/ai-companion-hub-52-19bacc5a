import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccountAuth } from "@/integrations/auth-supabase/auth-middleware";
import type { AiModel } from "./ai-models";
import { deleteStoredAiModel, listStoredAiModels, saveStoredAiModel } from "./ai-models.server";

const modelSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(40),
  tagline: z.string().trim().max(120),
  persona: z.string().max(4000),
  isNew: z.boolean().optional(),
  logo: z.string().max(2000).optional(),
  custom: z.literal(true),
  realModel: z.boolean().optional(),
  modelType: z.string().max(120).optional(),
  abilities: z.string().max(1000).optional(),
  endpointUrl: z.string().max(300).optional(),
  endpointKey: z.string().max(400).optional(),
});

export const listAiModelsFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .handler(async () => listStoredAiModels());

export const saveAiModelFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((data: unknown) => modelSchema.parse(data))
  .handler(async ({ data }) => saveStoredAiModel(data as AiModel));

export const deleteAiModelFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().trim().min(1).max(120) }).parse(data))
  .handler(async ({ data }) => {
    await deleteStoredAiModel(data.id);
    return { ok: true };
  });
