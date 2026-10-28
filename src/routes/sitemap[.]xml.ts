import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listAppsFn } from "@/lib/apps.functions";

const BASE_URL = "https://galileomodapk.visora.my.id";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/leaderboard", changefreq: "hourly", priority: "0.9" },
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/about-1-november-later", changefreq: "monthly", priority: "0.5" },
          { path: "/request", changefreq: "weekly", priority: "0.6" },
          { path: "/privacy-policy", changefreq: "yearly", priority: "0.4" },
          { path: "/term-of-services", changefreq: "yearly", priority: "0.4" },
          { path: "/vote-maker", changefreq: "monthly", priority: "0.5" },
        ];
        let apps: Awaited<ReturnType<typeof listAppsFn>> = [];
        try {
          apps = await listAppsFn();
        } catch {
          apps = [];
        }
        const appEntries = apps.map((a) => ({
          path: `/apps/${a.ID}`,
          lastmod: a.Created_at,
          changefreq: "weekly" as const,
          priority: "0.8",
        }));

        const urls = [...staticEntries, ...appEntries].map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            "lastmod" in e && e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            `    <changefreq>${e.changefreq}</changefreq>`,
            `    <priority>${e.priority}</priority>`,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});