import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/page-hero";
import { PageCampaign } from "@/components/site/page-campaign";
import { MediaImage } from "@/components/ui/media-image";
import { Reveal } from "@/components/ui/reveal";
import { WhatsAppLink } from "@/components/site/whatsapp-link";
import { getActiveCampaign, getPageSeo, getPublishedVisas } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { breadcrumbSchema, buildMetadata, jsonLd } from "@/lib/seo";
import { flagEmoji } from "@/lib/format";
import { labelsFor, VISA_CATEGORIES } from "@/lib/list";

export const revalidate = 300;

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Visa Services", path: "/visa" },
];

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("visa");
  return buildMetadata({
    title: seo?.title || "Visa Services",
    description:
      seo?.description ||
      "Visa assistance for tourist, business and visit applications. Explore requirements, documents and processing information by destination.",
    path: "/visa",
    ogTitle: seo?.ogTitle,
    ogDescription: seo?.ogDescription,
    imageUrl: seo?.ogImage?.url,
    canonicalUrl: seo?.canonicalUrl,
    noindex: seo?.noindex,
  });
}

export default async function VisaListingPage() {
  const [destinations, settings, campaign] = await Promise.all([
    getPublishedVisas(),
    getSettings(),
    getActiveCampaign("visa"),
  ]);
  const schema = jsonLd(breadcrumbSchema(settings.origin, CRUMBS));

  return (
    <>
      <PageHero
        eyebrow="Visa Services"
        title="Where would you like"
        titleAccent="to go?"
        description="Explore visa information by destination. Requirements, documents and processing times are published for each country we currently assist with."
        crumbs={CRUMBS}
      />

      <PageCampaign campaign={campaign} />

      <section className="section">
        <div className="container-df">
          {destinations.length === 0 ? (
            <EmptyState whatsappDigits={settings.whatsappDigits} />
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {destinations.map((destination, index) => (
                <Reveal
                  as="li"
                  key={destination.id}
                  delay={Math.min(index % 4, 3) as 0 | 1 | 2 | 3}
                >
                  <Link
                    href={`/visa/${destination.slug}`}
                    className="group block overflow-hidden rounded-md border border-line transition-[border-color,box-shadow,transform] duration-300 hover:border-line-gold hover:shadow-md motion-safe:hover:-translate-y-1"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-navy-900">
                      <MediaImage
                        media={destination.coverImage}
                        alt={`${destination.countryName} visa services`}
                        seed={index}
                        sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw"
                        className="img-zoom"
                      />
                      <div
                        className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-navy-950/85 via-navy-950/35 to-transparent"
                        aria-hidden="true"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="flex items-center gap-2">
                          {flagEmoji(destination.countryCode) ? (
                            <span className="text-[0.9375rem] leading-none" aria-hidden="true">
                              {flagEmoji(destination.countryCode)}
                            </span>
                          ) : null}
                          <h2 className="font-display text-[1.0625rem] font-semibold leading-tight tracking-[-0.02em] text-white">
                            {destination.countryName}
                          </h2>
                        </div>
                        {destination.processingTime ? (
                          <p className="mt-1.5 text-[0.75rem] font-medium text-white/70">
                            {destination.processingTime}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {labelsFor(VISA_CATEGORIES, destination.categories).length > 0 ? (
                      <p className="truncate border-t border-line px-4 py-3 text-[0.75rem] text-ink-subtle">
                        {labelsFor(VISA_CATEGORIES, destination.categories).join(" · ")}
                      </p>
                    ) : null}
                  </Link>
                </Reveal>
              ))}
            </ul>
          )}

          <div className="mt-16 rounded-lg border border-line bg-surface p-7 sm:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
              <div className="max-w-xl">
                <h2 className="text-h3 font-semibold">Don't see your destination?</h2>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-muted">
                  We assist with more countries than are listed here. Tell us where you're going and
                  we'll confirm what's required.
                </p>
              </div>
              <WhatsAppLink
                number={settings.whatsappDigits}
                className="btn btn-primary shrink-0"
                context={{ kind: "general" }}
              >
                Ask About a Country
              </WhatsAppLink>
            </div>
          </div>
        </div>
      </section>

      {schema ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      ) : null}
    </>
  );
}

function EmptyState({ whatsappDigits }: { whatsappDigits: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-line bg-surface p-10 text-center">
      <h2 className="text-h3 font-semibold">Destinations are being published.</h2>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">
        Our visa destination pages are being prepared. In the meantime, message us and we'll answer
        your questions directly.
      </p>
      <div className="mt-7">
        <WhatsAppLink
          number={whatsappDigits}
          className="btn btn-primary"
          context={{ kind: "general" }}
        >
          WhatsApp Us
        </WhatsAppLink>
      </div>
    </div>
  );
}
