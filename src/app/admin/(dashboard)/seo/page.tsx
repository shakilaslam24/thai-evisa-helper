import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader, Panel } from "@/components/admin/ui";
import { PageSeoForm } from "@/components/admin/seo-form";
import { getSettings } from "@/lib/settings";
import { SearchConsolePanel } from "@/components/admin/search-console-panel";

export const metadata = { title: "SEO" };

const PAGES = [
  { key: "home", label: "Home", path: "/" },
  { key: "visa", label: "Visa Services", path: "/visa" },
  { key: "tours", label: "Tour Packages", path: "/tours" },
  { key: "air-ticket-hotel", label: "Air Ticket & Hotel", path: "/air-ticket-hotel" },
  { key: "b2b", label: "B2B Services", path: "/b2b" },
  { key: "about", label: "About", path: "/about" },
  { key: "contact", label: "Contact", path: "/contact" },
] as const;

export default async function SeoPage() {
  await requireAdmin();

  const now = new Date();
  const [rows, media, settings, visaCount, tourCount] = await Promise.all([
    db.pageSeo.findMany(),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, originalName: true, altText: true },
    }),
    getSettings(),
    db.visaDestination.count({
      where: { status: "published", isPlaceholder: false, noindex: false },
    }),
    db.tourPackage.count({ where: { status: "published", isPlaceholder: false, noindex: false } }),
  ]);

  // Seven fixed marketing routes, plus every indexable visa and tour page.
  const staticRouteCount = 7;
  const sitemapUrlCount = settings.allowIndexing ? staticRouteCount + visaCount + tourCount : 0;

  const byKey = new Map(rows.map((row) => [row.pageKey, row]));

  return (
    <>
      <PageHeader
        title="SEO"
        description="Per-page titles, descriptions and share images. Leave a field empty to fall back to the site defaults in Global Settings."
      />

      <PageBody>
        <div className="grid max-w-4xl gap-6">
          <SearchConsolePanel
            origin={settings.origin}
            allowIndexing={settings.allowIndexing}
            googleVerified={Boolean(settings.googleSiteVerification.trim())}
            bingVerified={Boolean(settings.bingSiteVerification.trim())}
            sitemapUrlCount={sitemapUrlCount}
            visaCount={visaCount}
            tourCount={tourCount}
            staticRouteCount={staticRouteCount}
            defaultTitle={settings.defaultSeoTitle}
            defaultDescription={settings.defaultSeoDescription}
            generatedAt={now.toISOString()}
          />

          {PAGES.map((page) => (
            <PageSeoForm
              key={page.key}
              pageKey={page.key}
              label={page.label}
              path={page.path}
              media={media}
              seo={{
                title: byKey.get(page.key)?.title ?? "",
                description: byKey.get(page.key)?.description ?? "",
                ogTitle: byKey.get(page.key)?.ogTitle ?? "",
                ogDescription: byKey.get(page.key)?.ogDescription ?? "",
                canonicalUrl: byKey.get(page.key)?.canonicalUrl ?? "",
                noindex: byKey.get(page.key)?.noindex ?? false,
                ogImageId: byKey.get(page.key)?.ogImageId ?? null,
              }}
            />
          ))}
        </div>
      </PageBody>
    </>
  );
}
