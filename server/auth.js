'use strict';
const crypto = require('crypto');
const { db } = require('./db');
const { WRITE_ACCESS } = require('./constants');

const SESSION_COOKIE = 'dreamfly_sid';
const SESSION_DAYS = 7;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS);
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt.toString('hex')}$${key.toString('hex')}`;
}

function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, saltHex, keyHex] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(keyHex, 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: Number(N), r: Number(r), p: Number(p),
    });
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, userId, expires);
  return { token, expires };
}

function destroySession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function purgeExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
}

function readCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function setSessionCookie(res, token, expires) {
  const bits = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Expires=${new Date(expires).toUTCString()}`,
  ];
  if (process.env.NODE_ENV === 'production') bits.push('Secure');
  res.append('Set-Cookie', bits.join('; '));
}

function clearSessionCookie(res) {
  res.append('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

/** Populates req.user when a valid session cookie is present. Never rejects. */
function loadUser(req, res, next) {
  const token = readCookies(req)[SESSION_COOKIE];
  req.sessionToken = token || null;
  if (token) {
    const row = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.partner_id, u.active
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token);
    if (row && row.active) req.user = row;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not signed in' });
  next();
}

/** requireRole('admin', 'manager') */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not signed in' });
    if (req.user.role === 'admin' || roles.includes(req.user.role)) return next();
    res.status(403).json({ error: 'Your role does not have access to this action' });
  };
}

/**
 * Blocks the limited B2B-partner login from company-wide modules. Partner logins
 * may only ever reach endpoints that scope their results to their own partner id.
 */
function denyPartner(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not signed in' });
  if (req.user.role === 'partner') {
    return res.status(403).json({ error: 'Partner logins can only see their own files and invoices' });
  }
  next();
}

/** canWrite('invoices') — enforces the module permission matrix. */
function canWrite(moduleName) {
  return requireRole(...(WRITE_ACCESS[moduleName] || []));
}

module.exports = {
  SESSION_COOKIE, hashPassword, verifyPassword, createSession, destroySession,
  purgeExpiredSessions, readCookies, setSessionCookie, clearSessionCookie,
  loadUser, requireAuth, requireRole, canWrite, denyPartner,
};
