import { createFileRoute } from "@tanstack/react-router";

const handle = async ({ request }: { request: Request }) => {
  const { handleChatCompletions } = await import("@/lib/chat-completions.server");
  return handleChatCompletions(request);
};

/** Alias yang selalu bebas auth situs (untuk pemakaian eksternal). */
export const Route = createFileRoute("/api/public/v1/chat/completions")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      OPTIONS: handle,
    },
  },
});
