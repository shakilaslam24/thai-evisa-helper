"use server";

import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { deleteStoredFile, storeUpload, UploadError } from "@/lib/media";
import { fail, ok, parseForm, revalidatePublic, type ActionState } from "@/lib/admin/actions";
import { mediaUpdateSchema } from "@/lib/validation/admin";
import { revalidatePath } from "next/cache";

export async function uploadMediaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) return fail("Choose at least one image to upload.");
  if (files.length > 20) return fail("Please upload at most 20 images at a time.");

  const altText = String(formData.get("altText") ?? "")
    .trim()
    .slice(0, 300);
  const stored: string[] = [];
  const failures: string[] = [];

  for (const file of files) {
    try {
      const result = await storeUpload(file);
      const media = await db.media.create({
        data: {
          filename: result.filename,
          originalName: result.originalName,
          url: result.url,
          mimeType: result.mimeType,
          sizeBytes: result.sizeBytes,
          width: result.width,
          height: result.height,
          altText,
          uploadedById: user.id,
        },
      });
      stored.push(media.id);
    } catch (error) {
      failures.push(
        error instanceof UploadError
          ? `${file.name}: ${error.message}`
          : `${file.name}: upload failed.`,
      );
    }
  }

  if (stored.length > 0) {
    await audit({
      user,
      action: "upload",
      entityType: "Media",
      summary: `Uploaded ${stored.length} image${stored.length === 1 ? "" : "s"}`,
      metadata: { ids: stored },
    });
    revalidatePath("/admin/media");
  }

  if (failures.length > 0 && stored.length === 0) return fail(failures.join(" "));
  if (failures.length > 0) {
    return fail(`Uploaded ${stored.length}, but some failed — ${failures.join(" ")}`);
  }
  return ok(`Uploaded ${stored.length} image${stored.length === 1 ? "" : "s"}.`);
}

export async function updateMediaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = parseForm(mediaUpdateSchema, formData);
  if (!parsed.success) return parsed.state;

  await db.media.update({
    where: { id: parsed.data.id },
    data: { altText: parsed.data.altText },
  });

  await audit({
    user,
    action: "update",
    entityType: "Media",
    entityId: parsed.data.id,
    summary: "Updated image alt text",
  });

  revalidatePath("/admin/media");
  revalidatePublic();
  return ok("Alt text saved.");
}

export async function deleteMediaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Nothing to delete.");

  const media = await db.media.findUnique({ where: { id } });
  if (!media) return fail("That image no longer exists.");

  // References use ON DELETE SET NULL, so a deleted image simply falls back to
  // the designed brand panel rather than breaking a page.
  await db.media.delete({ where: { id } });
  await deleteStoredFile(media.filename);

  await audit({
    user,
    action: "delete",
    entityType: "Media",
    entityId: id,
    summary: `Deleted image ${media.originalName}`,
  });

  revalidatePath("/admin/media");
  revalidatePublic();
  return ok("Image deleted.");
}
