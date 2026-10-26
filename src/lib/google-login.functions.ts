import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const startLoginSchema = z.object({ flow: z.enum(["signin", "signup"]) });

function isCreatedRequest(value: unknown): value is { request_id: string; token: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "request_id" in value &&
    typeof value.request_id === "string" &&
    "token" in value &&
    typeof value.token === "string"
  );
}

export const startGoogleLoginRequestFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => startLoginSchema.parse(input))
  .handler(async ({ data }) => {
    const { authSupabaseAdmin } = await import("@/integrations/auth-supabase/client.server");
    const db =
      authSupabaseAdmin as unknown as import("@/lib/google-login.types").GoogleLoginRpcClient;
    const { data: created, error: createError } = await db.rpc("create_google_login_request");
    const row = Array.isArray(created) ? created[0] : created;
    if (createError || !isCreatedRequest(row)) throw new Error("Gagal menyiapkan login.");

    const { data: valid, error: validateError } = await db.rpc("validate_google_login_request", {
      p_request_id: row.request_id,
      p_token: row.token,
    });
    if (validateError || valid !== true) throw new Error("Login request tidak valid.");

    return { requestId: row.request_id, token: row.token, flow: data.flow };
  });

const exchangeGoogleCodeSchema = z.object({
  code: z.string().min(1).max(4096),
  codeVerifier: z
    .string()
    .min(43)
    .max(128)
    .regex(/^[A-Za-z0-9._~-]+$/),
});

export const exchangeGoogleCodeFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => exchangeGoogleCodeSchema.parse(input))
  .handler(async ({ data }) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_OAUTH_REDIRECT_URI || "https://galileomodapk.visora.my.id/api/v1/login";

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth server credentials are not configured.");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: data.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: data.codeVerifier,
      }),
    });
    const tokenResult: unknown = await tokenResponse.json();
    if (
      !tokenResponse.ok ||
      typeof tokenResult !== "object" ||
      tokenResult === null ||
      !("id_token" in tokenResult) ||
      typeof tokenResult.id_token !== "string"
    ) {
      throw new Error("Google authorization code could not be exchanged.");
    }

    return { idToken: tokenResult.id_token };
  });

const loginRequestSchema = z.object({
  requestId: z.string().uuid(),
  token: z
    .string()
    .length(64)
    .regex(/^[a-f0-9]+$/),
});

export const completeGoogleLoginRequestFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const { authSupabaseAdmin } = await import("@/integrations/auth-supabase/client.server");
    const db =
      authSupabaseAdmin as unknown as import("@/lib/google-login.types").GoogleLoginRpcClient;
    const { data: completed, error } = await db.rpc("complete_google_login_request", {
      p_request_id: data.requestId,
      p_token: data.token,
    });
    if (error) throw new Error("Permintaan login sudah kedaluwarsa atau tidak valid.");
    if (completed !== true) throw new Error("Permintaan login sudah digunakan atau tidak valid.");
    return { ok: true };
  });
