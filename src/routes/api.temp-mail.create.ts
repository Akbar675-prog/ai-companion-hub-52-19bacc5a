import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/temp-mail/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const input = (await request.json()) as {
            localPart?: string;
            browserId?: string;
            captchaToken?: string;
          };
          if (
            typeof input.localPart !== "string" ||
            typeof input.browserId !== "string" ||
            typeof input.captchaToken !== "string"
          ) {
            return Response.json({ error: "Data request tidak lengkap." }, { status: 400 });
          }
          const { createMailbox } = await import("@/lib/temp-mail.server");
          const mailbox = await createMailbox(request, {
            localPart: input.localPart,
            browserId: input.browserId,
            captchaToken: input.captchaToken,
          });
          return Response.json(mailbox, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Gagal membuat inbox.";
          const status = message.includes("Konfigurasi server") ? 503 : 400;
          return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
        }
      },
    },
  },
});
