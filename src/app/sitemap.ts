import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

/**
 * Always generated fresh.
 *
 * These two files are correctness-critical and crawled rarely, so caching them
 * buys nothing and risks a great deal: a build run while "allow indexing" was
 * off would otherwise bake a site-wide Disallow into sitemap and serve it
 * until the cache happened to expire.
 */
export const dynamic = "force-dynamic";

/** Static marketing routes, with priorities that reflect commercial intent. */
const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
}> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/visa", priority: 0.9, changeFrequency: "weekly" },
  { path: "/tours", priority: 0.9, changeFrequency: "weekly" },
  { path: "/air-ticket-hotel", priority: 0.8, changeFrequency: "monthly" },
  { path: "/b2b", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  const origin = settings.origin;

  // A staging copy with indexing switched off publishes an empty sitemap.
  if (!settings.allowIndexing) return [];

  const [visas, tours] = await Promise.all([
    db.visaDestination.findMany({
      where: { status: "published", isPlaceholder: false, noindex: false },
      select: { slug: true, updatedAt: true },
    }),
    db.tourPackage.findMany({
      where: { status: "published", isPlaceholder: false, noindex: false },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${origin}${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...visas.map((visa) => ({
      url: `${origin}/visa/${visa.slug}`,
      lastModified: visa.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...tours.map((tour) => ({
      url: `${origin}/tours/${tour.slug}`,
      lastModified: tour.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
