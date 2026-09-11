"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import {
  heroSchema,
  homeSectionSchema,
  homeServiceSchema,
  homeWhySchema,
} from "@/lib/validation/admin";
import { ok, parseForm, revalidatePublic, type ActionState } from "@/lib/admin/actions";

function purge() {
  revalidatePath("/admin/home");
  revalidatePublic();
}

export async function saveHeroAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = parseForm(heroSchema, formData);
  if (!parsed.success) return parsed.state;

  await db.homeHero.upsert({
    where: { id: "hero" },
    update: parsed.data,
    create: { id: "hero", ...parsed.data },
  });

  await audit({
    user,
    action: "update",
    entityType: "HomeHero",
    entityId: "hero",
    summary: "Updated the homepage hero",
  });
  purge();
  return ok("Hero saved.");
}

/**
 * Saves the whole section list in one submit: each section's enabled flag,
 * order and copy. The set of section types is fixed by the design system —
 * an editor changes content and arrangement, never structure (brief §16).
 */
export async function saveSectionsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const keys = formData.getAll("sectionKey").map(String);

  for (const [index, key] of keys.entries()) {
    const parsed = homeSectionSchema.safeParse({
      key,
      enabled: formData.get(`enabled:${key}`) ?? "",
      sortOrder: formData.get(`sortOrder:${key}`) ?? index,
      heading: formData.get(`heading:${key}`) ?? "",
      subheading: formData.get(`subheading:${key}`) ?? "",
      ctaLabel: formData.get(`ctaLabel:${key}`) ?? "",
      ctaHref: formData.get(`ctaHref:${key}`) ?? "",
    });
    if (!parsed.success) continue;

    const { key: sectionKey, ...data } = parsed.data;
    await db.homeSection.update({ where: { key: sectionKey }, data });
  }

  await audit({
    user,
    action: "update",
    entityType: "HomeSection",
    summary: "Updated homepage sections",
  });
  purge();
  return ok("Homepage sections saved.");
}

export async function saveServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = parseForm(homeServiceSchema, formData);
  if (!parsed.success) return parsed.state;

  const { id, ...data } = parsed.data;
  const saved = id
    ? await db.homeService.update({ where: { id }, data })
    : await db.homeService.create({ data });

  await audit({
    user,
    action: id ? "update" : "create",
    entityType: "HomeService",
    entityId: saved.id,
    summary: `${id ? "Updated" : "Added"} service card ${data.title}`,
  });
  purge();
  return ok("Service saved.");
}

export async function deleteServiceAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const removed = await db.homeService.delete({ where: { id }, select: { title: true } });
  await audit({
    user,
    action: "delete",
    entityType: "HomeService",
    entityId: id,
    summary: `Deleted service card ${removed.title}`,
  });
  purge();
}

export async function saveWhyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = parseForm(homeWhySchema, formData);
  if (!parsed.success) return parsed.state;

  const { id, ...data } = parsed.data;
  const saved = id
    ? await db.homeWhyItem.update({ where: { id }, data })
    : await db.homeWhyItem.create({ data });

  await audit({
    user,
    action: id ? "update" : "create",
    entityType: "HomeWhyItem",
    entityId: saved.id,
    summary: `${id ? "Updated" : "Added"} reason ${data.title}`,
  });
  purge();
  return ok("Saved.");
}

export async function deleteWhyAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const removed = await db.homeWhyItem.delete({ where: { id }, select: { title: true } });
  await audit({
    user,
    action: "delete",
    entityType: "HomeWhyItem",
    entityId: id,
    summary: `Deleted reason ${removed.title}`,
  });
  purge();
}
