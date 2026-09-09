"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { pageSeoSchema } from "@/lib/validation/admin";
import { ok, parseForm, revalidatePublic, type ActionState } from "@/lib/admin/actions";

const PATH_FOR: Record<string, string> = {
  home: "/",
  visa: "/visa",
  tours: "/tours",
  "air-ticket-hotel": "/air-ticket-hotel",
  b2b: "/b2b",
  about: "/about",
  contact: "/contact",
};

export async function savePageSeoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = parseForm(pageSeoSchema, formData);
  if (!parsed.success) return parsed.state;

  const { pageKey, ...data } = parsed.data;
  await db.pageSeo.upsert({
    where: { pageKey },
    update: data,
    create: { pageKey, ...data },
  });

  await audit({
    user,
    action: "update",
    entityType: "PageSeo",
    entityId: pageKey,
    summary: `Updated SEO for ${pageKey}`,
  });

  revalidatePath("/admin/seo");
  const path = PATH_FOR[pageKey];
  revalidatePublic(...(path ? [path] : []));
  return ok("SEO saved.");
}
