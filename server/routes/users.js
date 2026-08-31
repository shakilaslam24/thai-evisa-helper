'use strict';
const express = require('express');
const { db } = require('../db');
const { hashPassword, requireAuth, canWrite, denyPartner } = require('../auth');
const { wrap, bad, notFound, pick, merge, requireFields, oneOf, logActivity, diffSummary } = require('../helpers');
const v = require('../validate');
const { ROLES } = require('../constants');
const { publicUser } = require('./auth');

const router = express.Router();
router.use(requireAuth, denyPartner);

/**
 * A minimum that is actually a minimum.
 *
 * Eight characters with no other rule meant "password" and "12345678" were both
 * acceptable — and there was no rate limit on the login form to slow anyone
 * guessing them. Length does most of the work here; the rest just rules out the
 * handful of choices people reach for first.
 */
const COMMON_PASSWORDS = [
  'password', '12345678', 'qwerty', 'abc123', 'admin123', 'letmein', 'welcome',
  'dreamfly', 'password1', '123456789', 'iloveyou', 'changeme',
];

function assertStrongPassword(value, email, name) {
  const password = String(value || '');
  if (password.length < 10) bad('Password must be at least 10 characters');
  if (password.length > 200) bad('Password must be under 200 characters');
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.some((c) => lower.includes(c))) {
    bad('That password is too easy to guess — please choose another');
  }
  const localPart = String(email || '').split('@')[0];
  if (localPart.length > 3 && lower.includes(localPart.toLowerCase())) {
    bad('The password must not contain the email address');
  }
  for (const word of String(name || '').split(/\s+/)) {
    if (word.length > 3 && lower.includes(word.toLowerCase())) {
      bad('The password must not contain the person\'s name');
    }
  }
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) {
    bad('Password must contain at least one letter and one number');
  }
  return password;
}

/**
 * The staff list, which every screen needs to fill an "Assigned to" dropdown.
 *
 * Names and roles are what those dropdowns need; email addresses and phone
 * numbers are not. Handing every staff login the administrator's email made the
 * one account worth attacking easy to find, so contact details are now returned
 * only to an administrator, who is the only person who can edit a user anyway.
 */
router.get('/', wrap((req, res) => {
  const isAdmin = req.user.role === 'admin';
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.partner_id, u.active, u.created_at,
           p.partner_name
    FROM users u LEFT JOIN partners p ON p.id = u.partner_id
    ORDER BY u.active DESC, u.name
  `).all();
  res.json({
    data: rows.map((r) => (isAdmin
      ? { ...r, active: !!r.active }
      : {
        id: r.id, name: r.name, role: r.role, active: !!r.active,
        partner_id: r.partner_id, partner_name: r.partner_name,
      })),
  });
}));

router.post('/', canWrite('users'), wrap((req, res) => {
  requireFields(req.body, ['name', 'email', 'password', 'role']);
  const data = pick(req.body, ['name', 'email', 'phone', 'role', 'partner_id']);
  data.name = v.text(data.name, 'Name', v.LIMITS.name);
  data.email = v.email(data.email);
  data.phone = v.phone(data.phone, 'Phone number');
  oneOf(data.role, ROLES, 'role');
  assertStrongPassword(req.body.password, data.email, data.name);
  if (db.prepare('SELECT 1 FROM users WHERE lower(email) = ?').get(data.email)) {
    bad('A user with that email already exists');
  }
  if (data.role === 'partner' && !data.partner_id) {
    bad('A partner login must be linked to a B2B partner');
  }

  const info = db.prepare(`
    INSERT INTO users (name, email, phone, password_hash, role, partner_id)
    VALUES (@name, @email, @phone, @password_hash, @role, @partner_id)
  `).run({ ...data, password_hash: hashPassword(String(req.body.password)) });

  logActivity('user', info.lastInsertRowid, 'User created', `${data.name} (${data.role})`, req.user.id);
  res.status(201).json({ data: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)) });
}));

router.put('/:id', canWrite('users'), wrap((req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) notFound('User not found');

  const data = merge(existing, req.body, ['name', 'email', 'phone', 'role', 'partner_id']);
  data.name = v.text(data.name, 'Name', v.LIMITS.name) || existing.name;
  data.email = v.email(data.email) || existing.email;
  data.phone = v.phone(data.phone, 'Phone number');
  data.role = oneOf(data.role, ROLES, 'role') || existing.role;
  if (data.role === 'partner' && !data.partner_id) {
    bad('A partner login must be linked to a B2B partner');
  }
  const clash = db.prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?').get(data.email, id);
  if (clash) bad('A user with that email already exists');

  const active = req.body.active === undefined ? existing.active : (req.body.active ? 1 : 0);
  // Never let the last enabled admin lock everyone out of the system.
  if ((existing.role === 'admin') && (data.role !== 'admin' || !active)) {
    const admins = db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'admin' AND active = 1 AND id != ?").get(id).n;
    if (admins === 0) bad('This is the last active admin — promote another admin first');
  }

  db.prepare(`
    UPDATE users SET name = @name, email = @email, phone = @phone, role = @role,
      partner_id = @partner_id, active = @active,
      updated_at = datetime('now','localtime'), updated_by = @updated_by
    WHERE id = @id
  `).run({ ...data, active, updated_by: req.user.id, id });

  if (!active) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);

  /**
   * Say what actually changed.
   *
   * This used to log only the person's name, which made a promotion to
   * administrator indistinguishable from a corrected phone number — the single
   * most security-sensitive change in the system left no usable trail.
   */
  const summary = diffSummary(
    { ...existing, active: existing.active ? 'active' : 'disabled' },
    { ...data, active: active ? 'active' : 'disabled' },
    { name: 'Name', email: 'Email', phone: 'Phone', role: 'Role',
      partner_id: 'Linked partner', active: 'Account' },
  );
  const promoted = data.role === 'admin' && existing.role !== 'admin';
  logActivity('user', id,
    promoted ? 'User promoted to administrator' : 'User updated',
    summary || `${data.name} — no fields changed`, req.user.id);
  res.json({ data: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
}));

router.post('/:id/reset-password', canWrite('users'), wrap((req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(id)) notFound('User not found');
  const target = db.prepare('SELECT name, email FROM users WHERE id = ?').get(id);
  assertStrongPassword(req.body.password, target.email, target.name);

  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now','localtime') WHERE id = ?")
    .run(hashPassword(String(req.body.password)), id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  logActivity('user', id, 'Password reset by administrator',
    `${target.name} (${target.email}) — all their sessions signed out, by ${req.user.name}`, req.user.id);
  res.json({ ok: true });
}));

module.exports = router;
