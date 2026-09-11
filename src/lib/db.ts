import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

/**
 * A single Prisma client for the process. Next.js hot-reloads modules in
 * development, so the instance is cached on globalThis to avoid exhausting
 * connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: env.databaseUrl });
  return new PrismaClient({
    adapter,
    log: env.isProduction ? ["error"] : ["error", "warn"],
  });
}

export const db: PrismaClient = globalForPrisma.prisma ?? createClient();

if (!env.isProduction) globalForPrisma.prisma = db;
