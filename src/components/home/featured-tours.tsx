import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { MediaImage } from "@/components/ui/media-image";
import { Reveal } from "@/components/ui/reveal";
import { IconArrowRight } from "@/components/ui/icons";

type Tour = {
  id: string;
  slug: string;
  name: string;
  destination: string;
  duration: string;
  startingPrice: string;
  currency: string;
  availability: string;
  coverImage: { url: string; altText: string | null } | null;
};

/**
 * Featured tour experiences.
 *
 * Cards stay deliberately quiet — a photograph, a destination, a name, a
 * duration. Everything else belongs on the detail page.
 *
 * The custom-travel invitation below is permanent: many enquiries are for trips
 * that no published package covers, and this gives them a route in.
 */
export function FeaturedTours({
  heading,
  subheading,
  ctaLabel,
  tours,
}: {
  heading: string;
  subheading: string;
  ctaLabel: string;
  tours: Tour[];
}) {
  return (
    <section className="section border-y border-line bg-surface">
      <div className="container-df">
        {tours.length > 0 ? (
          <>
            <SectionHeading
              eyebrow="Tour Packages"
              title={heading}
              description={subheading}
              cta={ctaLabel ? { label: ctaLabel, href: "/tours" } : null}
            />

            <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tours.map((tour, index) => (
                <Reveal as="li" key={tour.id} delay={Math.min(index % 3, 3) as 0 | 1 | 2 | 3}>
                  <Link href={`/tours/${tour.slug}`} className="group block">
                    <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-navy-900">
                      <MediaImage
                        media={tour.coverImage}
                        alt={tour.name}
                        seed={index + 2}
                        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                        className="img-zoom"
                      />
                      {tour.availability !== "available" ? (
                        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-navy-900">
                          {tour.availability === "sold_out" ? "Sold Out" : "Upcoming"}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-5">
                      {tour.destination ? (
                        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-500">
                          {tour.destination}
                        </p>
                      ) : null}

                      <h3 className="mt-2 text-h3 font-semibold transition-colors duration-200 group-hover:text-gold-600">
                        {tour.name}
                      </h3>

                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem] text-ink-subtle">
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
          </>
        ) : null}

        {/* Permanent custom-travel invitation */}
        <div
          className={`${tours.length > 0 ? "mt-16" : ""} rounded-lg border border-line-gold bg-gold-50 px-7 py-10 sm:px-12 sm:py-12`}
        >
          <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between md:gap-12">
            <div className="max-w-xl">
              <h3 className="text-h2 font-semibold">
                Your Destination. <span className="accent">Your Plan.</span>
              </h3>
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
  );
}
