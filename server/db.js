'use strict';
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'dreamfly.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','manager','staff','accounts','partner')),
  partner_id    INTEGER REFERENCES partners(id) ON DELETE SET NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Sessions keep UTC: expires_at is written as a UTC ISO string from JavaScript
-- and compared against datetime('now'), so both sides must stay on that clock.
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Configurable dropdown lists: country, service, lead_source, document_category
CREATE TABLE IF NOT EXISTS lookups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL,
  value      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  UNIQUE (type, value)
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS partners (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_name     TEXT NOT NULL,
  company_name     TEXT,
  company_address  TEXT,
  personal_address TEXT,
  personal_phone   TEXT,
  company_phone    TEXT,
  whatsapp         TEXT,
  email            TEXT,
  trade_license    TEXT,
  nid_passport     TEXT,
  commission_note  TEXT,
  agreement_note   TEXT,
  status           TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Suspended')),
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_partners_name ON partners(partner_name);

CREATE TABLE IF NOT EXISTS leads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  whatsapp        TEXT,
  email           TEXT,
  address         TEXT,
  source          TEXT,
  service_type    TEXT,
  country         TEXT,
  priority        TEXT NOT NULL DEFAULT 'Warm' CHECK (priority IN ('Hot','Warm','Cold')),
  assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'New Lead',
  next_followup_at TEXT,
  initial_note    TEXT,
  customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  converted_at    TEXT,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_followup ON leads(next_followup_at);

CREATE TABLE IF NOT EXISTS customers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  given_name   TEXT NOT NULL,
  surname      TEXT,
  dob          TEXT,
  passport_no  TEXT,
  phone        TEXT,
  whatsapp     TEXT,
  email        TEXT,
  address      TEXT,
  photo_path   TEXT,
  nid          TEXT,
  gender       TEXT,
  nationality  TEXT,
  service_type TEXT,
  country      TEXT,
  notes        TEXT,
  partner_id   INTEGER REFERENCES partners(id) ON DELETE SET NULL,
  assigned_to  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_customers_passport ON customers(passport_no);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(given_name, surname);

CREATE TABLE IF NOT EXISTS case_files (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_no    TEXT UNIQUE,
  customer_id     INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  partner_id      INTEGER REFERENCES partners(id) ON DELETE SET NULL,
  country         TEXT,
  service_type    TEXT,
  file_type       TEXT,
  application_type TEXT,
  submission_date TEXT,
  stage           TEXT,
  status          TEXT NOT NULL DEFAULT 'Draft',
  assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  interview_date  TEXT,
  embassy_date    TEXT,
  completion_date TEXT,
  payment_status  TEXT NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid','Partial Paid','Paid')),
  remarks         TEXT,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_files_status ON case_files(status);
CREATE INDEX IF NOT EXISTS idx_files_partner ON case_files(partner_id);
CREATE INDEX IF NOT EXISTS idx_files_customer ON case_files(customer_id);

CREATE TABLE IF NOT EXISTS followups (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead','customer','case_file','partner')),
  entity_id   INTEGER NOT NULL,
  due_at      TEXT NOT NULL,
  note        TEXT,
  outcome     TEXT,
  status      TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Done','Cancelled')),
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  completed_at TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_followups_due ON followups(due_at, status);
CREATE INDEX IF NOT EXISTS idx_followups_entity ON followups(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS meetings (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT NOT NULL,
  entity_type    TEXT CHECK (entity_type IN ('lead','customer','partner')),
  entity_id      INTEGER,
  meeting_at     TEXT NOT NULL,
  meeting_type   TEXT NOT NULL DEFAULT 'Office Visit',
  assigned_to    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes          TEXT,
  remind_before_min INTEGER NOT NULL DEFAULT 30,
  status         TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled','Completed','Rescheduled','Cancelled')),
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_meetings_at ON meetings(meeting_at, status);

CREATE TABLE IF NOT EXISTS documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('customer','case_file','partner','lead')),
  entity_id     INTEGER NOT NULL,
  category      TEXT NOT NULL DEFAULT 'Other',
  original_name TEXT NOT NULL,
  stored_name   TEXT NOT NULL,
  mime_type     TEXT,
  size_bytes    INTEGER,
  uploaded_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);

-- "Mark missing documents": a per-file checklist independent of uploads.
CREATE TABLE IF NOT EXISTS document_checklist (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  case_file_id INTEGER NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'Missing' CHECK (status IN ('Missing','Received','Not Required')),
  note         TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_checklist_file ON document_checklist(case_file_id);

CREATE TABLE IF NOT EXISTS invoices (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no   TEXT NOT NULL UNIQUE,
  customer_id  INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  partner_id   INTEGER REFERENCES partners(id) ON DELETE SET NULL,
  case_file_id INTEGER REFERENCES case_files(id) ON DELETE SET NULL,
  issue_date   TEXT NOT NULL,
  due_date     TEXT,
  currency     TEXT NOT NULL DEFAULT 'BDT',
  subtotal     REAL NOT NULL DEFAULT 0,
  discount     REAL NOT NULL DEFAULT 0,
  tax          REAL NOT NULL DEFAULT 0,
  total        REAL NOT NULL DEFAULT 0,
  paid         REAL NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Unpaid','Partial Paid','Paid','Cancelled')),
  notes        TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE TABLE IF NOT EXISTS invoice_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    REAL NOT NULL DEFAULT 1,
  unit_price  REAL NOT NULL DEFAULT 0,
  amount      REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount      REAL NOT NULL,
  method      TEXT NOT NULL DEFAULT 'Cash',
  paid_at     TEXT NOT NULL,
  reference   TEXT,
  note        TEXT,
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(paid_at);

CREATE TABLE IF NOT EXISTS activities (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id   INTEGER NOT NULL,
  action      TEXT NOT NULL,
  detail      TEXT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id, id);

CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  is_read     INTEGER NOT NULL DEFAULT 0,
  dedupe_key  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe ON notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
`;

db.exec(SCHEMA);

/* ------------------------------- migrations -------------------------------
 * CREATE TABLE IF NOT EXISTS above builds a new database, but it never changes
 * one that already exists. Anything added after the first release goes here
 * instead: each step runs once, in order, and is recorded so an upgrade on a
 * live database is safe to run as often as you like.
 */

db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name       TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
)`);

const hasColumn = (table, column) =>
  db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);

const hasTable = (table) =>
  Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(table));

/** ALTER TABLE ADD COLUMN, skipped when the column is already there. */
function addColumn(table, column, definition) {
  if (!hasTable(table) || hasColumn(table, column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/**
 * Creates an index only when everything it names actually exists.
 *
 * An index is a speed improvement, never a correctness requirement, so a
 * missing column must not stop the system starting. Failing to boot over an
 * index would be a far worse outcome than running one query slowly.
 */
function addIndex(name, table, columns) {
  if (!hasTable(table)) return;
  if (!columns.every((c) => hasColumn(table, c))) return;
  db.exec(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${columns.join(', ')})`);
}

const OWNED_TABLES = ['customers', 'leads', 'case_files', 'invoices', 'partners'];

const MIGRATIONS = [
  ['001-updated-by', () => {
    // Who last touched a record, alongside the created_by we already keep.
    for (const t of [...OWNED_TABLES, 'users', 'followups', 'meetings']) {
      addColumn(t, 'updated_by', 'INTEGER REFERENCES users(id) ON DELETE SET NULL');
    }
    for (const t of ['followups', 'meetings', 'documents', 'payments']) {
      addColumn(t, 'updated_at', 'TEXT');
    }
  }],

  ['002-archive-instead-of-delete', () => {
    // Business records are archived, never destroyed. Everything that hangs off
    // them stays attached, so an archive can be undone and the books still
    // reconcile afterwards.
    for (const t of OWNED_TABLES) {
      addColumn(t, 'deleted_at', 'TEXT');
      addColumn(t, 'deleted_by', 'INTEGER REFERENCES users(id) ON DELETE SET NULL');
      addColumn(t, 'delete_reason', 'TEXT');
      addIndex(`idx_${t}_live`, t, ['deleted_at']);
    }
  }],

  ['003-passport-expiry', () => {
    addColumn('customers', 'passport_expiry', 'TEXT');
  }],

  ['004-payment-reversals', () => {
    // A refund is a payment row with a negative amount pointing at the payment
    // it reverses, so the original receipt is never erased.
    addColumn('payments', 'reversal_of', 'INTEGER REFERENCES payments(id) ON DELETE SET NULL');
    addColumn('payments', 'reason', 'TEXT');
    // Stops a double-clicked "Record payment" from booking the same money twice.
    addColumn('payments', 'idempotency_key', 'TEXT');
    if (hasColumn('payments', 'idempotency_key')) {
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idem
               ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL`);
    }
  }],

  ['005-performance-indexes', () => {
    addIndex('idx_invoices_issue', 'invoices', ['issue_date']);
    addIndex('idx_invoices_customer', 'invoices', ['customer_id']);
    addIndex('idx_invoices_partner', 'invoices', ['partner_id']);
    addIndex('idx_invoices_file', 'invoices', ['case_file_id']);
    addIndex('idx_invoices_created', 'invoices', ['created_by']);
    addIndex('idx_files_assigned', 'case_files', ['assigned_to']);
    addIndex('idx_customers_assigned', 'customers', ['assigned_to']);
    addIndex('idx_leads_created', 'leads', ['created_at']);
    addIndex('idx_documents_by', 'documents', ['uploaded_by']);
    addIndex('idx_payments_by', 'payments', ['received_by']);
  }],

  ['006-row-version', () => {
    // A counter, not a timestamp. SQLite's datetime resolves to the second, so
    // two people saving inside the same second would both look unchanged and one
    // edit would still be lost silently.
    for (const t of OWNED_TABLES) {
      addColumn(t, 'version', 'INTEGER NOT NULL DEFAULT 1');
    }
  }],

  ['007-unique-passport', () => {
    if (!hasColumn('customers', 'deleted_at')) return;
    // A passport number identifies one traveller. Existing duplicates would make
    // the index impossible to build, so say so plainly rather than failing to
    // start — the system keeps working, just without the guarantee.
    const dupes = db.prepare(`
      SELECT passport_no, COUNT(*) n FROM customers
      WHERE passport_no IS NOT NULL AND trim(passport_no) != ''
      GROUP BY upper(trim(passport_no)) HAVING n > 1
    `).all();
    if (dupes.length) {
      console.warn('\n  NOTE: a unique passport-number rule could not be applied —');
      console.warn(`        ${dupes.length} passport number(s) are used by more than one customer:`);
      for (const d of dupes.slice(0, 5)) console.warn(`          ${d.passport_no} (${d.n} customers)`);
      console.warn('        Merge or correct them, then restart to apply the rule.\n');
      return;
    }
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_passport_unique
             ON customers(upper(trim(passport_no)))
             WHERE passport_no IS NOT NULL AND trim(passport_no) != '' AND deleted_at IS NULL`);
  }],
];

function runMigrations() {
  const done = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name));
  const record = db.prepare('INSERT INTO schema_migrations (name) VALUES (?)');
  for (const [name, step] of MIGRATIONS) {
    if (done.has(name)) continue;
    // Each step is its own transaction: a failure leaves earlier steps applied
    // and this one untouched, so a fix and a restart carries on from here.
    db.transaction(() => { step(); record.run(name); })();
  }
}

runMigrations();

module.exports = { db, DATA_DIR, UPLOAD_DIR, hasColumn, runMigrations };
