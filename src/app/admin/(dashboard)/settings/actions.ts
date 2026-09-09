"use server";

import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { globalSettingsSchema } from "@/lib/validation/admin";
import { ok, parseForm, revalidatePublic, type ActionState } from "@/lib/admin/actions";

/**
 * Global Settings is the single source of business information for the whole
 * site, so a save purges every cached public route.
 */
export async function saveSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin("admin");
  const parsed = parseForm(globalSettingsSchema, formData);
  if (!parsed.success) return parsed.state;

  await db.globalSettings.upsert({
    where: { id: "global" },
    update: parsed.data,
    create: { id: "global", ...parsed.data },
  });

  await audit({
    user,
    action: "settings_update",
    entityType: "GlobalSettings",
    entityId: "global",
    summary: "Updated global settings",
  });

  revalidatePublic(
    "/visa",
    "/tours",
    "/air-ticket-hotel",
    "/b2b",
    "/about",
    "/contact",
    "/robots.txt",
    "/manifest.webmanifest",
  );

  return ok("Settings saved. The website has been updated.");
}
