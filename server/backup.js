'use strict';
/**
 * Safe backup and restore.
 *
 *   npm run backup                    take a backup now
 *   npm run backup -- --list          show the backups you have
 *   npm run restore -- --latest       roll back to the most recent backup
 *   npm run restore -- --file <name>  roll back to a specific one
 *
 * The database is copied through SQLite's own backup API rather than by copying
 * the file, because a plain copy taken while the server is running can produce
 * an unusable database. Uploaded documents are mirrored incrementally — they are
 * never modified once written, so only new files are copied each run.
 */
const fs = require('fs');
const path = require('path');
const { db, DATA_DIR, UPLOAD_DIR } = require('./db');

const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(DATA_DIR, '..', 'backups'));
const DB_DIR = path.join(BACKUP_DIR, 'db');
// Databases displaced by a restore live apart, so they can never be mistaken
// for a backup and restored on top of good data.
const REPLACED_DIR = path.join(BACKUP_DIR, 'replaced');
const FILES_DIR = path.join(BACKUP_DIR, 'uploads');
const KEEP = Number(process.env.BACKUP_KEEP) || 14;

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}

function listBackups() {
  if (!fs.existsSync(DB_DIR)) return [];
  return fs.readdirSync(DB_DIR)
    .filter((f) => f.startsWith('dreamfly-') && f.endsWith('.db'))
    .map((name) => {
      const stat = fs.statSync(path.join(DB_DIR, name));
      return { name, size: stat.size, at: stat.mtime };
    })
    .sort((a, b) => b.at - a.at);
}

/** Copies any uploaded document not already mirrored. Deletes nothing. */
function mirrorUploads() {
  fs.mkdirSync(FILES_DIR, { recursive: true });
  let copied = 0;
  let bytes = 0;
  for (const name of fs.readdirSync(UPLOAD_DIR)) {
    const from = path.join(UPLOAD_DIR, name);
    const to = path.join(FILES_DIR, name);
    if (!fs.statSync(from).isFile()) continue;
    if (fs.existsSync(to)) continue;
    fs.copyFileSync(from, to);
    copied += 1;
    bytes += fs.statSync(to).size;
  }
  return { copied, bytes };
}

function pruneOldBackups() {
  const all = listBackups();
  const stale = all.slice(KEEP);
  for (const b of stale) fs.rmSync(path.join(DB_DIR, b.name), { force: true });

  // Parked copies are a safety net for a recent mistake, not an archive.
  if (fs.existsSync(REPLACED_DIR)) {
    const parked = fs.readdirSync(REPLACED_DIR)
      .filter((f) => f.endsWith('.db'))
      .map((name) => ({ name, at: fs.statSync(path.join(REPLACED_DIR, name)).mtime }))
      .sort((a, b) => b.at - a.at)
      .slice(5);
    for (const p of parked) fs.rmSync(path.join(REPLACED_DIR, p.name), { force: true });
  }
  return stale.length;
}

async function runBackup() {
  fs.mkdirSync(DB_DIR, { recursive: true });
  const name = `dreamfly-${stamp()}.db`;
  const target = path.join(DB_DIR, name);

  await db.backup(target);
  const size = fs.statSync(target).size;
  const uploads = mirrorUploads();
  const pruned = pruneOldBackups();

  console.log('\n──────────────────────────────────────────────');
  console.log(' Backup complete');
  console.log(`   Database:  ${name}  (${mb(size)})`);
  console.log(`   Documents: ${uploads.copied} new file(s) copied (${mb(uploads.bytes)})`);
  console.log(`   Stored in: ${BACKUP_DIR}`);
  if (pruned) console.log(`   Removed ${pruned} backup(s) older than the last ${KEEP}`);
  console.log('──────────────────────────────────────────────\n');
  console.log('Keep a copy OFF this server too — a backup on the same disk');
  console.log('does not survive losing the server.\n');
}

function showList() {
  const all = listBackups();
  if (!all.length) {
    console.log('\nNo backups yet. Take one with:  npm run backup\n');
    return;
  }
  console.log(`\nBackups in ${DB_DIR}:\n`);
  for (const b of all) {
    console.log(`  ${b.name}   ${mb(b.size).padStart(10)}   ${b.at.toLocaleString()}`);
  }
  console.log(`\nRestore the newest with:  npm run restore -- --latest\n`);
}

function runRestore(args) {
  const all = listBackups();
  if (!all.length) {
    console.error('\nThere are no backups to restore from.\n');
    process.exitCode = 1;
    return;
  }
  const chosen = args.latest === true
    ? all[0]
    : all.find((b) => b.name === args.file);

  if (!chosen) {
    console.error(`\nNo backup named "${args.file}".`);
    console.error('Run  npm run backup -- --list  to see what you have.\n');
    process.exitCode = 1;
    return;
  }
  if (!args.yes) {
    console.log('\n──────────────────────────────────────────────');
    console.log(' This REPLACES your current database with:');
    console.log(`   ${chosen.name}  (${chosen.at.toLocaleString()})`);
    console.log('\n Everything entered since then will be lost.');
    console.log(' The current database is saved first, so this is undoable.');
    console.log('\n Stop the server, then run again with --yes:');
    console.log(`   npm run restore -- --file ${chosen.name} --yes`);
    console.log('──────────────────────────────────────────────\n');
    return;
  }

  const live = path.join(DATA_DIR, 'dreamfly.db');
  // Park the current database rather than deleting it, so a restore chosen by
  // mistake can itself be undone.
  if (fs.existsSync(live)) {
    fs.mkdirSync(REPLACED_DIR, { recursive: true });
    const parked = path.join(REPLACED_DIR, `replaced-${stamp()}.db`);
    fs.copyFileSync(live, parked);
    console.log(`\nCurrent database saved as replaced/${path.basename(parked)}`);
  }
  // WAL side-files belong to the old database and must not outlive it.
  for (const suffix of ['-wal', '-shm']) fs.rmSync(live + suffix, { force: true });
  fs.copyFileSync(path.join(DB_DIR, chosen.name), live);

  console.log(`Restored ${chosen.name}`);
  console.log('\nStart the system again:  npm start\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.list) return showList();
  if (args.restore) return runRestore(args);
  return runBackup();
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('\nBackup failed:', err.message, '\n');
      process.exitCode = 1;
    })
    .finally(() => db.close());
}

module.exports = { runBackup, listBackups, BACKUP_DIR };
