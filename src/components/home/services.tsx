import Link from "next/link";
import { Icon, IconArrowRight } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { safeHref } from "@/lib/format";

type Service = {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
};

/**
 * Core services — four cards, one row on desktop, two columns on tablet.
 * Kept flat and text-led: an icon, a title, one sentence. No badges, no prices,
 * no secondary actions competing for the click.
 */
export function Services({
  heading,
  subheading,
  services,
}: {
  heading: string;
  subheading: string;
  services: Service[];
}) {
  if (services.length === 0) return null;

  return (
    <section className="section bg-canvas">
      <div className="container-df">
        <SectionHeading eyebrow="What We Do" title={heading} description={subheading} />
        <ul className="mt-14 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => {
            const href = safeHref(service.href, "");
            const cardClass =
              "flex h-full flex-col p-7 transition-colors duration-300 hover:bg-gold-50 lg:p-8";

            const body = (
              <>
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-sm border border-line-gold bg-gold-50 text-gold-500 transition-colors duration-300 group-hover:border-gold-300 group-hover:bg-white"
                  aria-hidden="true"
                >
                  <Icon name={service.icon} width={21} height={21} />
                </span>

                <h3 className="mt-6 text-h3 font-semibold">{service.title}</h3>

                {service.description ? (
                  <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-ink-muted">
                    {service.description}
                  </p>
                ) : (
                  <span className="flex-1" />
                )}

                {href ? (
                  <span className="link-arrow mt-6 text-[0.875rem]">
                    Learn more
                    <IconArrowRight width={15} height={15} />
                  </span>
                ) : null}
              </>
            );

            return (
              <Reveal
                as="li"
                key={service.id}
                delay={Math.min(index, 3) as 0 | 1 | 2 | 3}
                className="group bg-surface"
              >
                {href ? (
                  <Link href={href} className={cardClass}>
                    {body}
                  </Link>
                ) : (
                  <div className={cardClass}>{body}</div>
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
