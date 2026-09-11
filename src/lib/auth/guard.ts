import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";

/** Roles ordered from most to least privileged. */
export const ROLES = ["owner", "admin", "editor"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<string, number> = { owner: 3, admin: 2, editor: 1 };

export function hasRole(user: SessionUser, minimum: Role): boolean {
  return (RANK[user.role] ?? 0) >= (RANK[minimum] ?? 0);
}

/** Redirects to the login screen when signed out. Use in admin pages/actions. */
export async function requireAdmin(minimum: Role = "editor"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!hasRole(user, minimum)) redirect("/admin?denied=1");
  return user;
}
