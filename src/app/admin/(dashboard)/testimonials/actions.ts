"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { testimonialSchema } from "@/lib/validation/admin";
import { ok, parseForm, revalidatePublic, type ActionState } from "@/lib/admin/actions";

export async function saveTestimonialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  const parsed = parseForm(testimonialSchema, formData);
  if (!parsed.success) return parsed.state;

  const { reviewDate, ...rest } = parsed.data;
  const data = {
    ...rest,
    reviewDate: reviewDate.trim() ? new Date(`${reviewDate}T00:00:00`) : null,
  };

  const saved = id
    ? await db.testimonial.update({ where: { id }, data })
    : await db.testimonial.create({ data });

  await audit({
    user,
    action: id ? "update" : "create",
    entityType: "Testimonial",
    entityId: saved.id,
    summary: `${id ? "Updated" : "Added"} testimonial from ${data.authorName}`,
  });

  revalidatePath("/admin/testimonials");
  revalidatePublic();
  return ok(id ? "Testimonial saved." : "Testimonial added.");
}

export async function toggleTestimonialAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const row = await db.testimonial.findUnique({
    where: { id },
    select: { published: true, authorName: true },
  });
  if (!row) return;

  await db.testimonial.update({ where: { id }, data: { published: !row.published } });
  await audit({
    user,
    action: row.published ? "unpublish" : "publish",
    entityType: "Testimonial",
    entityId: id,
    summary: `${row.authorName}'s testimonial ${row.published ? "unpublished" : "published"}`,
  });

  revalidatePath("/admin/testimonials");
  revalidatePublic();
}

export async function deleteTestimonialAction(formData: FormData): Promise<void> {
  const user = await requireAdmin("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const removed = await db.testimonial.delete({ where: { id }, select: { authorName: true } });
  await audit({
    user,
    action: "delete",
    entityType: "Testimonial",
    entityId: id,
    summary: `Deleted testimonial from ${removed.authorName}`,
  });

  revalidatePath("/admin/testimonials");
  revalidatePublic();
}
