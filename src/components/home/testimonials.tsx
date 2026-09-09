import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

type Testimonial = {
  id: string;
  authorName: string;
  authorTitle: string;
  quote: string;
  serviceType: string;
  rating: number | null;
  avatar: { url: string; altText: string | null } | null;
};

/**
 * Reviews.
 *
 * Only real testimonials entered and published through Admin are ever shown.
 * The caller passes an empty array when there are none and this renders
 * nothing at all — no placeholder quotes, no invented praise (brief §5.07).
 */
export function Testimonials({
  heading,
  subheading,
  testimonials,
}: {
  heading: string;
  subheading: string;
  testimonials: Testimonial[];
}) {
  if (testimonials.length === 0) return null;

  return (
    <section className="section bg-canvas">
      <div className="container-df">
        <SectionHeading
          eyebrow="Client Feedback"
          title={heading}
          description={subheading}
          align="center"
        />
        <ul className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Reveal
              as="li"
              key={testimonial.id}
              delay={Math.min(index % 3, 3) as 0 | 1 | 2 | 3}
              className="card flex h-full flex-col p-7"
            >
              {testimonial.rating ? (
                <p
                  className="mb-4 flex gap-0.5 text-gold-400"
                  aria-label={`Rated ${testimonial.rating} out of 5`}
                >
                  {Array.from({ length: 5 }, (_, starIndex) => (
                    <svg
                      key={starIndex}
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill={starIndex < testimonial.rating! ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    >
                      <path d="m12 3.5 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8L12 3.5Z" />
                    </svg>
                  ))}
                </p>
              ) : null}

              <blockquote className="flex-1">
                <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
                  “{testimonial.quote}”
                </p>
              </blockquote>

              <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                {testimonial.avatar?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={testimonial.avatar.url}
                    alt=""
                    width={40}
                    height={40}
                    loading="lazy"
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 font-display text-[0.8125rem] font-semibold text-white"
                    aria-hidden="true"
                  >
                    {testimonial.authorName.trim().charAt(0).toUpperCase()}
                  </span>
                )}

                <div className="min-w-0">
                  <p className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-navy-900">
                    {testimonial.authorName}
                  </p>
                  {testimonial.authorTitle || testimonial.serviceType ? (
                    <p className="truncate text-[0.8125rem] text-ink-subtle">
                      {[testimonial.authorTitle, testimonial.serviceType]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
              </figcaption>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
