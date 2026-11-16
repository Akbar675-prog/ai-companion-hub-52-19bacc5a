import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/temp-mail/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { receiveResendWebhook } = await import("@/lib/temp-mail.server");
          await receiveResendWebhook(request);
          return new Response(null, { status: 204 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Webhook tidak valid.";
          const status = message.includes("Konfigurasi server") ? 503 : 400;
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});
