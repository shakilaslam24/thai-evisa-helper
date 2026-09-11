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
import { cp, link, mkdir, readdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { assertOurDatabase, databaseUrl } from "./db-connection";

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

/** Most recent snapshot directory, or null on the first run. */
async function newestSnapshot(outRoot: string): Promise<string | null> {
  try {
    const names = (await readdir(outRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const last = names.at(-1);
    return last ? path.join(outRoot, last) : null;
  } catch {
    return null; // no backups yet
  }
}

/**
 * Copies the uploads folder, hard-linking anything the previous snapshot
 * already holds.
 *
 * Uploaded files are written once under a random name and never rewritten, so a
 * file of the same name and size in the last snapshot is byte-for-byte the same
 * file. Copying it again would mean keeping fourteen identical copies of every
 * image the site has ever had — on a small VPS that is how the disk fills up a
 * few months in. A hard link costs an inode reference and nothing else, and
 * each snapshot still stands alone: deleting an old one leaves the rest intact.
 */
async function copyUploads(
  from: string,
  to: string,
  previous: string | null,
): Promise<{ total: number; hardLinked: number }> {
  let total = 0;
  let hardLinked = 0;

  async function walk(relative: string): Promise<void> {
    const entries = await readdir(path.join(from, relative), { withFileTypes: true });
    await mkdir(path.join(to, relative), { recursive: true });

    for (const entry of entries) {
      const rel = path.join(relative, entry.name);
      if (entry.isDirectory()) {
        await walk(rel);
        continue;
      }
      if (!entry.isFile()) continue;

      total += 1;
      const source = path.join(from, rel);
      const destination = path.join(to, rel);
      const candidate = previous ? path.join(previous, "uploads", rel) : null;

      if (candidate) {
        try {
          const [current, archived] = await Promise.all([stat(source), stat(candidate)]);
          if (current.size === archived.size) {
            await link(candidate, destination);
            hardLinked += 1;
            continue;
          }
        } catch {
          // Not in the previous snapshot, or a filesystem that will not link
          // across these paths. Fall through and copy.
        }
      }
      await cp(source, destination);
    }
  }

  try {
    await walk(".");
  } catch {
    console.warn("No uploads directory found — skipping media.");
  }
  return { total, hardLinked };
}

async function main() {
  // Backing up the wrong database is worse than not backing up: the archive
  // looks healthy and holds someone else's data.
  assertOurDatabase();
  const source = resolveDatabasePath(databaseUrl);
  await stat(source); // fail early with a clear error if it isn't there

  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./data/uploads");
  const outRoot = path.resolve(process.cwd(), arg("out") ?? "./backups");

  // The newest existing snapshot, to hard-link unchanged images against.
  const previous = await newestSnapshot(outRoot);

  // Second resolution keeps the folder name readable. Two runs inside the same
  // second — a cron firing while someone takes a manual backup — would then
  // collide, and VACUUM INTO refuses to overwrite: the second backup failed
  // with "output file already exists". Take the next free name instead.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  let target = path.join(outRoot, stamp);
  for (let suffix = 2; existsSync(target); suffix += 1) {
    target = path.join(outRoot, `${stamp}-${suffix}`);
  }
  await mkdir(target, { recursive: true });

  // Consistent snapshot, safe to run against a live database.
  const db = new Database(source, { readonly: true });
  try {
    db.exec(`VACUUM INTO '${path.join(target, "dreamfly-website.db").replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }

  const linked = await copyUploads(uploadDir, path.join(target, "uploads"), previous);

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
  if (linked.total > 0) {
    console.log(
      `Media: ${linked.total} file(s), ${linked.hardLinked} shared with the previous snapshot.`,
    );
  }
  console.log(`Keeping the ${Math.min(entries.length, RETAIN)} most recent snapshots.`);
  console.log("\nRestore: stop the app, delete the live database's -wal and -shm");
  console.log("files, copy dreamfly-website.db over it and uploads/ over");
  console.log("data/uploads, then start the app again.");
}

main().catch((error: unknown) => {
  console.error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
