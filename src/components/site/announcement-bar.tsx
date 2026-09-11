import Link from "next/link";
import { IconArrowRight } from "@/components/ui/icons";
import { safeHref } from "@/lib/format";

/**
 * The site-wide notice strip above the header.
 *
 * Used for a holiday closure, an office update or a short-lived promotion. The
 * caller passes null whenever no announcement is active and in date, so nothing
 * is rendered and the header sits flush against the top of the page.
 */
export function AnnouncementBar({
  headline,
  ctaLabel,
  ctaHref,
}: {
  headline: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  if (!headline.trim()) return null;

  return (
    <div className="on-navy bg-navy-950 text-center">
      <div className="container-df flex min-h-[42px] flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2">
        <p className="text-[0.8125rem] leading-snug text-white/85">{headline}</p>
        {ctaLabel.trim() ? (
          <Link
            href={safeHref(ctaHref, "/contact")}
            className="inline-flex min-h-[24px] items-center gap-1 text-[0.8125rem] font-semibold text-gold-200 underline-offset-4 hover:underline"
          >
            {ctaLabel}
            <IconArrowRight width={13} height={13} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
