import { createFileRoute } from "@tanstack/react-router";
import type { GoogleLoginRpcClient } from "@/lib/google-login.types";

function redirect(path: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: path,
      "Cache-Control": "no-store, private",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function errorPath(requestId: string, code: string): string {
  const params = new URLSearchParams({ token: requestId, error_code: code });
  return `/error/login?${params.toString()}`;
}

async function handleLogin({ request }: { request: Request }) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  const providerId = url.searchParams.get("provider_id");
  const scopes = url.searchParams.get("scopes");
  const flowName = url.searchParams.get("flowName");
  const flow = url.searchParams.get("flow") === "signup" ? "signup" : "signin";
  const requestId = url.searchParams.get("request_id");
  const token = url.searchParams.get("token");

  if (
    (provider && provider !== "GoogleOAuth") ||
    (providerId && providerId !== "google.com") ||
    (scopes && scopes !== "profile" && scopes !== "email profile") ||
    (flowName && flowName !== "GeneralOAuthFlow")
  ) {
    return redirect(errorPath(requestId || crypto.randomUUID(), "invalid_login_request"));
  }

  const { authSupabaseAdmin } = await import("@/integrations/auth-supabase/client.server");
  const db = authSupabaseAdmin as unknown as GoogleLoginRpcClient;

  if (!token && !requestId) {
    const { data, error } = await db.rpc("create_google_login_request");
    const row = Array.isArray(data) ? data[0] : data;
    if (
      error ||
      !row ||
      typeof row !== "object" ||
      !("request_id" in row) ||
      !("token" in row) ||
      typeof row.request_id !== "string" ||
      typeof row.token !== "string"
    ) {
      return redirect(errorPath(crypto.randomUUID(), "request_creation_failed"));
    }

    const params = new URLSearchParams({
      token: row.token,
      request_id: row.request_id,
      provider: "GoogleOAuth",
      provider_id: "google.com",
      scopes: "profile",
      flowName: "GeneralOAuthFlow",
      flow,
    });
    return redirect(`/api/v1/login?${params.toString()}`);
  }

  if (!token || !requestId || !/^[a-f0-9]{64}$/.test(token)) {
    return redirect(errorPath(requestId || crypto.randomUUID(), "invalid_login_request"));
  }

  const { data: valid, error } = await db.rpc("validate_google_login_request", {
    p_request_id: requestId,
    p_token: token,
  });
  if (error || valid !== true) return redirect(errorPath(requestId, "token_expired_or_invalid"));

  const params = new URLSearchParams({
    google_login_token: token,
    google_login_request_id: requestId,
  });
  return redirect(`/${flow === "signup" ? "register" : "login"}#${params.toString()}`);
}

export const Route = createFileRoute("/api/v1/login")({
  server: {
    handlers: { GET: handleLogin },
  },
});
