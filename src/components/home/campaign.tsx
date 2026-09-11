import Link from "next/link";
import { IconArrowRight } from "@/components/ui/icons";
import { safeHref } from "@/lib/format";

type Props = {
  headline: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  desktopImage: { url: string; altText: string | null } | null;
  mobileImage: { url: string; altText: string | null } | null;
  name: string;
};

/**
 * The scheduled campaign band.
 *
 * Rendered only when the caller has resolved an active, in-window campaign —
 * `getActiveCampaign()` returns null otherwise, so no empty section is ever
 * produced and an expired campaign vanishes without an edit (brief §5.04).
 */
export function CampaignBand({
  headline,
  description,
  ctaLabel,
  ctaHref,
  desktopImage,
  mobileImage,
  name,
}: Props) {
  const alt = desktopImage?.altText?.trim() || name;
  const hasImage = Boolean(desktopImage?.url || mobileImage?.url);

  return (
    <section className="section-sm bg-canvas" aria-label={`Campaign: ${name}`}>
      <div className="container-df">
        <div className="on-navy panel-navy relative isolate overflow-hidden rounded-lg">
          {hasImage ? (
            <>
              <picture>
                {mobileImage?.url ? (
                  <source media="(max-width: 767px)" srcSet={mobileImage.url} />
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={desktopImage?.url ?? mobileImage?.url ?? ""}
                  alt={alt}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 -z-10 h-full w-full object-cover"
                />
              </picture>
              <div
                className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/92 via-navy-950/75 to-navy-950/40"
                aria-hidden="true"
              />
            </>
          ) : null}

          <div className="max-w-2xl px-7 py-14 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
            <p className="eyebrow">Now On</p>
            <h2 className="mt-5 text-h2 font-semibold">{headline || name}</h2>
            {description ? <p className="lead mt-4">{description}</p> : null}
            {ctaLabel ? (
              <Link href={safeHref(ctaHref, "/contact")} className="btn btn-gold btn-lg mt-9">
                {ctaLabel}
                <IconArrowRight />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
