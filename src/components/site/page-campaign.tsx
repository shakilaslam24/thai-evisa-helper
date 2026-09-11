import Link from "next/link";
import { IconArrowRight } from "@/components/ui/icons";
import { safeHref } from "@/lib/format";

type Campaign = {
  name: string;
  headline: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
} | null;

/**
 * A compact campaign strip for the top of a listing page.
 *
 * Quieter than the homepage band — a listing page's job is the list, so the
 * promotion sits above it as a single line rather than a full-height panel.
 * Renders nothing when the caller has no active, in-window campaign.
 */
export function PageCampaign({ campaign }: { campaign: Campaign }) {
  if (!campaign) return null;
  const headline = campaign.headline || campaign.name;

  return (
    <div className="container-df pt-10">
      <div className="flex flex-col gap-4 rounded-md border border-line-gold bg-gold-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Now on</p>
          <h2 className="mt-2 font-display text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink">
            {headline}
          </h2>
          {campaign.description ? (
            <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-muted">
              {campaign.description}
            </p>
          ) : null}
        </div>

        {campaign.ctaLabel ? (
          <Link
            href={safeHref(campaign.ctaHref, "/contact")}
            className="btn btn-primary btn-sm shrink-0"
          >
            {campaign.ctaLabel}
            <IconArrowRight width={15} height={15} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
