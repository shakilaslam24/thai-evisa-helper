import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata = { title: "Global Settings" };

export default async function SettingsPage() {
  await requireAdmin("admin");

  const [settings, media] = await Promise.all([
    db.globalSettings.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, originalName: true, altText: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Global Settings"
        description="Business information used everywhere on the website. Change it here and it updates on every page — nothing is hard-coded."
      />
      <PageBody>
        <SettingsForm settings={settings} media={media} />
      </PageBody>
    </>
  );
}
