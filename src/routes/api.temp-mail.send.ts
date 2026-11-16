import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/temp-mail/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = (await request.json().catch(() => ({}))) as {
          address?: string;
          token?: string;
          to?: string;
          subject?: string;
          text?: string;
          captchaToken?: string;
        };
        if (
          typeof input.address !== "string" ||
          typeof input.token !== "string" ||
          typeof input.to !== "string" ||
          typeof input.subject !== "string" ||
          typeof input.text !== "string" ||
          typeof input.captchaToken !== "string"
        ) {
          return Response.json({ error: "Data request tidak lengkap." }, { status: 400 });
        }
        try {
          const { sendMailboxMessage } = await import("@/lib/temp-mail.server");
          const result = await sendMailboxMessage(request, {
            address: input.address,
            token: input.token,
            to: input.to,
            subject: input.subject,
            text: input.text,
            captchaToken: input.captchaToken,
          });
          return Response.json({ id: result.id }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Gagal mengirim email.";
          const status = message.includes("Konfigurasi server") ? 503 : 400;
          return Response.json(
            { error: message },
            { status, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
