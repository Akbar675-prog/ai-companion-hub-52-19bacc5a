import { createFileRoute } from "@tanstack/react-router";

function json(data: Record<string, string>, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/v1/update")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const packageName = new URL(request.url).searchParams.get("package_name")?.trim();
        if (!packageName) {
          return json({ error: "Parameter package_name wajib diisi." }, 400);
        }

        try {
          const [{ supabaseAdmin }, { readIndex }] = await Promise.all([
            import("@/integrations/supabase/client.server"),
            import("@/lib/metadata.functions"),
          ]);
          const [{ data: apps, error }, metadata] = await Promise.all([
            supabaseAdmin.from("apps").select("id"),
            readIndex(),
          ]);
          if (error) {
            return json({ error: "Gagal membaca data aplikasi." }, 500);
          }

          const app = (apps ?? []).find(
            (item) =>
              metadata[item.id]?.packageName?.toLowerCase() === packageName.toLowerCase(),
          );
          if (!app) {
            return json({ error: "Aplikasi tidak ditemukan." }, 404);
          }

          const version = metadata[app.id]?.version?.trim() ?? "";
          return json({
            package_name: packageName,
            version,
            app_id: app.id,
            app_url_id: `https://galileomodapk.visora.my.id/apps/${app.id}`,
          });
        } catch {
          return json({ error: "Terjadi kesalahan saat mencari aplikasi." }, 500);
        }
      },
    },
  },
});
