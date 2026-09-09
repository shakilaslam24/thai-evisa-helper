import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

/**
 * Always generated fresh.
 *
 * These two files are correctness-critical and crawled rarely, so caching them
 * buys nothing and risks a great deal: a build run while "allow indexing" was
 * off would otherwise bake a site-wide Disallow into robots.txt and serve it
 * until the cache happened to expire.
 */
export const dynamic = "force-dynamic";

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
