"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { aboutSchema } from "@/lib/validation/admin";
import { ok, parseForm, revalidatePublic, type ActionState } from "@/lib/admin/actions";

export async function saveAboutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = parseForm(aboutSchema, formData);
  if (!parsed.success) return parsed.state;

  await db.aboutPage.upsert({
    where: { id: "about" },
    update: parsed.data,
    create: { id: "about", ...parsed.data },
  });

  await audit({
    user,
    action: "update",
    entityType: "AboutPage",
    entityId: "about",
    summary: "Updated the About page",
  });
  revalidatePath("/admin/about");
  revalidatePublic("/about");
  return ok("About page saved.");
}

export async function addGalleryImageAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const mediaId = String(formData.get("mediaId") ?? "");
  if (!mediaId) return;

  const count = await db.aboutGalleryImage.count();
  await db.aboutGalleryImage.create({
    data: {
      mediaId,
      caption: String(formData.get("caption") ?? "").slice(0, 200),
      sortOrder: count,
    },
  });

  await audit({
    user,
    action: "create",
    entityType: "AboutGalleryImage",
    summary: "Added an office gallery image",
  });
  revalidatePath("/admin/about");
  revalidatePublic("/about");
}

export async function removeGalleryImageAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.aboutGalleryImage.delete({ where: { id } });
  await audit({
    user,
    action: "delete",
    entityType: "AboutGalleryImage",
    entityId: id,
    summary: "Removed an office gallery image",
  });
  revalidatePath("/admin/about");
  revalidatePublic("/about");
}

export async function saveTeamMemberAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const data = {
    name: name.slice(0, 120),
    role: String(formData.get("role") ?? "").slice(0, 120),
    bio: String(formData.get("bio") ?? "").slice(0, 1000),
    photoId: String(formData.get("photoId") ?? "") || null,
    published: formData.get("published") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };

  if (id) await db.teamMember.update({ where: { id }, data });
  else await db.teamMember.create({ data });

  await audit({
    user,
    action: id ? "update" : "create",
    entityType: "TeamMember",
    entityId: id || undefined,
    summary: `${id ? "Updated" : "Added"} team member ${name}`,
  });
  revalidatePath("/admin/about");
  revalidatePublic("/about");
}

export async function deleteTeamMemberAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const removed = await db.teamMember.delete({ where: { id }, select: { name: true } });
  await audit({
    user,
    action: "delete",
    entityType: "TeamMember",
    entityId: id,
    summary: `Removed team member ${removed.name}`,
  });
  revalidatePath("/admin/about");
  revalidatePublic("/about");
}

export async function saveMilestoneAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!label || !value) return;

  const count = await db.milestone.count();
  await db.milestone.create({
    data: {
      label: label.slice(0, 120),
      value: value.slice(0, 60),
      published: formData.get("published") === "on",
      sortOrder: count,
    },
  });

  await audit({
    user,
    action: "create",
    entityType: "Milestone",
    summary: `Added milestone ${label}`,
  });
  revalidatePath("/admin/about");
  revalidatePublic("/about");
}

export async function deleteMilestoneAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.milestone.delete({ where: { id } });
  await audit({
    user,
    action: "delete",
    entityType: "Milestone",
    entityId: id,
    summary: "Removed a milestone",
  });
  revalidatePath("/admin/about");
  revalidatePublic("/about");
}
