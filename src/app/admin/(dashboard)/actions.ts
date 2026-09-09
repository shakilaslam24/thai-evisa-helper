"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { destroySession, getSessionUser } from "@/lib/auth/session";

export async function signOutAction(): Promise<void> {
  const user = await getSessionUser();
  if (user) {
    await audit({
      user,
      action: "logout",
      entityType: "AdminUser",
      entityId: user.id,
      summary: `${user.email} signed out`,
    });
  }
  await destroySession();
  redirect("/admin/login");
}
