import "server-only";
import { db } from "./db";
import { clientIp } from "./rate-limit";
import type { SessionUser } from "./auth/session";

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "archive"
  | "upload"
  | "settings_update"
  | "status_change";

/**
 * Records an important admin action. Never throws: an audit failure must not
 * take down the operation it is describing.
 */
export async function audit(input: {
  user?: SessionUser | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: input.user?.id ?? null,
        userEmail: input.user?.email ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary.slice(0, 500),
        metadata: input.metadata ? JSON.stringify(input.metadata).slice(0, 4000) : null,
        ip: await clientIp(),
      },
    });
  } catch (error) {
    console.error("[audit] failed to record action", input.action, error);
  }
}
