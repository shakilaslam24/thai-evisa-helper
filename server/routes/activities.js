'use strict';
const express = require('express');
const { db } = require('../db');
const { requireAuth, canWrite, denyPartner } = require('../auth');
const { wrap, bad, paging, logActivity, clean } = require('../helpers');

const router = express.Router();
router.use(requireAuth, denyPartner);

const ENTITY_TYPES = ['lead', 'customer', 'case_file', 'partner', 'invoice', 'meeting', 'user', 'settings'];

/** Activity timeline for one record, or the whole company feed when unfiltered. */
router.get('/', wrap((req, res) => {
  const { entity_type, entity_id } = req.query;
  const { limit, offset, page } = paging(req.query);
  const where = [];
  const params = [];
  if (entity_type) { where.push('a.entity_type = ?'); params.push(entity_type); }
  if (entity_id) { where.push('a.entity_id = ?'); params.push(Number(entity_id)); }
  if (req.query.user_id) { where.push('a.user_id = ?'); params.push(Number(req.query.user_id)); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) n FROM activities a ${clause}`).get(...params).n;
  const data = db.prepare(`
    SELECT a.*, u.name AS user_name, u.role AS user_role
    FROM activities a LEFT JOIN users u ON u.id = a.user_id
    ${clause} ORDER BY a.id DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  res.json({ data, total, page, limit });
}));

/** Free-text note added by a user against any record — appears in its timeline. */
router.post('/', canWrite('leads'), wrap((req, res) => {
  const entityType = clean(req.body.entity_type);
  const entityId = Number(req.body.entity_id);
  const note = clean(req.body.note);
  if (!ENTITY_TYPES.includes(entityType)) bad('Unknown record type');
  if (!entityId) bad('Record id is required');
  if (!note) bad('Note text is required');

  const action = clean(req.body.action) || 'Note added';
  logActivity(entityType, entityId, action, note, req.user.id);
  const row = db.prepare(`
    SELECT a.*, u.name AS user_name FROM activities a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.id = last_insert_rowid()
  `).get();
  res.status(201).json({ data: row });
}));

module.exports = router;
