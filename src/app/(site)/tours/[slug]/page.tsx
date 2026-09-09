import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/site/page-hero";
import { WhatsAppLink } from "@/components/site/whatsapp-link";
import { MediaImage } from "@/components/ui/media-image";
import { QuickEnquiryForm } from "@/components/forms/quick-enquiry-form";
import { DetailSection, FactTable, NoticeBlock, ProseBlock } from "@/components/site/detail-blocks";
import { getTourBySlug } from "@/lib/content";
import { db } from "@/lib/db";
import { getSettings, telHref } from "@/lib/settings";
import { breadcrumbSchema, buildMetadata, jsonLd } from "@/lib/seo";
import { AVAILABILITY, PACKAGE_TYPES, labelFor } from "@/lib/list";
import { IconCheck, IconClock, IconClose, IconPhone } from "@/components/ui/icons";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const rows = await db.tourPackage.findMany({
    where: { status: "published", isPlaceholder: false },
    select: { slug: true },
  });
  return rows.map((row) => ({ slug: row.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTourBySlug(slug);
  if (!tour) return buildMetadata({ title: "Not found", noindex: true });

  return buildMetadata({
    title: tour.seoTitle || tour.name,
    description: tour.seoDescription || tour.shortDescription || `${tour.name} — tour package by DreamFly Consultancy.`,
    path: `/tours/${tour.slug}`,
    imageUrl: tour.ogImage?.url ?? tour.coverImage?.url,
    canonicalUrl: tour.canonicalUrl,
    noindex: tour.noindex,
    type: "article",
  });
}

export default async function TourDetailPage({ params }: Props) {
  const { slug } = await params;
  const [tour, settings] = await Promise.all([getTourBySlug(slug), getSettings()]);
  if (!tour) notFound();

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Tour Packages", path: "/tours" },
    { name: tour.name, path: `/tours/${tour.slug}` },
  ];

  const includes = tour.listItems.filter((item) => item.kind === "include");
  const excludes = tour.listItems.filter((item) => item.kind === "exclude");
  const schema = jsonLd(breadcrumbSchema(settings.origin, crumbs));

  return (
    <>
      <PageHero
        eyebrow={tour.destination || "Tour Package"}
        title={tour.name}
        crumbs={crumbs}
        description={tour.shortDescription || undefined}
      >
        <div className="mt-8 flex flex-wrap items-center gap-2.5">
          {tour.duration ? (
            <span className="badge border-white/15 bg-white/10 text-white/85">
              <IconClock width={14} height={14} className="text-gold-200" />
              {tour.duration}
            </span>
          ) : null}
          <span className="badge border-white/15 bg-white/10 text-white/85">
            {labelFor(PACKAGE_TYPES, tour.packageType)}
          </span>
          {tour.availability !== "available" ? (
            <span className="badge badge-gold">{labelFor(AVAILABILITY, tour.availability)}</span>
          ) : null}
          {tour.startingPrice ? (
            <span className="badge border-white/15 bg-white/10 text-white/85">
              From {tour.currency} {tour.startingPrice}
            </span>
          ) : null}
        </div>
      </PageHero>

      <div className="section">
        <div className="container-df">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-16">
            <div className="min-w-0 space-y-10">
              {tour.coverImage ? (
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                  <MediaImage
                    media={tour.coverImage}
                    alt={tour.name}
                    sizes="(max-width: 1024px) 92vw, 60vw"
                    priority
                  />
                </div>
              ) : null}

              {tour.highlights.length > 0 ? (
                <DetailSection title="Highlights">
                  <ul className="grid max-w-3xl gap-2.5 sm:grid-cols-2">
                    {tour.highlights.map((highlight) => (
                      <li key={highlight.id} className="flex items-start gap-2.5 text-[0.9375rem] leading-relaxed">
                        <IconCheck width={17} height={17} className="mt-1 shrink-0 text-gold-500" aria-hidden="true" />
                        <span>{highlight.label}</span>
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              ) : null}

              <FactTable
                title="Package Details"
                rows={[
                  ["Destination", tour.destination],
                  ["Country", tour.country],
                  ["Duration", tour.duration],
                  ["Travel Dates", tour.travelDates],
                  ["Package Type", labelFor(PACKAGE_TYPES, tour.packageType)],
                  ["Starting Price", tour.startingPrice ? `${tour.currency} ${tour.startingPrice}` : ""],
                  ["Availability", labelFor(AVAILABILITY, tour.availability)],
                ]}
              />

              <ProseBlock title="Hotels & Accommodation" text={tour.hotelDetails} />

              {tour.itinerary.length > 0 ? (
                <DetailSection id="itinerary" title="Day-by-Day Itinerary">
                  <ol className="max-w-2xl">
                    {tour.itinerary.map((day) => (
                      <li key={day.id} className="border-b border-line py-6 first:pt-0 last:border-0">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-gold-500">
                          {day.dayLabel}
                        </p>
                        <h3 className="mt-2 font-display text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink">
                          {day.title}
                        </h3>
                        {day.body ? (
                          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">{day.body}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </DetailSection>
              ) : null}

              {includes.length > 0 || excludes.length > 0 ? (
                <DetailSection title="What's Included">
                  <div className="grid gap-8 sm:grid-cols-2">
                    {includes.length > 0 ? (
                      <div>
                        <h3 className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-ink">
                          Includes
                        </h3>
                        <ul className="mt-4 space-y-2.5">
                          {includes.map((item) => (
                            <li key={item.id} className="flex items-start gap-2.5 text-[0.9375rem] leading-relaxed">
                              <IconCheck width={16} height={16} className="mt-1 shrink-0 text-gold-500" aria-hidden="true" />
                              <span>{item.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {excludes.length > 0 ? (
                      <div>
                        <h3 className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-ink">
                          Excludes
                        </h3>
                        <ul className="mt-4 space-y-2.5">
                          {excludes.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-start gap-2.5 text-[0.9375rem] leading-relaxed text-ink-muted"
                            >
                              <IconClose width={16} height={16} className="mt-1 shrink-0 text-ink-subtle" aria-hidden="true" />
                              <span>{item.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </DetailSection>
              ) : null}

              <NoticeBlock title="Important Notes" text={tour.importantNotes} />

              {tour.gallery.length > 0 ? (
                <DetailSection title="Gallery">
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {tour.gallery.map((item, index) => (
                      <li key={item.id} className="relative aspect-[4/3] overflow-hidden rounded-sm">
                        <MediaImage
                          media={item.media}
                          alt={`${tour.name} — image ${index + 1}`}
                          sizes="(max-width: 640px) 46vw, 30vw"
                        />
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              ) : null}
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="card p-6">
                <h2 className="text-h3 font-semibold">Enquire about this package</h2>
                {tour.startingPrice ? (
                  <p className="mt-2 text-[0.875rem] text-ink-muted">
                    From{" "}
                    <span className="font-display text-[1.125rem] font-semibold text-ink">
                      {tour.currency} {tour.startingPrice}
                    </span>
                  </p>
                ) : null}

                <div className="mt-6">
                  <QuickEnquiryForm
                    type="tour"
                    service="Tour Package"
                    destination={tour.name}
                    whatsappDigits={settings.whatsappDigits}
                    submitLabel="Request This Package"
                    messagePlaceholder="Preferred travel dates, number of travellers, anything else useful."
                  />
                </div>

                <div className="mt-6 space-y-2 border-t border-line pt-6">
                  <WhatsAppLink
                    number={settings.whatsappDigits}
                    className="btn btn-outline btn-block"
                    context={{ kind: "tour", packageName: tour.name, custom: tour.whatsappMessage }}
                  >
                    WhatsApp Us
                  </WhatsAppLink>
                  {settings.primaryPhone ? (
                    <a href={telHref(settings.primaryPhone)} className="btn btn-ghost btn-block">
                      <IconPhone width={16} height={16} />
                      {settings.primaryPhone}
                    </a>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {schema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} /> : null}
    </>
  );
}
