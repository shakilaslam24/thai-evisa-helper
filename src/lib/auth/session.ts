import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Cookie name.
 *
 * Deliberately namespaced to the WEBSITE. DreamFly runs a separate CRM, and if
 * that system ever sets a cookie scoped to `.dreamfly.bd`, it would
 * also be sent to this host. A distinct name means the two can never be
 * confused for one another.
 *
 * The cookie is written WITHOUT a `domain` attribute, which makes it host-only:
 * a cookie set by the website is never sent to the CRM's subdomain, and the
 * two systems cannot share or hijack each other's sessions.
 */
export const SESSION_COOKIE = "dreamfly_web_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours
const RENEW_WITHIN_MS = 1000 * 60 * 60; // slide the expiry when < 1h remains

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

/** The cookie carries a random token; only its SHA-256 digest is stored. */
function digest(token: string): string {
  return createHash("sha256").update(`${token}${env.sessionSecret}`).digest("hex");
}

export async function createSession(
  userId: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.adminSession.create({
    data: {
      tokenHash: digest(token),
      userId,
      expiresAt,
      ip: meta.ip?.slice(0, 64) ?? null,
      userAgent: meta.userAgent?.slice(0, 256) ?? null,
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    // No `domain`: host-only, so this session never reaches another subdomain.
    expires: expiresAt,
  });
}

/**
 * Resolve the current admin, or null. Memoised per request so a page and its
 * layout share one query.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.adminSession.findUnique({
    where: { tokenHash: digest(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt.getTime() < Date.now() || !session.user.isActive) {
    return null;
  }

  // Sliding expiry, written only when it is close to lapsing.
  if (session.expiresAt.getTime() - Date.now() < RENEW_WITHIN_MS) {
    await db.adminSession.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
});

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.adminSession.deleteMany({ where: { tokenHash: digest(token) } });
  }
  store.delete(SESSION_COOKIE);
}

/** Housekeeping: drop rows for sessions that have already lapsed. */
export async function purgeExpiredSessions(): Promise<void> {
  await db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

/**
 * Same-origin check for state-changing admin requests. Next.js Server Actions
 * carry their own origin protection; this covers our route handlers too.
 */
export async function assertSameOrigin(): Promise<void> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return; // same-origin form posts may omit Origin
  const host = h.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error("Invalid request origin.");
  }
  if (host && originHost !== host) {
    throw new Error("Cross-origin request rejected.");
  }
}
