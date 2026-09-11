/**
 * The one place the command-line scripts decide which database they open.
 *
 * `tsx` does not load .env, and none of these scripts loaded it themselves, so
 * every one of them fell back to the default path — while `prisma migrate
 * deploy`, which does load .env through prisma.config.ts, used the configured
 * one. Two commands, two different databases, and no error to show for it:
 * `admin:create` would write an account into a file the site never opens, and
 * `backup` would faithfully archive the wrong database.
 */
import path from "node:path";
import { existsSync } from "node:fs";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { resolveDatabaseUrl } from "../src/lib/db-url";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // .env is optional when the variables are already exported (systemd, CI).
}

export const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL);

/**
 * Refuses a SQLite file that belongs to something else.
 *
 * DreamFly's CRM keeps its database in a `data/` folder too, and until this
 * site's file was renamed both were called `dreamfly.db`. Running the CRM once
 * from inside this project's folder was enough to leave its database sitting
 * exactly where this site expected to find its own — 18 tables of customers,
 * leads and partners. `prisma migrate deploy` stops at P3005 there, but
 * `db:seed`, `admin:create` and `backup` would each have gone ahead.
 *
 * A file with no tables is fine: that is a database waiting for its first
 * migration.
 */
export function assertOurDatabase(): void {
  if (!databaseUrl.startsWith("file:")) return;
  const file = path.resolve(process.cwd(), databaseUrl.slice("file:".length));
  if (!existsSync(file)) return;

  const raw = new Database(file, { readonly: true });
  let names: string[];
  try {
    names = (
      raw.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    ).map((t) => t.name);
  } finally {
    raw.close();
  }

  const empty = names.filter((n) => n !== "sqlite_sequence").length === 0;
  if (empty || names.includes("AdminUser") || names.includes("_prisma_migrations")) return;

  throw new Error(
    `${file}\n\nThis database belongs to another application — it holds ` +
      `${names.length} tables (${names.slice(0, 6).join(", ")}...) and none of ` +
      `this site's.\n\nThe website must not write to it. Point DATABASE_URL at ` +
      `its own file, and leave this one alone until you know what it is:\n` +
      `  sqlite3 ${file} ".tables"`,
  );
}

export function connect(): PrismaClient {
  assertOurDatabase();
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl }) });
}
