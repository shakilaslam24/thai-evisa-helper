import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { ContactChannels } from "@/components/admin/contact-channels";

export const metadata = { title: "Global Settings" };

export default async function SettingsPage() {
  await requireAdmin("admin");

  const [settings, media, numbers, emails, hours] = await Promise.all([
    db.globalSettings.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, originalName: true, altText: true },
    }),
    db.contactNumber.findMany({ where: { archived: false }, orderBy: { sortOrder: "asc" } }),
    db.contactEmail.findMany({ where: { archived: false }, orderBy: { sortOrder: "asc" } }),
    db.officeHour.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Global Settings"
        description="Business information used everywhere on the website. Change it here and it updates on every page — nothing is hard-coded."
      />
      <PageBody>
        <div className="grid max-w-4xl gap-6">
          <ContactChannels numbers={numbers} emails={emails} hours={hours} />
          <SettingsForm settings={settings} media={media} />
        </div>
      </PageBody>
    </>
  );
}
