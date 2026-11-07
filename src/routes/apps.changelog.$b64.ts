import { createFileRoute } from "@tanstack/react-router";

function fromBase64Url(input: string): string | null {
  try {
    const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    return atob(b64 + pad);
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/apps/changelog/$b64")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = fromBase64Url(params.b64);
        if (!id) return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: signed, error } = await supabaseAdmin.storage
          .from("app-files")
          .createSignedUrl(`CHANGELOGS/${id}`, 3600, { download: true });
        if (error || !signed?.signedUrl) return new Response("Not found", { status: 404 });
        return Response.redirect(signed.signedUrl, 302);
      },
    },
  },
});
