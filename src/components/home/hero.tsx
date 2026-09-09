import Link from "next/link";
import { IconArrowRight } from "@/components/ui/icons";
import { WhatsAppLink } from "@/components/site/whatsapp-link";
import { BrandPanel } from "@/components/ui/brand-panel";
import { safeHref } from "@/lib/format";

type ImageRef = {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
} | null;

type Props = {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  description: string;
  brandLine: string;
  badge: string;
  desktopImage: ImageRef;
  mobileImage: ImageRef;
  videoUrl: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  companyName: string;
  whatsappDigits: string;
};

/**
 * Hero — a split composition: typography-led on the left, one strong visual
 * bleeding off the right edge. Deliberately a single image rather than a
 * collage of passports, planes and flags.
 *
 * The visual is art-directed with <picture> so a portrait mobile crop can be
 * uploaded separately; with no image at all it falls back to the brand panel,
 * so the page is finished on day one.
 */
export function Hero(props: Props) {
  const {
    eyebrow,
    headline,
    headlineAccent,
    description,
    brandLine,
    badge,
    desktopImage,
    mobileImage,
    videoUrl,
    primaryCtaLabel,
    primaryCtaHref,
    secondaryCtaLabel,
    secondaryCtaHref,
    companyName,
    whatsappDigits,
  } = props;

  const hasVisual = Boolean(desktopImage?.url || mobileImage?.url || videoUrl);
  const alt = desktopImage?.altText?.trim() || `${companyName} travel and visa services`;

  return (
    <section className="relative overflow-hidden border-b border-line bg-canvas">
      <div className="lg:grid lg:min-h-[max(560px,78vh)] lg:grid-cols-[minmax(0,1fr)_minmax(0,44%)] lg:items-stretch">
        {/* Copy */}
        <div className="container-left-pad flex flex-col justify-center pb-14 pt-14 sm:pb-20 sm:pt-20 lg:py-24">
          <div className="max-w-[36rem]">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h1 className="mt-6 text-display font-bold text-navy-900">
              {headline}
              {headlineAccent ? <span className="accent"> {headlineAccent}</span> : null}
            </h1>
            {description ? <p className="lead mt-6 max-w-[34rem]">{description}</p> : null}
            {brandLine ? (
              <p className="mt-8 flex items-center gap-3.5">
                <span className="hairline-gold shrink-0" aria-hidden="true" />
                <span className="font-display text-[0.9375rem] font-semibold tracking-[0.02em] text-gold-500">
                  {brandLine}
                </span>
              </p>
            ) : null}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {primaryCtaLabel ? (
                <Link href={safeHref(primaryCtaHref, "/visa")} className="btn btn-primary btn-lg">
                  {primaryCtaLabel}
                  <IconArrowRight />
                </Link>
              ) : null}

              {secondaryCtaLabel ? (
                secondaryCtaHref.trim() ? (
                  <Link href={safeHref(secondaryCtaHref)} className="btn btn-outline btn-lg">
                    {secondaryCtaLabel}
                  </Link>
                ) : (
                  <WhatsAppLink
                    number={whatsappDigits}
                    className="btn btn-outline btn-lg"
                    context={{ kind: "general" }}
                  >
                    {secondaryCtaLabel}
                  </WhatsAppLink>
                )
              ) : null}
            </div>
            {badge ? (
              <p className="mt-8">
                <span className="badge badge-gold">{badge}</span>
              </p>
            ) : null}
          </div>
        </div>

        {/* Visual */}
        <div className="relative min-h-[300px] sm:min-h-[400px] lg:min-h-0">
          {videoUrl ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={videoUrl}
              poster={desktopImage?.url ?? undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              aria-label={alt}
            />
          ) : hasVisual ? (
            <picture>
              {mobileImage?.url ? (
                <source media="(max-width: 767px)" srcSet={mobileImage.url} />
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={desktopImage?.url ?? mobileImage?.url ?? ""}
                alt={alt}
                width={desktopImage?.width ?? 1400}
                height={desktopImage?.height ?? 1600}
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </picture>
          ) : (
            <BrandPanel seed={1} />
          )}

          {/* Hairline separating the visual from the copy on large screens */}
          <span
            className="pointer-events-none absolute inset-y-0 left-0 hidden w-px bg-line lg:block"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
