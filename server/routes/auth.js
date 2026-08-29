'use strict';
const express = require('express');
const { db } = require('../db');
const auth = require('../auth');
const { wrap, bad, HttpError, logActivity } = require('../helpers');

const router = express.Router();

router.post('/login', wrap((req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) bad('Email and password are required');

  const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
  // Same message either way so the form cannot be used to enumerate accounts.
  if (!user || !auth.verifyPassword(password, user.password_hash)) {
    throw new HttpError(401, 'Incorrect email or password');
  }
  if (!user.active) throw new HttpError(403, 'This account has been deactivated');

  auth.purgeExpiredSessions();
  const { token, expires } = auth.createSession(user.id);
  auth.setSessionCookie(res, token, expires);
  logActivity('user', user.id, 'Signed in', null, user.id);

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
  if (next.length < 8) bad('New password must be at least 8 characters');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!auth.verifyPassword(current, user.password_hash)) bad('Current password is incorrect');

  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(auth.hashPassword(next), user.id);
  // Force other devices to sign in again with the new password.
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(user.id, req.sessionToken);
  logActivity('user', user.id, 'Changed password', null, user.id);
  res.json({ ok: true });
}));

function publicUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, phone: u.phone,
    role: u.role, partner_id: u.partner_id, active: !!u.active,
  };
}

module.exports = { router, publicUser };
