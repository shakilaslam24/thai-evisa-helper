import "server-only";
import type { Metadata } from "next";
import { getSettings } from "./settings";

type SeoInput = {
  title?: string;
  description?: string;
  path?: string;
  imageUrl?: string | null;
  canonicalUrl?: string;
  noindex?: boolean;
  type?: "website" | "article";
};

function absolute(origin: string, url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Builds page metadata from Global Settings plus per-page overrides.
 * `allowIndexing` in settings acts as a site-wide kill switch — useful while a
 * staging copy is live.
 */
export async function buildMetadata(input: SeoInput = {}): Promise<Metadata> {
  const settings = await getSettings();
  const origin = settings.origin;

  const brand = settings.companyName || "DreamFly Consultancy";
  const fallbackTitle = settings.defaultSeoTitle || `${brand} — ${settings.tagline}`;
  const title = input.title?.trim() ? `${input.title.trim()} | ${brand}` : fallbackTitle;
  const description = (input.description?.trim() || settings.defaultSeoDescription || "").slice(
    0,
    300,
  );

  const path = input.path ?? "/";
  const canonical = input.canonicalUrl?.trim() || absolute(origin, path);
  const image = absolute(origin, input.imageUrl || settings.socialImageUrl);
  const indexable = settings.allowIndexing && !input.noindex;

  return {
    metadataBase: new URL(origin),
    title,
    description: description || undefined,
    alternates: { canonical },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large" },
        }
      : { index: false, follow: false },
    openGraph: {
      type: input.type ?? "website",
      siteName: brand,
      title,
      description: description || undefined,
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: brand }],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description || undefined,
      images: [image],
    },
  };
}

/** JSON-LD helper. Emits nothing when the graph is empty. */
export function jsonLd(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  // JSON.stringify escapes nothing dangerous on its own; close the `</script>`
  // vector explicitly.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function organizationSchema() {
  const s = await getSettings();
  const sameAs = [s.facebookUrl, s.instagramUrl, s.tiktokUrl, s.youtubeUrl, s.linkedinUrl].filter(
    Boolean,
  );

  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: s.companyName,
    slogan: s.tagline || undefined,
    url: s.origin,
    logo: `${s.origin}${s.logoLightUrl}`,
    image: `${s.origin}${s.socialImageUrl}`,
    description: s.defaultSeoDescription || undefined,
    email: s.email || undefined,
    telephone: [s.primaryPhone, s.secondaryPhone].filter(Boolean),
    address: s.addressLines.length
      ? {
          "@type": "PostalAddress",
          streetAddress: [s.addressLine1, s.addressLine2].filter(Boolean).join(", ") || undefined,
          addressLocality: s.city || undefined,
          addressCountry: s.country || undefined,
        }
      : undefined,
    openingHours: s.officeHours || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
}

export function breadcrumbSchema(origin: string, trail: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${origin}${crumb.path}`,
    })),
  };
}

/** Only emitted when the page actually renders the FAQs (brief §18). */
export function faqSchema(faqs: Array<{ question: string; answer: string }>) {
  if (faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
