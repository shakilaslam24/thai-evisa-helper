"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { tourSchema } from "@/lib/validation/admin";
import { fail, ok, parseForm, revalidatePublic, type ActionState } from "@/lib/admin/actions";
import { itineraryRowSchema, parseLines, parseRows } from "@/lib/admin/rows";
import { slugify } from "@/lib/format";

function purge(slug?: string) {
  revalidatePath("/admin/tours");
  revalidatePublic("/tours", ...(slug ? [`/tours/${slug}`] : []));
}

export async function saveTourAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  const parsed = parseForm(tourSchema, formData);
  if (!parsed.success) return parsed.state;
  const input = parsed.data;

  const clash = await db.tourPackage.findFirst({
    where: { slug: input.slug, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (clash) {
    return fail("That URL slug is already used by another package.", {
      slug: "Choose a different slug.",
    });
  }

  const highlights = parseLines(formData.get("highlights"));
  const includes = parseLines(formData.get("includes"));
  const excludes = parseLines(formData.get("excludes"));
  const itinerary = parseRows(formData.get("itinerary"), itineraryRowSchema);

  const data = {
    name: input.name,
    slug: input.slug,
    destination: input.destination,
    country: input.country,
    shortDescription: input.shortDescription,
    duration: input.duration,
    travelDates: input.travelDates,
    packageType: input.packageType,
    startingPrice: input.startingPrice,
    currency: input.currency || "BDT",
    hotelDetails: input.hotelDetails,
    importantNotes: input.importantNotes,
    availability: input.availability,
    whatsappMessage: input.whatsappMessage,
    featured: input.featured,
    featuredOrder: input.featuredOrder,
    status: input.status,
    isPlaceholder: input.isPlaceholder,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    canonicalUrl: input.canonicalUrl,
    noindex: input.noindex,
    coverImageId: input.coverImageId,
    ogImageId: input.ogImageId,
  };

  const nested = {
    highlights: { create: highlights.map((label, index) => ({ label, sortOrder: index })) },
    itinerary: { create: itinerary.map((row, index) => ({ ...row, sortOrder: index })) },
    listItems: {
      create: [
        ...includes.map((label, index) => ({ kind: "include", label, sortOrder: index })),
        ...excludes.map((label, index) => ({ kind: "exclude", label, sortOrder: index })),
      ],
    },
  };

  if (id) {
    const previous = await db.tourPackage.findUnique({ where: { id }, select: { slug: true } });

    await db.$transaction([
      db.tourHighlight.deleteMany({ where: { packageId: id } }),
      db.tourItineraryDay.deleteMany({ where: { packageId: id } }),
      db.tourListItem.deleteMany({ where: { packageId: id } }),
      db.tourPackage.update({ where: { id }, data: { ...data, ...nested } }),
    ]);

    await audit({
      user,
      action: "update",
      entityType: "TourPackage",
      entityId: id,
      summary: `Updated ${input.name} (${input.status})`,
    });

    purge(input.slug);
    if (previous && previous.slug !== input.slug) revalidatePublic(`/tours/${previous.slug}`);
    return ok("Package saved.");
  }

  const created = await db.tourPackage.create({ data: { ...data, ...nested } });
  await audit({
    user,
    action: "create",
    entityType: "TourPackage",
    entityId: created.id,
    summary: `Created ${input.name}`,
  });

  purge(input.slug);
  redirect(`/admin/tours/${created.id}`);
}

export async function createTourAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim() || "New package";

  const base = slugify(name) || "package";
  let slug = base;
  for (let suffix = 2; await db.tourPackage.findUnique({ where: { slug } }); suffix += 1) {
    slug = `${base}-${suffix}`;
  }

  const created = await db.tourPackage.create({ data: { name, slug, status: "draft" } });
  await audit({
    user,
    action: "create",
    entityType: "TourPackage",
    entityId: created.id,
    summary: `Created ${name}`,
  });

  revalidatePath("/admin/tours");
  redirect(`/admin/tours/${created.id}`);
}

export async function setTourStatusAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["draft", "published", "archived"].includes(status)) return;

  const updated = await db.tourPackage.update({
    where: { id },
    data: { status },
    select: { slug: true, name: true },
  });

  await audit({
    user,
    action: status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish",
    entityType: "TourPackage",
    entityId: id,
    summary: `${updated.name} set to ${status}`,
  });

  purge(updated.slug);
}

export async function deleteTourAction(formData: FormData): Promise<void> {
  const user = await requireAdmin("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const removed = await db.tourPackage.delete({ where: { id }, select: { slug: true, name: true } });
  await audit({
    user,
    action: "delete",
    entityType: "TourPackage",
    entityId: id,
    summary: `Deleted ${removed.name}`,
  });

  purge(removed.slug);
  redirect("/admin/tours");
}
