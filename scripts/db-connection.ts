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
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { resolveDatabaseUrl } from "../src/lib/db-url";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // .env is optional when the variables are already exported (systemd, CI).
}

export const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL);

export function connect(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl }) });
}
