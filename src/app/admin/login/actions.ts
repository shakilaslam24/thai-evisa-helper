"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, purgeExpiredSessions } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fail, type ActionState } from "@/lib/admin/actions";

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

/** Deliberately vague: never reveal whether an email exists. */
const GENERIC_ERROR = "Those details don't match an active account.";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await clientIp();

  // Two windows: a burst limit per IP, and a slower per-account limit so one
  // account cannot be ground down from many addresses.
  const ipLimit = rateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000);
  if (!ipLimit.ok) {
    return fail(
      `Too many attempts. Try again in ${Math.ceil(ipLimit.retryAfterSeconds / 60)} minutes.`,
    );
  }

  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { email, password } = parsed.data;

  const accountLimit = rateLimit(`login:account:${email}`, 8, 15 * 60 * 1000);
  if (!accountLimit.ok) {
    return fail(
      `Too many attempts for this account. Try again in ${Math.ceil(accountLimit.retryAfterSeconds / 60)} minutes.`,
    );
  }

  const user = await db.adminUser.findUnique({ where: { email } });

  // Always run a verification so the response time doesn't reveal whether the
  // account exists.
  const storedHash = user?.passwordHash ?? "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAA";
  const valid = await verifyPassword(password, storedHash);

  if (!user || !user.isActive || !valid) {
    await audit({
      action: "login_failed",
      entityType: "AdminUser",
      entityId: user?.id ?? null,
      summary: `Failed sign-in for ${email}`,
    });
    return fail(GENERIC_ERROR);
  }

  const requestHeaders = await headers();
  await createSession(user.id, {
    ip,
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  });
  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await purgeExpiredSessions();

  await audit({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    action: "login",
    entityType: "AdminUser",
    entityId: user.id,
    summary: `${user.email} signed in`,
  });

  redirect("/admin");
}
