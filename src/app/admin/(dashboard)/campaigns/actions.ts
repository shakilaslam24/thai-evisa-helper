"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { campaignSchema } from "@/lib/validation/admin";
import { ok, parseForm, revalidatePublic, type ActionState } from "@/lib/admin/actions";

/** A date input gives "YYYY-MM-DD"; store it as a real timestamp or null. */
function toDate(value: string, endOfDay = false): Date | null {
  if (!value.trim()) return null;
  const date = new Date(endOfDay ? `${value}T23:59:59` : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function saveCampaignAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  const parsed = parseForm(campaignSchema, formData);
  if (!parsed.success) return parsed.state;
  const input = parsed.data;

  const data = {
    name: input.name,
    headline: input.headline,
    description: input.description,
    ctaLabel: input.ctaLabel,
    ctaHref: input.ctaHref,
    startsAt: toDate(input.startsAt),
    endsAt: toDate(input.endsAt, true),
    active: input.active,
    sortOrder: input.sortOrder,
    isPlaceholder: input.isPlaceholder,
    desktopImageId: input.desktopImageId,
    mobileImageId: input.mobileImageId,
  };

  const saved = id
    ? await db.campaign.update({ where: { id }, data })
    : await db.campaign.create({ data });

  await audit({
    user,
    action: id ? "update" : "create",
    entityType: "Campaign",
    entityId: saved.id,
    summary: `${id ? "Updated" : "Created"} campaign ${input.name}`,
  });

  revalidatePath("/admin/campaigns");
  revalidatePublic();
  return ok(id ? "Campaign saved." : "Campaign created.");
}

export async function toggleCampaignAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const campaign = await db.campaign.findUnique({ where: { id }, select: { active: true, name: true } });
  if (!campaign) return;

  await db.campaign.update({ where: { id }, data: { active: !campaign.active } });
  await audit({
    user,
    action: campaign.active ? "unpublish" : "publish",
    entityType: "Campaign",
    entityId: id,
    summary: `${campaign.name} ${campaign.active ? "deactivated" : "activated"}`,
  });

  revalidatePath("/admin/campaigns");
  revalidatePublic();
}

export async function deleteCampaignAction(formData: FormData): Promise<void> {
  const user = await requireAdmin("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const removed = await db.campaign.delete({ where: { id }, select: { name: true } });
  await audit({
    user,
    action: "delete",
    entityType: "Campaign",
    entityId: id,
    summary: `Deleted campaign ${removed.name}`,
  });

  revalidatePath("/admin/campaigns");
  revalidatePublic();
}
