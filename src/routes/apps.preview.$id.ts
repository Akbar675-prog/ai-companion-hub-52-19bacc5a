import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/apps/preview/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(params.id)) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data, error } = await supabaseAdmin.storage
          .from("app-icons")
          .download(`PREVIEWS/${params.id}`);
        if (error || !data) return new Response("Not found", { status: 404 });

        const contentType = data.type.split(";", 1)[0].trim().toLowerCase();
        if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
          return new Response("Unsupported media type", { status: 415 });
        }

        return new Response(data, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
