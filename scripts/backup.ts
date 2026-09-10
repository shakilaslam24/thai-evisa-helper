/**
 * Creates a consistent backup of the website's data.
 *
 * Two things must be backed up together:
 *   1. the SQLite database (content, settings, enquiries, audit log)
 *   2. the uploads directory (every image referenced by the database)
 *
 * The database is copied with SQLite's own VACUUM INTO, which produces a
 * consistent snapshot even while the site is serving traffic — a plain file
 * copy of a live database can capture a torn write.
 *
 * Usage:  npm run backup [-- --out ./backups]
 */
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";

function arg(flag: string): string | undefined {
  const index = process.argv.indexOf(`--${flag}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

/** Resolves the "file:" URL Prisma uses into a filesystem path. */
function resolveDatabasePath(url: string): string {
  if (!url.startsWith("file:")) {
    throw new Error(
      "This backup script handles SQLite only. For PostgreSQL use pg_dump — see docs/DEPLOYMENT.md.",
    );
  }
  // Prisma 7 resolves a relative SQLite URL against the working directory.
  return path.resolve(process.cwd(), url.slice("file:".length));
}

const RETAIN = 14;

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./data/dreamfly.db";
  const source = resolveDatabasePath(databaseUrl);
  await stat(source); // fail early with a clear error if it isn't there

  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./data/uploads");
  const outRoot = path.resolve(process.cwd(), arg("out") ?? "./backups");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const target = path.join(outRoot, stamp);
  await mkdir(target, { recursive: true });

  // Consistent snapshot, safe to run against a live database.
  const db = new Database(source, { readonly: true });
  try {
    db.exec(`VACUUM INTO '${path.join(target, "dreamfly.db").replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }

  try {
    await cp(uploadDir, path.join(target, "uploads"), { recursive: true });
  } catch {
    console.warn("No uploads directory found — skipping media.");
  }

  // Retention: keep the most recent N snapshots.
  const entries = (await readdir(outRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  for (const stale of entries.slice(RETAIN)) {
    await rm(path.join(outRoot, stale), { recursive: true, force: true });
  }

  console.log(`Backup written to ${target}`);
  console.log(`Keeping the ${Math.min(entries.length, RETAIN)} most recent snapshots.`);
  console.log("\nRestore: stop the app, copy dreamfly.db over the live database");
  console.log("and uploads/ over data/uploads, then start the app again.");
}

main().catch((error: unknown) => {
  console.error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
