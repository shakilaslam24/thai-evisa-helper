import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";
import { enableWriteAheadLog } from "./sqlite";

/**
 * A single Prisma client for the process. Next.js hot-reloads modules in
 * development, so the instance is cached on globalThis to avoid exhausting
 * connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  enableWriteAheadLog(env.databaseUrl);
  const adapter = new PrismaBetterSqlite3({ url: env.databaseUrl });
  const client = new PrismaClient({
    adapter,
    log: env.isProduction ? ["error"] : ["error", "warn"],
  });

  // Switching to WAL drops `synchronous` to NORMAL, where a power cut can lose
  // the last commits — an enquiry the customer was already told had been
  // received. This site writes a handful of rows a day, so syncing every commit
  // costs nothing worth having. Per-connection, hence here rather than in the
  // file header; better-sqlite3 holds one connection per client.
  void client.$executeRawUnsafe("PRAGMA synchronous = FULL").catch(() => {});
  return client;
}

export const db: PrismaClient = globalForPrisma.prisma ?? createClient();

if (!env.isProduction) globalForPrisma.prisma = db;
