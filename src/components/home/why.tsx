import { Icon } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

type Item = { id: string; title: string; description: string; icon: string };

/**
 * Why DreamFly — a numbered list rather than four more cards.
 *
 * The homepage already carries two card grids; repeating the pattern a third
 * time would flatten the hierarchy. Numerals and hairlines give this section
 * its own texture while staying inside the design system.
 */
export function WhyDreamFly({
  heading,
  subheading,
  items,
}: {
  heading: string;
  subheading: string;
  items: Item[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="section bg-canvas">
      <div className="container-df">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading eyebrow="Why DreamFly" title={heading} description={subheading} />
          </div>
          <ul>
            {items.map((item, index) => (
              <Reveal
                as="li"
                key={item.id}
                delay={Math.min(index, 3) as 0 | 1 | 2 | 3}
                className="flex gap-5 border-b border-line py-7 first:pt-0 last:border-0 last:pb-0 sm:gap-7"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-gold text-gold-500"
                  aria-hidden="true"
                >
                  <Icon name={item.icon} width={18} height={18} />
                </span>

                <div className="min-w-0">
                  <h3 className="flex items-baseline gap-3 text-h3 font-semibold">
                    <span className="font-display text-[0.75rem] font-semibold tabular-nums text-gold-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
