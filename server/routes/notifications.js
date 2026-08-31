'use strict';
const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const { wrap, notFound } = require('../helpers');
const { runReminderSweep } = require('../reminders');

const router = express.Router();
router.use(requireAuth);

router.get('/', wrap((req, res) => {
  // Sweep on read so reminders appear even when the server was just restarted.
  runReminderSweep();
  const unreadOnly = req.query.unread === '1';
  const rows = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ? ${unreadOnly ? 'AND is_read = 0' : ''}
    ORDER BY is_read, id DESC LIMIT 100
  `).all(req.user.id);
  const unread = db.prepare('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(req.user.id).n;
  res.json({ data: rows, unread });
}));

router.get('/count', wrap((req, res) => {
  const unread = db.prepare('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(req.user.id).n;
  res.json({ data: { unread } });
}));

router.post('/:id/read', wrap((req, res) => {
  const row = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?')
    .get(Number(req.params.id), req.user.id);
  if (!row) notFound('Notification not found');
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(row.id);
  res.json({ ok: true });
}));

router.post('/read-all', wrap((req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
  res.json({ ok: true });
}));

router.delete('/:id', wrap((req, res) => {
  db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.user.id);
  res.json({ ok: true });
}));

module.exports = router;
