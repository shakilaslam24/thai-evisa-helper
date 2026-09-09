import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader, Panel } from "@/components/admin/ui";
import { AboutForm } from "@/components/admin/about-form";
import { MediaPicker } from "@/components/admin/media-picker";
import { ActionButton, Input, Toggle } from "@/components/admin/form-controls";
import {
  addGalleryImageAction,
  deleteMilestoneAction,
  deleteTeamMemberAction,
  removeGalleryImageAction,
  saveMilestoneAction,
  saveTeamMemberAction,
} from "./actions";

export const metadata = { title: "About Page" };

export default async function AboutAdminPage() {
  await requireAdmin();

  const [about, gallery, team, milestones, media] = await Promise.all([
    db.aboutPage.upsert({ where: { id: "about" }, update: {}, create: { id: "about" } }),
    db.aboutGalleryImage.findMany({ orderBy: { sortOrder: "asc" }, include: { media: true } }),
    db.teamMember.findMany({ orderBy: { sortOrder: "asc" }, include: { photo: true } }),
    db.milestone.findMany({ orderBy: { sortOrder: "asc" } }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, originalName: true, altText: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="About Page"
        description="Write this in DreamFly's own words. Leave a section empty and it simply won't appear — better an honest short page than invented history."
        actions={
          <a href="/about" target="_blank" rel="noopener" className="btn btn-outline btn-sm">
            View page
          </a>
        }
      />

      <PageBody>
        <div className="grid max-w-4xl gap-6">
          <AboutForm about={about} />

          <Panel
            title="Office gallery"
            description="Real photographs of your office and team at work."
          >
            {gallery.length > 0 ? (
              <ul className="mb-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {gallery.map((item) => (
                  <li key={item.id} className="overflow-hidden rounded-sm border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.media.url}
                      alt={item.caption}
                      className="aspect-square w-full object-cover"
                    />
                    <form action={removeGalleryImageAction} className="p-1.5">
                      <input type="hidden" name="id" value={item.id} />
                      <ActionButton className="btn btn-ghost btn-sm btn-block text-[#8c1d18]">
                        Remove
                      </ActionButton>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}

            <form action={addGalleryImageAction} className="grid gap-4 border-t border-line pt-5">
              <MediaPicker label="Image" name="mediaId" options={media} />
              <Input label="Caption" name="caption" />
              <div>
                <ActionButton className="btn btn-outline btn-sm">Add to gallery</ActionButton>
              </div>
            </form>
          </Panel>

          <Panel title="Team" description="Only add people who have agreed to appear here.">
            {team.length > 0 ? (
              <ul className="mb-5 divide-y divide-line">
                {team.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[0.9375rem] font-medium text-ink">
                        {member.name}
                      </p>
                      <p className="truncate text-[0.75rem] text-ink-subtle">
                        {member.role || "—"}
                        {member.published ? "" : " · hidden"}
                      </p>
                    </div>
                    <form action={deleteTeamMemberAction}>
                      <input type="hidden" name="id" value={member.id} />
                      <ActionButton
                        className="btn btn-ghost btn-sm text-[#8c1d18]"
                        confirm={`Remove ${member.name}?`}
                      >
                        Remove
                      </ActionButton>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}

            <form
              action={saveTeamMemberAction}
              className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2"
            >
              <Input label="Name" name="name" required />
              <Input label="Role" name="role" />
              <div className="sm:col-span-2">
                <Input label="Short bio" name="bio" />
              </div>
              <div className="sm:col-span-2">
                <MediaPicker label="Photo" name="photoId" options={media} />
              </div>
              <Input label="Order" name="sortOrder" type="number" defaultValue={team.length} />
              <div className="flex items-end">
                <Toggle label="Show on the website" name="published" defaultChecked />
              </div>
              <div className="sm:col-span-2">
                <ActionButton className="btn btn-outline btn-sm">Add team member</ActionButton>
              </div>
            </form>
          </Panel>

          <Panel
            title="Milestones"
            description="Optional. Add only figures you can evidence — never invent a customer count or a number of years."
          >
            {milestones.length > 0 ? (
              <ul className="mb-5 divide-y divide-line">
                {milestones.map((milestone) => (
                  <li key={milestone.id} className="flex items-center justify-between gap-3 py-3">
                    <p className="text-[0.9375rem] text-ink">
                      <strong className="font-semibold">{milestone.value}</strong> —{" "}
                      {milestone.label}
                      {milestone.published ? "" : " (hidden)"}
                    </p>
                    <form action={deleteMilestoneAction}>
                      <input type="hidden" name="id" value={milestone.id} />
                      <ActionButton className="btn btn-ghost btn-sm text-[#8c1d18]">
                        Remove
                      </ActionButton>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}

            <form
              action={saveMilestoneAction}
              className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2"
            >
              <Input label="Value" name="value" placeholder="e.g. 2019" required />
              <Input label="Label" name="label" placeholder="e.g. Year founded" required />
              <div className="sm:col-span-2">
                <Toggle label="Show on the website" name="published" defaultChecked />
              </div>
              <div className="sm:col-span-2">
                <ActionButton className="btn btn-outline btn-sm">Add milestone</ActionButton>
              </div>
            </form>
          </Panel>
        </div>
      </PageBody>
    </>
  );
}
