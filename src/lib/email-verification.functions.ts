import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccountAuth } from "@/integrations/auth-supabase/auth-middleware";
import { sendEmailVerificationOtp, verifyEmailVerificationOtp } from "./email-verification.server";

export const sendEmailVerificationOtpFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) => z.object({ challenge: z.string().min(20).max(100) }).parse(d))
  .handler(async ({ data, context }) => sendEmailVerificationOtp(context.userId, data.challenge));

export const verifyEmailVerificationOtpFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) =>
    z.object({ challenge: z.string().min(20).max(100), otp: z.string().regex(/^\d{6}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => verifyEmailVerificationOtp(context.userId, data.challenge, data.otp));
