'use strict';
/**
 * Health check:  npm run doctor
 *
 * Answers "is everything alright?" without needing to read logs — database
 * integrity, disk headroom, backup freshness, and whether stored documents and
 * their database rows still agree.
 */
const fs = require('fs');
const path = require('path');
const { db, DATA_DIR, UPLOAD_DIR } = require('./db');
const { listBackups, BACKUP_DIR } = require('./backup');

const results = [];
const ok = (label, detail) => results.push({ level: 'ok', label, detail });
const warn = (label, detail) => results.push({ level: 'warn', label, detail });
const fail = (label, detail) => results.push({ level: 'fail', label, detail });

const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
const gb = (bytes) => `${(bytes / 1073741824).toFixed(1)} GB`;

function dirSize(dir) {
  if (!fs.existsSync(dir)) return { bytes: 0, files: 0 };
  let bytes = 0;
  let files = 0;
  for (const name of fs.readdirSync(dir)) {
    const stat = fs.statSync(path.join(dir, name));
    if (stat.isFile()) { bytes += stat.size; files += 1; }
  }
  return { bytes, files };
}

function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major >= 18) ok('Node.js version', `v${process.versions.node}`);
  else fail('Node.js version', `v${process.versions.node} — this system needs v18 or newer`);
}

function checkDatabase() {
  try {
    const result = db.pragma('integrity_check', { simple: true });
    if (result === 'ok') ok('Database integrity', 'no corruption found');
    else fail('Database integrity', String(result));
  } catch (err) {
    fail('Database integrity', err.message);
  }

  const file = path.join(DATA_DIR, 'dreamfly.db');
  const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
  ok('Database size', mb(size));

  const counts = {};
  for (const table of ['users', 'leads', 'customers', 'case_files', 'partners',
    'invoices', 'payments', 'documents', 'followups', 'activities']) {
    counts[table] = db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n;
  }
  ok('Records', Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', '));

  const admins = db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'admin' AND active = 1").get().n;
  if (admins > 0) ok('Administrator accounts', `${admins} active`);
  else fail('Administrator accounts', "none active — run: npm run admin -- --email you@company.com --password '…'");
}

function checkDisk() {
  const uploads = dirSize(UPLOAD_DIR);
  ok('Uploaded documents', `${uploads.files} file(s), ${mb(uploads.bytes)}`);

  try {
    const stat = fs.statfsSync(DATA_DIR);
    const free = stat.bavail * stat.bsize;
    const total = stat.blocks * stat.bsize;
    const pctFree = (free / total) * 100;
    const detail = `${gb(free)} free of ${gb(total)} (${pctFree.toFixed(0)}%)`;
    // Uploads only ever grow, so a nearly full disk is a real outage in waiting.
    if (pctFree < 5) fail('Disk space', `${detail} — free space urgently, uploads will start failing`);
    else if (pctFree < 15) warn('Disk space', `${detail} — plan to free space or resize soon`);
    else ok('Disk space', detail);
  } catch {
    warn('Disk space', 'could not be measured on this system');
  }
}

/** Documents are two things — a database row and a file. Both must agree. */
function checkDocuments() {
  const rows = db.prepare('SELECT id, stored_name, original_name FROM documents').all();
  const missing = rows.filter((r) => !fs.existsSync(path.join(UPLOAD_DIR, r.stored_name)));
  if (!missing.length) ok('Document files', `all ${rows.length} recorded document(s) present on disk`);
  else {
    fail('Document files', `${missing.length} missing from disk — e.g. ${missing.slice(0, 3).map((m) => m.original_name).join(', ')}`);
  }

  const known = new Set(rows.map((r) => r.stored_name));
  const onDisk = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : [];
  const orphans = onDisk.filter((f) => !known.has(f));
  if (orphans.length) {
    warn('Orphaned files', `${orphans.length} file(s) on disk with no database record (harmless, they just use space)`);
  }
}

function checkBackups() {
  const all = listBackups();
  if (!all.length) {
    fail('Backups', `none found in ${BACKUP_DIR} — run: npm run backup`);
    return;
  }
  const newest = all[0];
  const ageHours = (Date.now() - newest.at.getTime()) / 3600000;
  const detail = `${all.length} kept, newest ${newest.at.toLocaleString()}`;
  if (ageHours > 72) fail('Backups', `${detail} — over 3 days old`);
  else if (ageHours > 30) warn('Backups', `${detail} — over a day old`);
  else ok('Backups', detail);
}

function checkSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  if (settings.company_name) ok('Company profile', settings.company_name);
  else warn('Company profile', 'company name not set — Settings → Company details');

  if (process.env.NODE_ENV === 'production') ok('Environment', 'production (secure cookies enabled)');
  else warn('Environment', 'NODE_ENV is not "production" — set it when serving over HTTPS');
}

function run() {
  checkNode();
  checkDatabase();
  checkDisk();
  checkDocuments();
  checkBackups();
  checkSettings();

  const icon = { ok: '  OK  ', warn: ' WARN ', fail: ' FAIL ' };
  console.log('\n══════════════ DreamFly CRM health check ══════════════\n');
  for (const r of results) {
    console.log(`[${icon[r.level]}] ${r.label.padEnd(24)} ${r.detail}`);
  }

  const failures = results.filter((r) => r.level === 'fail').length;
  const warnings = results.filter((r) => r.level === 'warn').length;
  console.log('\n───────────────────────────────────────────────────────');
  if (failures) {
    console.log(`${failures} problem(s) need attention${warnings ? `, plus ${warnings} warning(s)` : ''}.`);
    process.exitCode = 1;
  } else if (warnings) {
    console.log(`Everything essential is fine. ${warnings} thing(s) worth looking at.`);
  } else {
    console.log('Everything looks healthy.');
  }
  console.log('');
}

if (require.main === module) {
  run();
  db.close();
}

module.exports = { run };
