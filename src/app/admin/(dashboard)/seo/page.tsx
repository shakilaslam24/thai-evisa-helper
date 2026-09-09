import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader, Panel } from "@/components/admin/ui";
import { PageSeoForm } from "@/components/admin/seo-form";
import { getSettings } from "@/lib/settings";

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

  const [rows, media, settings] = await Promise.all([
    db.pageSeo.findMany(),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, originalName: true, altText: true },
    }),
    getSettings(),
  ]);

  const byKey = new Map(rows.map((row) => [row.pageKey, row]));

  return (
    <>
      <PageHeader
        title="SEO"
        description="Per-page titles, descriptions and share images. Leave a field empty to fall back to the site defaults in Global Settings."
      />

      <PageBody>
        <div className="grid max-w-4xl gap-6">
          <Panel title="Site-wide">
            <dl className="grid gap-3 text-[0.875rem] sm:grid-cols-2">
              <Fact
                label="Search indexing"
                value={settings.allowIndexing ? "Enabled" : "Disabled"}
              />
              <Fact label="Site URL" value={settings.origin} />
              <Fact label="Default title" value={settings.defaultSeoTitle || "— not set —"} />
              <Fact
                label="Default description"
                value={settings.defaultSeoDescription || "— not set —"}
              />
            </dl>
            <p className="mt-5 border-t border-line pt-4 text-[0.8125rem] text-ink-muted">
              These are edited in{" "}
              <Link
                href="/admin/settings"
                className="font-medium text-ink underline underline-offset-4"
              >
                Global Settings
              </Link>
              . Visa and tour pages carry their own SEO fields inside each record.
            </p>
            <p className="mt-3 flex flex-wrap gap-4 text-[0.8125rem]">
              <a href="/sitemap.xml" target="_blank" rel="noopener" className="link-arrow">
                View sitemap.xml
              </a>
              <a href="/robots.txt" target="_blank" rel="noopener" className="link-arrow">
                View robots.txt
              </a>
            </p>
          </Panel>

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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-ink">{value}</dd>
    </div>
  );
}
