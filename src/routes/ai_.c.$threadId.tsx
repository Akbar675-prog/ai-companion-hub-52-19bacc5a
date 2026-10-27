import { createFileRoute } from "@tanstack/react-router";
import { AiChatPage } from "./ai";

export const Route = createFileRoute("/ai_/c/$threadId")({
  head: () => ({
    meta: [{ title: "AI Chat — Galileo Mod APK" }],
  }),
  component: AiThreadPage,
});

function AiThreadPage() {
  const { threadId } = Route.useParams();
  return <AiChatPage requestedThreadId={threadId} />;
}
