'use strict';
const { db } = require('./db');

/** Wrap an async route handler so rejections reach the error middleware. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (msg) => { throw new HttpError(400, msg); };
const notFound = (msg = 'Not found') => { throw new HttpError(404, msg); };

function logActivity(entityType, entityId, action, detail, userId) {
  db.prepare(`INSERT INTO activities (entity_type, entity_id, action, detail, user_id)
              VALUES (?, ?, ?, ?, ?)`)
    .run(entityType, entityId, action, detail || null, userId || null);
}

function notify(userId, { type, title, body, link, dedupeKey }) {
  if (!userId) return;
  db.prepare(`INSERT OR IGNORE INTO notifications (user_id, type, title, body, link, dedupe_key)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(userId, type, title, body || null, link || null, dedupeKey || null);
}

/** Record only the fields that actually changed, as a human-readable string. */
function diffSummary(before, after, labels) {
  const parts = [];
  for (const [key, label] of Object.entries(labels)) {
    const from = before?.[key] ?? '';
    const to = after?.[key] ?? '';
    if (String(from) !== String(to)) {
      parts.push(`${label}: "${from || '—'}" → "${to || '—'}"`);
    }
  }
  return parts.join('; ');
}

/** Trim strings, turn '' into null, so empty inputs do not become empty strings. */
function clean(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    return t === '' ? null : t;
  }
  return value;
}

function pick(body, fields) {
  const out = {};
  for (const f of fields) out[f] = clean(body[f]);
  return out;
}

/**
 * Values for an UPDATE, taking each field from the request only when the request
 * actually mentioned it and from the stored row otherwise.
 *
 * This is the difference between "change the status" and "change the status and
 * erase everything else". A field sent as an empty string still clears the
 * column, so a user can still blank something deliberately — what cannot happen
 * is a field being wiped because nobody mentioned it.
 */
function merge(before, body, fields) {
  const out = {};
  for (const f of fields) {
    out[f] = Object.prototype.hasOwnProperty.call(body, f)
      ? clean(body[f])
      : (before[f] === undefined ? null : before[f]);
  }
  return out;
}

/**
 * Refuses a save built on a version of the record somebody else has since changed.
 *
 * Two people editing the same customer used to end with one change silently
 * overwriting the other and neither being told. The client sends back the
 * version it loaded; if the stored row has moved on, the save is refused and the
 * person is asked to reload rather than quietly undoing a colleague.
 *
 * The check uses a version counter rather than updated_at, because SQLite's
 * timestamps resolve to the second and two saves inside the same second would
 * both look unchanged.
 *
 * A request that omits the version is allowed through, so a deliberate partial
 * update from a script or an integration still works.
 */
function assertUnchanged(before, body, what = 'record') {
  const seen = body && body.version;
  if (seen === undefined || seen === null || seen === '') return;
  if (Number(seen) !== Number(before.version)) {
    throw new HttpError(409,
      `Somebody else changed this ${what} while you had it open. `
      + 'Reload the page to see their change, then make yours again.');
  }
}

/**
 * Turns a database constraint into something a person can act on.
 *
 * Without this the user sees "Something went wrong on the server" when the real
 * answer is "that invoice number is already used".
 */
const CONSTRAINT_MESSAGES = {
  'invoices.invoice_no': 'That invoice number is already in use',
  'case_files.reference_no': 'That file reference is already in use',
  'users.email': 'A user with that email already exists',
  'customers.passport_no': 'Another customer is already recorded with that passport number',
  'lookups.type, lookups.value': 'That value is already on the list',
  'payments.idempotency_key': 'This payment has already been recorded',
};

function describeDbError(err) {
  if (!err || typeof err.code !== 'string' || !err.code.startsWith('SQLITE_CONSTRAINT')) return null;
  const message = String(err.message || '');
  for (const [columns, friendly] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (message.includes(columns)) return friendly;
  }
  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return 'That record no longer exists — please refresh and try again';
  }
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    return 'That value is already used by another record';
  }
  if (err.code === 'SQLITE_CONSTRAINT_CHECK') {
    return 'One of the values supplied is not allowed here';
  }
  if (err.code === 'SQLITE_CONSTRAINT_NOTNULL') {
    return 'A required value was missing';
  }
  return null;
}

/**
 * Only live records. Archiving keeps a row and everything attached to it, so
 * every listing has to say which side of that line it wants.
 */
const liveOnly = (alias) => `${alias}.deleted_at IS NULL`;

/** Marks a record archived rather than destroying it. */
function archive(table, id, userId, reason) {
  db.prepare(`UPDATE ${table} SET deleted_at = datetime('now','localtime'),
              deleted_by = ?, delete_reason = ? WHERE id = ?`)
    .run(userId || null, clean(reason), id);
}

function restore(table, id) {
  db.prepare(`UPDATE ${table} SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL
              WHERE id = ?`).run(id);
}

function requireFields(body, fields) {
  for (const f of fields) {
    if (!clean(body[f])) bad(`"${f}" is required`);
  }
}

function oneOf(value, allowed, fieldName) {
  if (value === null || value === undefined) return null;
  if (!allowed.includes(value)) bad(`Invalid ${fieldName}: "${value}"`);
  return value;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function paging(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 25, 1), 200);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { limit, offset: (page - 1) * limit, page };
}

/**
 * Restrict a listing to sortable columns the caller is allowed to name,
 * so `sort` can never be injected into SQL.
 */
function orderBy(query, allowed, fallback) {
  const col = allowed.includes(query.sort) ? query.sort : fallback;
  const dir = String(query.dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return `${col} ${dir}`;
}

/** Small builder that keeps WHERE fragments and their bindings together. */
function conditions() {
  const sql = [];
  const params = [];
  return {
    add(fragment, ...values) {
      sql.push(fragment);
      params.push(...values);
      return this;
    },
    addIf(value, fragment, ...values) {
      if (value !== undefined && value !== null && value !== '') {
        sql.push(fragment);
        params.push(...(values.length ? values : [value]));
      }
      return this;
    },
    where() { return sql.length ? `WHERE ${sql.join(' AND ')}` : ''; },
    params,
  };
}

/**
 * Today, on the server's own clock rather than UTC.
 *
 * Everything the office types — a payment date, an issue date — is a local
 * wall-clock date, and the database now stores its timestamps the same way, so
 * a default of "today" has to come from the same clock. With TZ unset this is
 * still UTC, which is why the startup check in server/index.js complains.
 */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

module.exports = {
  wrap, HttpError, bad, notFound, logActivity, notify, diffSummary,
  clean, pick, merge, requireFields, oneOf, toNumber, paging, orderBy, conditions,
  todayISO, describeDbError, liveOnly, archive, restore, assertUnchanged, db,
};
