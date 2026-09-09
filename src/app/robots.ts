import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();

  // The admin panel, the API and uploaded media are never for crawlers.
  const disallow = ["/admin", "/admin/", "/api/"];

  if (!settings.allowIndexing) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${settings.origin}/sitemap.xml`,
    host: settings.origin,
  };
}
