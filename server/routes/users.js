'use strict';
const express = require('express');
const { db } = require('../db');
const { hashPassword, requireAuth, canWrite, denyPartner } = require('../auth');
const { wrap, bad, notFound, pick, requireFields, oneOf, logActivity } = require('../helpers');
const { ROLES } = require('../constants');
const { publicUser } = require('./auth');

const router = express.Router();
router.use(requireAuth, denyPartner);

// Everyone needs the staff list to populate "Assigned To" dropdowns.
router.get('/', wrap((req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.partner_id, u.active, u.created_at,
           p.partner_name
    FROM users u LEFT JOIN partners p ON p.id = u.partner_id
    ORDER BY u.active DESC, u.name
  `).all();
  res.json({ data: rows.map((r) => ({ ...r, active: !!r.active })) });
}));

router.post('/', canWrite('users'), wrap((req, res) => {
  requireFields(req.body, ['name', 'email', 'password', 'role']);
  const data = pick(req.body, ['name', 'email', 'phone', 'role', 'partner_id']);
  oneOf(data.role, ROLES, 'role');
  if (String(req.body.password).length < 8) bad('Password must be at least 8 characters');
  data.email = data.email.toLowerCase();
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

  const data = pick(req.body, ['name', 'email', 'phone', 'role', 'partner_id']);
  oneOf(data.role, ROLES, 'role');
  data.email = (data.email || existing.email).toLowerCase();
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
      partner_id = @partner_id, active = @active, updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...data, active, id });

  if (!active) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  logActivity('user', id, 'User updated', data.name, req.user.id);
  res.json({ data: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
}));

router.post('/:id/reset-password', canWrite('users'), wrap((req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(id)) notFound('User not found');
  const password = String(req.body.password || '');
  if (password.length < 8) bad('Password must be at least 8 characters');

  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(hashPassword(password), id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  logActivity('user', id, 'Password reset by admin', null, req.user.id);
  res.json({ ok: true });
}));

module.exports = router;
