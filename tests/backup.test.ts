/**
 * Backup and restore, exercised end to end.
 *
 * A backup nobody has ever restored is not a backup. This runs the real
 * script against a throwaway database and uploads folder, destroys the
 * original, puts the snapshot back and checks the rows returned — the actual
 * sequence from docs/DEPLOYMENT.md, not a description of it.
 *
 * Nothing here touches the project's own database.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import Database from "better-sqlite3";

const ROOT = path.resolve(import.meta.dirname, "..");

let work: string;
let dbPath: string;
let uploadDir: string;
let outRoot: string;

const rows = () => {
  const db = new Database(dbPath, { readonly: true });
  try {
    return (db.prepare("SELECT name FROM enquiry ORDER BY name").all() as { name: string }[]).map(
      (r) => r.name,
    );
  } finally {
    db.close();
  }
};

function runBackup() {
  execFileSync("npx", ["tsx", "scripts/backup.ts", "--out", outRoot], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: `file:${dbPath}`, UPLOAD_DIR: uploadDir },
    stdio: "pipe",
  });
}

const snapshots = () =>
  readdirSync(outRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

describe("backup and restore", () => {
  before(() => {
    work = mkdtempSync(path.join(tmpdir(), "dreamfly-backup-"));
    dbPath = path.join(work, "dreamfly.db");
    uploadDir = path.join(work, "uploads");
    outRoot = path.join(work, "backups");

    const db = new Database(dbPath);
    db.exec("CREATE TABLE enquiry (name TEXT)");
    db.prepare("INSERT INTO enquiry (name) VALUES (?), (?), (?)").run("Karim", "Rahim", "Sultana");
    db.close();

    mkdirSync(uploadDir, { recursive: true });
    writeFileSync(path.join(uploadDir, "logo.webp"), "not really an image");
  });

  after(() => rmSync(work, { recursive: true, force: true }));

  it("writes a snapshot of the database and the uploads together", () => {
    runBackup();
    const [stamp] = snapshots();
    assert.ok(stamp, "no snapshot directory was created");
    assert.ok(existsSync(path.join(outRoot, stamp, "dreamfly.db")), "database missing from snapshot");
    assert.ok(
      existsSync(path.join(outRoot, stamp, "uploads", "logo.webp")),
      "uploads missing from snapshot — images would come back broken",
    );
  });

  it("restores every row after the live database is destroyed", () => {
    assert.deepEqual(rows(), ["Karim", "Rahim", "Sultana"]);
    const [stamp] = snapshots();

    // Lose the data the way a bad migration or a disk fault would.
    const live = new Database(dbPath);
    live.exec("DELETE FROM enquiry");
    live.close();
    assert.deepEqual(rows(), [], "the database was not actually emptied");

    // The documented restore: copy the snapshot over the live files.
    cpSync(path.join(outRoot, stamp!, "dreamfly.db"), dbPath);
    cpSync(path.join(outRoot, stamp!, "uploads"), uploadDir, { recursive: true });

    assert.deepEqual(rows(), ["Karim", "Rahim", "Sultana"], "restore did not bring the rows back");
  });

  it("keeps the 14 most recent snapshots and no more", () => {
    // Stand-ins for older runs; the script sorts by name, which is the stamp.
    for (let day = 1; day <= 20; day += 1) {
      mkdirSync(path.join(outRoot, `2026-01-${String(day).padStart(2, "0")}T00-00-00`), {
        recursive: true,
      });
    }
    runBackup();
    assert.equal(snapshots().length, 14, `kept ${snapshots().length} snapshots`);
  });
});
