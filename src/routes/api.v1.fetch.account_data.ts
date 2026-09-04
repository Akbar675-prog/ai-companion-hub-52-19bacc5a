import { createFileRoute } from "@tanstack/react-router";

const handle = async ({ request }: { request: Request }) => {
  const { handleAccountData } = await import("@/lib/account-data.server");
  return handleAccountData(request);
};

export const Route = createFileRoute("/api/v1/fetch/account_data")({
  server: {
    handlers: {
      GET: handle,
      OPTIONS: handle,
    },
  },
});
