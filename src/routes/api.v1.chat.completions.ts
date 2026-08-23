import { createFileRoute } from "@tanstack/react-router";

const handle = async ({ request }: { request: Request }) => {
  const { handleChatCompletions } = await import("@/lib/chat-completions.server");
  return handleChatCompletions(request);
};

export const Route = createFileRoute("/api/v1/chat/completions")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      OPTIONS: handle,
    },
  },
});
