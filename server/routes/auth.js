'use strict';
const express = require('express');
const { db } = require('../db');
const auth = require('../auth');
const { wrap, bad, HttpError, logActivity } = require('../helpers');
const { rateLimiter, clientIp } = require('../ratelimit');

const router = express.Router();

/**
 * Three limits, and one rule that keeps them from becoming an attack themselves.
 *
 * The rule: a correct password always gets in. Both meaningful limits are checked
 * only *after* the password has been verified, and only when it was wrong.
 * Blocking before that meant anyone who knew a staff email — every client who has
 * ever been emailed — could send ten wrong passwords and lock that person out for
 * fifteen minutes, over and over, the administrator included. It was worse behind
 * an office NAT, where thirty mistyped passwords across the whole team would have
 * shut everyone out from one shared address.
 *
 *   perAccount  10 failures / 15 min  — stops someone grinding one known address
 *   perAddress  30 failures / 15 min  — stops one machine spraying many accounts
 *   perAddressHard  300 / 15 min      — checked first, purely so a flood cannot
 *                                       burn the CPU on password hashing. No real
 *                                       office comes close to it.
 */
const WINDOW = 15 * 60 * 1000;

const perAccount = rateLimiter({
  windowMs: WINDOW,
  max: 10,
  keyOf: (req) => `account:${String(req.body?.email || '').trim().toLowerCase()}`,
  message: 'Too many failed attempts for this account. Wait {minutes} minute(s), '
    + 'or ask an administrator to reset the password.',
});

const perAddress = rateLimiter({
  windowMs: WINDOW,
  max: 30,
  keyOf: (req) => `ip:${clientIp(req)}`,
  message: 'Too many failed sign-in attempts from this device. '
    + 'Please try again in {minutes} minute(s).',
});

const perAddressHard = rateLimiter({
  windowMs: WINDOW,
  max: 300,
  keyOf: (req) => `flood:${clientIp(req)}`,
  message: 'Too many sign-in requests. Please try again in {minutes} minute(s).',
});

router.post('/login', perAddressHard, wrap((req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) bad('Email and password are required');

  const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
  // Same message either way so the form cannot be used to enumerate accounts.
  if (!user || !auth.verifyPassword(password, user.password_hash)) {
    perAccount.countFailure(req);
    perAddress.countFailure(req);
    // Over either limit, a wrong guess is refused outright rather than merely
    // answered. Guessing stops; signing in does not.
    if (perAccount.isBlocked(req)) throw new HttpError(429, perAccount.messageFor(req));
    if (perAddress.isBlocked(req)) throw new HttpError(429, perAddress.messageFor(req));
    throw new HttpError(401, 'Incorrect email or password');
  }
  if (!user.active) throw new HttpError(403, 'This account has been deactivated');

  // The right password proves this was never a guess, so both counts go away.
  perAccount.clear(req);
  perAddress.clear(req);
  auth.purgeExpiredSessions();
  const { token, expires } = auth.createSession(user.id);
  auth.setSessionCookie(req, res, token, expires);
  logActivity('user', user.id, 'Signed in', `from ${clientIp(req)}`, user.id);

  res.json({ user: publicUser(user) });
}));

router.post('/logout', wrap((req, res) => {
  auth.destroySession(req.sessionToken);
  auth.clearSessionCookie(res);
  res.json({ ok: true });
}));

router.get('/me', wrap((req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not signed in' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
}));

router.post('/change-password', auth.requireAuth, wrap((req, res) => {
  const current = String(req.body.current_password || '');
  const next = String(req.body.new_password || '');
  if (next.length < 10) bad('New password must be at least 10 characters');
  if (!/[a-z]/i.test(next) || !/\d/.test(next)) {
    bad('New password must contain at least one letter and one number');
  }
  if (next === current) bad('The new password must be different from the current one');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!auth.verifyPassword(current, user.password_hash)) bad('Current password is incorrect');

  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(auth.hashPassword(next), user.id);
  // Force other devices to sign in again with the new password.
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(user.id, req.sessionToken);
  logActivity('user', user.id, 'Changed password', 'own password, all other sessions signed out', user.id);
  res.json({ ok: true });
}));

function publicUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, phone: u.phone,
    role: u.role, partner_id: u.partner_id, active: !!u.active,
  };
}

module.exports = { router, publicUser };
