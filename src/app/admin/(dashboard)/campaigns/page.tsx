import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader } from "@/components/admin/ui";
import { CampaignManager } from "@/components/admin/campaign-manager";
import { deleteCampaignAction, toggleCampaignAction } from "./actions";

export const metadata = { title: "Campaigns" };

/** Formats a Date for a native <input type="date">. */
function forInput(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function CampaignsPage() {
  const user = await requireAdmin();

  const [campaigns, media] = await Promise.all([
    db.campaign.findMany({
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, originalName: true, altText: true },
    }),
  ]);

  const now = Date.now();

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="The promotional band on the homepage. Only an active campaign inside its date window is shown — when none qualifies, the section disappears entirely rather than leaving a gap."
      />

      <PageBody>
        <CampaignManager
          media={media}
          canDelete={user.role !== "editor"}
          toggleAction={toggleCampaignAction}
          deleteAction={deleteCampaignAction}
          campaigns={campaigns.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            headline: campaign.headline,
            description: campaign.description,
            ctaLabel: campaign.ctaLabel,
            ctaHref: campaign.ctaHref,
            startsAt: forInput(campaign.startsAt),
            endsAt: forInput(campaign.endsAt),
            active: campaign.active,
            featured: campaign.featured,
            displayLocation: campaign.displayLocation,
            sortOrder: campaign.sortOrder,
            isPlaceholder: campaign.isPlaceholder,
            desktopImageId: campaign.desktopImageId,
            mobileImageId: campaign.mobileImageId,
            live:
              campaign.active &&
              !campaign.isPlaceholder &&
              (!campaign.startsAt || campaign.startsAt.getTime() <= now) &&
              (!campaign.endsAt || campaign.endsAt.getTime() >= now),
            expired: Boolean(campaign.endsAt && campaign.endsAt.getTime() < now),
          }))}
        />
      </PageBody>
    </>
  );
}
