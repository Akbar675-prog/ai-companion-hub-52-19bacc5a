import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/temp-mail/inbox")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = await request.json().catch(() => ({})) as { address?: string; token?: string };
        const address = typeof input.address === "string" ? input.address : "";
        const token = typeof input.token === "string" ? input.token : "";
        try {
          const { listMailboxMessages } = await import("@/lib/temp-mail.server");
          const messages = await listMailboxMessages(address, token);
          return Response.json({ messages }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Gagal memuat inbox.";
          const status = message.includes("tidak ditemukan") ? 404 : 503;
          return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
        }
      },
    },
  },
});
