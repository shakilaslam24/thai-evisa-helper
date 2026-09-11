import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/page-hero";
import { PageCampaign } from "@/components/site/page-campaign";
import { MediaImage } from "@/components/ui/media-image";
import { Reveal } from "@/components/ui/reveal";
import { IconArrowRight } from "@/components/ui/icons";
import { getActiveCampaign, getPageSeo, getPublishedTours } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { breadcrumbSchema, buildMetadata, jsonLd } from "@/lib/seo";
import { AVAILABILITY, PACKAGE_TYPES, labelFor } from "@/lib/list";

export const revalidate = 300;

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Tour Packages", path: "/tours" },
];

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("tours");
  return buildMetadata({
    title: seo?.title || "Tour Packages",
    description:
      seo?.description ||
      "Group, private and fully customised tour packages planned around your dates, your pace and your budget.",
    path: "/tours",
    ogTitle: seo?.ogTitle,
    ogDescription: seo?.ogDescription,
    imageUrl: seo?.ogImage?.url,
    canonicalUrl: seo?.canonicalUrl,
    noindex: seo?.noindex,
  });
}

export default async function ToursListingPage() {
  const [tours, settings, campaign] = await Promise.all([
    getPublishedTours(),
    getSettings(),
    getActiveCampaign("tours"),
  ]);
  const schema = jsonLd(breadcrumbSchema(settings.origin, CRUMBS));

  return (
    <>
      <PageHero
        eyebrow="Tour Packages"
        title="Journeys worth"
        titleAccent="taking."
        description="Group departures, private itineraries and fully custom trips — planned by people who have arranged them before."
        crumbs={CRUMBS}
      />

      <PageCampaign campaign={campaign} />

      <section className="section">
        <div className="container-df">
          {tours.length > 0 ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tours.map((tour, index) => (
                <Reveal as="li" key={tour.id} delay={Math.min(index % 3, 3) as 0 | 1 | 2 | 3}>
                  <Link href={`/tours/${tour.slug}`} className="group block">
                    <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-navy-900">
                      <MediaImage
                        media={tour.coverImage}
                        alt={tour.name}
                        seed={index}
                        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                        className="img-zoom"
                      />
                      <div className="absolute left-3 top-3 flex gap-2">
                        {tour.packageType ? (
                          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-navy-900">
                            {labelFor(PACKAGE_TYPES, tour.packageType)}
                          </span>
                        ) : null}
                        {tour.availability !== "available" ? (
                          <span className="rounded-full bg-navy-900/90 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-white">
                            {labelFor(AVAILABILITY, tour.availability)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5">
                      {tour.destination ? (
                        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-500">
                          {tour.destination}
                        </p>
                      ) : null}
                      <h2 className="mt-2 text-h3 font-semibold transition-colors duration-200 group-hover:text-gold-600">
                        {tour.name}
                      </h2>
                      {tour.shortDescription ? (
                        <p className="mt-2 line-clamp-2 text-[0.875rem] leading-relaxed text-ink-muted">
                          {tour.shortDescription}
                        </p>
                      ) : null}
                      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem] text-ink-subtle">
                        {tour.duration ? <span>{tour.duration}</span> : null}
                        {tour.duration && tour.startingPrice ? (
                          <span aria-hidden="true" className="text-line-strong">
                            •
                          </span>
                        ) : null}
                        {tour.startingPrice ? (
                          <span className="font-medium text-ink-muted">
                            From {tour.currency} {tour.startingPrice}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </ul>
          ) : null}

          <div
            className={`${tours.length > 0 ? "mt-16" : ""} rounded-lg border border-line-gold bg-gold-50 px-7 py-10 sm:px-12 sm:py-12`}
          >
            <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between md:gap-12">
              <div className="max-w-xl">
                <h2 className="text-h2 font-semibold">
                  Your Destination. <span className="accent">Your Plan.</span>
                </h2>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
                  Tell us where you want to go, your preferred dates and budget, and our team will
                  help you plan your journey.
                </p>
              </div>
              <Link
                href="/contact?service=Custom%20Tour%20Package"
                className="btn btn-primary btn-lg shrink-0"
              >
                Request a Custom Package
                <IconArrowRight />
              </Link>
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
