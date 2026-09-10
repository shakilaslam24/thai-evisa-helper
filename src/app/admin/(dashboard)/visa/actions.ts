"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { visaSchema } from "@/lib/validation/admin";
import {
  fail,
  formValues,
  ok,
  parseForm,
  revalidatePublic,
  type ActionState,
} from "@/lib/admin/actions";
import { documentRowSchema, faqRowSchema, parseRows } from "@/lib/admin/rows";
import { serialiseList } from "@/lib/list";
import { slugify } from "@/lib/format";

function purge(slug?: string) {
  revalidatePath("/admin/visa");
  revalidatePublic("/visa", ...(slug ? [`/visa/${slug}`] : []));
}

export async function saveVisaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();

  const parsed = parseForm(visaSchema, formData);
  if (!parsed.success) return parsed.state;
  const input = parsed.data;

  // A slug collision must be reported, not thrown as a database error.
  const clash = await db.visaDestination.findFirst({
    where: { slug: input.slug, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (clash) {
    return fail(
      "That URL slug is already used by another destination.",
      {
        slug: "Choose a different slug.",
      },
      formValues(formData),
    );
  }

  const documents = parseRows(formData.get("documents"), documentRowSchema);
  const faqs = parseRows(formData.get("faqs"), faqRowSchema);

  const data = {
    countryName: input.countryName,
    slug: input.slug,
    countryCode: input.countryCode,
    intro: input.intro,
    categories: serialiseList(input.categories),
    visaFormats: serialiseList(input.visaFormats),
    entryTypes: serialiseList(input.entryTypes),
    processingTime: input.processingTime,
    serviceCharge: input.serviceCharge,
    embassyFee: input.embassyFee,
    otherCharges: input.otherCharges,
    feeNote: input.feeNote,
    eligibility: input.eligibility,
    applicationProcess: input.applicationProcess,
    importantNotes: input.importantNotes,
    whatsappMessage: input.whatsappMessage,
    featured: input.featured,
    featuredOrder: input.featuredOrder,
    status: input.status,
    isPlaceholder: input.isPlaceholder,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    ogTitle: input.ogTitle,
    ogDescription: input.ogDescription,
    canonicalUrl: input.canonicalUrl,
    noindex: input.noindex,
    coverImageId: input.coverImageId,
    flagImageId: input.flagImageId,
    ogImageId: input.ogImageId,
  };

  const nested = {
    documents: { create: documents.map((row, index) => ({ ...row, sortOrder: index })) },
    faqs: { create: faqs.map((row, index) => ({ ...row, sortOrder: index })) },
  };

  if (id) {
    const previous = await db.visaDestination.findUnique({ where: { id }, select: { slug: true } });

    // Child rows are ordered lists with no stable identity of their own, so the
    // simplest correct update is replace-in-place inside one transaction.
    await db.$transaction([
      db.visaDocument.deleteMany({ where: { destinationId: id } }),
      db.visaFaq.deleteMany({ where: { destinationId: id } }),
      db.visaDestination.update({ where: { id }, data: { ...data, ...nested } }),
    ]);

    await audit({
      user,
      action: "update",
      entityType: "VisaDestination",
      entityId: id,
      summary: `Updated ${input.countryName} (${input.status})`,
    });

    // A renamed page keeps its old address working: every link already in the
    // wild — a search result, a WhatsApp message — still lands correctly.
    if (previous && previous.slug !== input.slug) {
      await db.$transaction([
        // Anything that used to point at the NEW slug is now stale.
        db.slugRedirect.deleteMany({ where: { kind: "visa", oldSlug: input.slug } }),
        // Follow an existing chain forward rather than leaving a hop.
        db.slugRedirect.updateMany({
          where: { kind: "visa", newSlug: previous.slug },
          data: { newSlug: input.slug },
        }),
        db.slugRedirect.upsert({
          where: { kind_oldSlug: { kind: "visa", oldSlug: previous.slug } },
          update: { newSlug: input.slug },
          create: { kind: "visa", oldSlug: previous.slug, newSlug: input.slug },
        }),
      ]);
      revalidatePublic(`/visa/${previous.slug}`);
    }

    purge(input.slug);
    return ok("Destination saved.");
  }

  const created = await db.visaDestination.create({ data: { ...data, ...nested } });
  await audit({
    user,
    action: "create",
    entityType: "VisaDestination",
    entityId: created.id,
    summary: `Created ${input.countryName}`,
  });

  purge(input.slug);
  redirect(`/admin/visa/${created.id}?created=1`);
}

export async function createVisaAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const name = String(formData.get("countryName") ?? "").trim() || "New destination";

  // Ensure the generated slug is unique without asking the editor to think
  // about it at creation time.
  const base = slugify(name) || "destination";
  let slug = base;
  for (let suffix = 2; await db.visaDestination.findUnique({ where: { slug } }); suffix += 1) {
    slug = `${base}-${suffix}`;
  }
  // If the address had to be adjusted, say so on the next screen rather than
  // leaving the editor to discover a mysterious "-2" later.
  const slugWasAdjusted = slug !== base;

  const created = await db.visaDestination.create({
    data: { countryName: name, slug, status: "draft" },
  });

  await audit({
    user,
    action: "create",
    entityType: "VisaDestination",
    entityId: created.id,
    summary: `Created ${name}`,
  });

  revalidatePath("/admin/visa");
  redirect(`/admin/visa/${created.id}${slugWasAdjusted ? "?slug=adjusted" : ""}`);
}

export async function setVisaStatusAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["draft", "published", "archived"].includes(status)) return;

  const updated = await db.visaDestination.update({
    where: { id },
    data: { status },
    select: { slug: true, countryName: true },
  });

  await audit({
    user,
    action: status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish",
    entityType: "VisaDestination",
    entityId: id,
    summary: `${updated.countryName} set to ${status}`,
  });

  purge(updated.slug);
}

export async function deleteVisaAction(formData: FormData): Promise<void> {
  const user = await requireAdmin("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const removed = await db.visaDestination.delete({
    where: { id },
    select: { slug: true, countryName: true },
  });

  await audit({
    user,
    action: "delete",
    entityType: "VisaDestination",
    entityId: id,
    summary: `Deleted ${removed.countryName}`,
  });

  purge(removed.slug);
  redirect("/admin/visa");
}
