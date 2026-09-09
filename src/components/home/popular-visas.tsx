import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { MediaImage } from "@/components/ui/media-image";
import { Reveal } from "@/components/ui/reveal";
import { flagEmoji } from "@/lib/format";

type Destination = {
  id: string;
  slug: string;
  countryName: string;
  countryCode: string;
  processingTime: string;
  coverImage: { url: string; altText: string | null } | null;
  flagImage: { url: string; altText: string | null } | null;
};

/**
 * Popular visa destinations.
 *
 * The countries shown are never hard-coded — they are whichever destinations an
 * administrator has marked Featured, in their chosen order (brief §5.03).
 */
export function PopularVisas({
  heading,
  subheading,
  ctaLabel,
  destinations,
}: {
  heading: string;
  subheading: string;
  ctaLabel: string;
  destinations: Destination[];
}) {
  if (destinations.length === 0) return null;

  return (
    <section className="section border-y border-line bg-surface">
      <div className="container-df">
        <SectionHeading
          eyebrow="Visa Services"
          title={heading}
          description={subheading}
          cta={ctaLabel ? { label: ctaLabel, href: "/visa" } : null}
        />

        <ul className="mt-14 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {destinations.map((destination, index) => (
            <Reveal as="li" key={destination.id} delay={Math.min(index % 4, 3) as 0 | 1 | 2 | 3}>
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
                  {/* Legibility scrim — a gradient for text contrast, not decoration */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-navy-950/85 via-navy-950/35 to-transparent"
                    aria-hidden="true"
                  />

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="flex items-center gap-2">
                      {destination.flagImage?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={destination.flagImage.url}
                          alt=""
                          width={20}
                          height={14}
                          loading="lazy"
                          className="h-3.5 w-5 rounded-[1px] object-cover ring-1 ring-white/25"
                        />
                      ) : flagEmoji(destination.countryCode) ? (
                        <span className="text-[0.9375rem] leading-none" aria-hidden="true">
                          {flagEmoji(destination.countryCode)}
                        </span>
                      ) : null}
                      <h3 className="font-display text-[1.0625rem] font-semibold leading-tight tracking-[-0.02em] text-white">
                        {destination.countryName}
                      </h3>
                    </div>
                    {destination.processingTime ? (
                      <p className="mt-1.5 text-[0.75rem] font-medium text-white/70">
                        {destination.processingTime}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
