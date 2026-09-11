"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { enquiryNoteSchema, enquiryUpdateSchema } from "@/lib/validation/admin";
import { ok, parseForm, type ActionState } from "@/lib/admin/actions";

export async function updateEnquiryStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = parseForm(enquiryUpdateSchema, formData);
  if (!parsed.success) return parsed.state;

  const { id, status } = parsed.data;
  await db.enquiry.update({
    where: { id },
    data: { status, archived: status === "archived" },
  });

  await audit({
    user,
    action: "status_change",
    entityType: "Enquiry",
    entityId: id,
    summary: `Enquiry marked ${status.replace(/_/g, " ")}`,
  });

  revalidatePath("/admin/enquiries");
  revalidatePath(`/admin/enquiries/${id}`);
  revalidatePath("/admin");
  return ok("Status updated.");
}

export async function addEnquiryNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = parseForm(enquiryNoteSchema, formData);
  if (!parsed.success) return parsed.state;

  await db.enquiryNote.create({
    data: {
      enquiryId: parsed.data.enquiryId,
      body: parsed.data.body,
      authorName: user.name,
    },
  });

  revalidatePath(`/admin/enquiries/${parsed.data.enquiryId}`);
  return ok("Note added.");
}

/**
 * CSV export of the current filter.
 *
 * Values are escaped and any leading =, +, - or @ is neutralised, so a crafted
 * enquiry cannot become a live formula when the file is opened in a spreadsheet.
 */
export async function exportEnquiriesAction(
  formData: FormData,
): Promise<{ filename: string; csv: string }> {
  const user = await requireAdmin("admin");

  const type = String(formData.get("type") ?? "");
  const status = String(formData.get("status") ?? "");

  const rows = await db.enquiry.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const headers = [
    "Created",
    "Type",
    "Name",
    "Phone",
    "WhatsApp",
    "Email",
    "Service",
    "Destination",
    "Message",
    "Status",
    "Source Page",
    "UTM Source",
    "UTM Medium",
    "UTM Campaign",
    "UTM Content",
    "UTM Term",
    "Referrer",
  ];

  const escape = (value: unknown): string => {
    const text = String(value ?? "");
    // Neutralise spreadsheet formula injection.
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.createdAt.toISOString(),
        row.type,
        row.name,
        row.phone,
        row.whatsapp,
        row.email,
        row.service,
        row.destination,
        row.message,
        row.status,
        row.sourcePage,
        row.utmSource,
        row.utmMedium,
        row.utmCampaign,
        row.utmContent,
        row.utmTerm,
        row.referrer,
      ]
        .map(escape)
        .join(","),
    ),
  ];

  await audit({
    user,
    action: "update",
    entityType: "Enquiry",
    summary: `Exported ${rows.length} enquiries to CSV`,
  });

  return {
    filename: `dreamfly-enquiries-${new Date().toISOString().slice(0, 10)}.csv`,
    csv: `﻿${lines.join("\r\n")}`,
  };
}
