import path from "node:path";
import { defineConfig, env } from "prisma/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { assertContainedDatabaseUrl } from "./src/lib/db-url";

// Prisma 7 no longer auto-loads .env. Node 22+ can do it natively.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // .env is optional when the variables are already exported (CI, containers).
}

const DEFAULT_URL = "file:./data/dreamfly.db";

/** The migration commands run through here, so the guard belongs here too. */
const databaseUrl = () => assertContainedDatabaseUrl(process.env.DATABASE_URL ?? DEFAULT_URL);

/**
 * Prisma 7 configuration.
 *
 * The connection URL lives here (and in .env) rather than in schema.prisma.
 * To move to PostgreSQL: change the datasource provider in schema.prisma,
 * swap this adapter for `@prisma/adapter-pg`, and run a fresh migration.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl(),
  },
  adapter: async () => new PrismaBetterSqlite3({ url: databaseUrl() }),
});
