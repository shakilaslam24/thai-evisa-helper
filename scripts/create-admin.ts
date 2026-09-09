/**
 * Creates or updates an admin user.
 *
 * Usage:
 *   npm run admin:create -- --email you@example.com --name "Your Name" --role owner
 *
 * The password is read from the ADMIN_PASSWORD environment variable, or
 * prompted for interactively so it never appears in shell history.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, validatePasswordStrength } from "../src/lib/auth/password";

const url = process.env.DATABASE_URL ?? "file:./data/dreamfly.db";
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

function arg(flag: string): string | undefined {
  const index = process.argv.indexOf(`--${flag}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });

  const email = (arg("email") ?? (await rl.question("Email: "))).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email address.");

  const name = (arg("name") ?? (await rl.question("Name: "))).trim();
  if (name.length < 2) throw new Error("Name is required.");

  const role = (arg("role") ?? "owner").trim();
  if (!["owner", "admin", "editor"].includes(role)) {
    throw new Error("Role must be one of: owner, admin, editor.");
  }

  const password = process.env.ADMIN_PASSWORD ?? (await rl.question("Password: "));
  rl.close();

  const weakness = validatePasswordStrength(password);
  if (weakness) throw new Error(weakness);

  const passwordHash = await hashPassword(password);
  const user = await db.adminUser.upsert({
    where: { email },
    update: { name, role, passwordHash, isActive: true },
    create: { email, name, role, passwordHash },
  });

  // A password change invalidates every existing session for that user.
  await db.adminSession.deleteMany({ where: { userId: user.id } });

  console.log(`\nAdmin ready: ${user.email} (${user.role})`);
  console.log("Sign in at /admin/login");
}

main()
  .catch((error: unknown) => {
    console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
