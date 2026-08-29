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

const todayISO = () => new Date().toISOString().slice(0, 10);

module.exports = {
  wrap, HttpError, bad, notFound, logActivity, notify, diffSummary,
  clean, pick, requireFields, oneOf, toNumber, paging, orderBy, conditions, todayISO, db,
};
