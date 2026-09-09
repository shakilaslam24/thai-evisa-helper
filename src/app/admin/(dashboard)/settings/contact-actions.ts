"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { contactEmailSchema, contactNumberSchema, officeHourSchema } from "@/lib/validation/admin";
import { ok, parseForm, revalidatePublic, type ActionState } from "@/lib/admin/actions";

/** Contact details appear on every page, so a change purges the whole site. */
function purge() {
  revalidatePath("/admin/settings");
  revalidatePublic("/visa", "/tours", "/air-ticket-hotel", "/b2b", "/about", "/contact");
}

export async function saveContactNumberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin("admin");
  const parsed = parseForm(contactNumberSchema, formData);
  if (!parsed.success) return parsed.state;

  const { id, ...data } = parsed.data;

  // A number that offers WhatsApp but has no dedicated WhatsApp number falls
  // back to its own digits, so staff don't have to type it twice.
  if (data.whatsappEnabled && !data.whatsappNumber) {
    data.whatsappNumber = data.number.replace(/\D/g, "");
  }
  if (!data.whatsappEnabled) data.isPrimaryWhatsapp = false;

  const saved = id
    ? await db.contactNumber.update({ where: { id }, data })
    : await db.contactNumber.create({ data });

  // Exactly one primary phone and one primary WhatsApp.
  if (data.isPrimary) {
    await db.contactNumber.updateMany({
      where: { id: { not: saved.id } },
      data: { isPrimary: false },
    });
  }
  if (data.isPrimaryWhatsapp) {
    await db.contactNumber.updateMany({
      where: { id: { not: saved.id } },
      data: { isPrimaryWhatsapp: false },
    });
  }

  await audit({
    user,
    action: id ? "update" : "create",
    entityType: "ContactNumber",
    entityId: saved.id,
    summary: `${id ? "Updated" : "Added"} contact number ${data.number}`,
  });

  purge();
  return ok(id ? "Number saved." : "Number added.");
}

export async function deleteContactNumberAction(formData: FormData): Promise<void> {
  const user = await requireAdmin("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const removed = await db.contactNumber.delete({ where: { id }, select: { number: true } });
  await audit({
    user,
    action: "delete",
    entityType: "ContactNumber",
    entityId: id,
    summary: `Removed contact number ${removed.number}`,
  });
  purge();
}

export async function moveContactNumberAction(formData: FormData): Promise<void> {
  await requireAdmin("admin");
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || !["up", "down"].includes(direction)) return;

  const rows = await db.contactNumber.findMany({
    where: { archived: false },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const index = rows.findIndex((row) => row.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= rows.length) return;

  // Rewrite the whole order rather than swapping two values, which keeps the
  // sequence contiguous however it got out of step.
  const reordered = [...rows];
  const [moved] = reordered.splice(index, 1);
  if (moved) reordered.splice(target, 0, moved);

  await db.$transaction(
    reordered.map((row, position) =>
      db.contactNumber.update({ where: { id: row.id }, data: { sortOrder: position } }),
    ),
  );
  purge();
}

export async function saveContactEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin("admin");
  const parsed = parseForm(contactEmailSchema, formData);
  if (!parsed.success) return parsed.state;

  const { id, ...data } = parsed.data;
  const saved = id
    ? await db.contactEmail.update({ where: { id }, data })
    : await db.contactEmail.create({ data });

  if (data.isPrimary) {
    await db.contactEmail.updateMany({
      where: { id: { not: saved.id } },
      data: { isPrimary: false },
    });
  }

  await audit({
    user,
    action: id ? "update" : "create",
    entityType: "ContactEmail",
    entityId: saved.id,
    summary: `${id ? "Updated" : "Added"} email ${data.address}`,
  });

  purge();
  return ok(id ? "Email saved." : "Email added.");
}

export async function deleteContactEmailAction(formData: FormData): Promise<void> {
  const user = await requireAdmin("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const removed = await db.contactEmail.delete({ where: { id }, select: { address: true } });
  await audit({
    user,
    action: "delete",
    entityType: "ContactEmail",
    entityId: id,
    summary: `Removed email ${removed.address}`,
  });
  purge();
}

export async function saveOfficeHourAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin("admin");
  const parsed = parseForm(officeHourSchema, formData);
  if (!parsed.success) return parsed.state;

  const { id, ...data } = parsed.data;
  const saved = id
    ? await db.officeHour.update({ where: { id }, data })
    : await db.officeHour.create({ data });

  await audit({
    user,
    action: id ? "update" : "create",
    entityType: "OfficeHour",
    entityId: saved.id,
    summary: `${id ? "Updated" : "Added"} office hours ${data.label}`,
  });

  purge();
  return ok(id ? "Hours saved." : "Hours added.");
}

export async function deleteOfficeHourAction(formData: FormData): Promise<void> {
  const user = await requireAdmin("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.officeHour.delete({ where: { id } });
  await audit({
    user,
    action: "delete",
    entityType: "OfficeHour",
    entityId: id,
    summary: "Removed an office hours row",
  });
  purge();
}
