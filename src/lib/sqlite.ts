import { existsSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

/**
 * Puts the database into WAL mode.
 *
 * SQLite's default rollback journal takes an exclusive lock for every write, so
 * a single enquiry arriving, an admin saving a page, or an audit row being
 * written blocks every page render until it finishes. Under WAL, readers and
 * the writer no longer block each other, and an interrupted write recovers
 * cleanly instead of leaving a hot journal.
 *
 * The setting lives in the database file header, so this is a one-time change
 * that survives restarts; on every later boot the check below is a no-op.
 *
 * Never throws. A site that cannot switch journal mode should still serve
 * pages — it simply keeps the slower, safer default.
 */
export function enableWriteAheadLog(databaseUrl: string): void {
  if (!databaseUrl.startsWith("file:")) return; // PostgreSQL and friends
  const file = path.resolve(process.cwd(), databaseUrl.slice("file:".length));
  if (!existsSync(file)) return; // created by the first migration

  try {
    const db = new Database(file);
    try {
      if (db.pragma("journal_mode", { simple: true }) !== "wal") {
        db.pragma("journal_mode = WAL");
      }
    } finally {
      db.close();
    }
  } catch {
    // Read-only mount, a lock held elsewhere, a filesystem without shared
    // memory. None of these should stop the site from starting.
  }
}
