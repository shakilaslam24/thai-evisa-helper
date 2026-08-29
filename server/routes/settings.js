'use strict';
const express = require('express');
const { db } = require('../db');
const { requireAuth, canWrite } = require('../auth');
const { wrap, bad, clean, logActivity } = require('../helpers');
const C = require('../constants');

const router = express.Router();
router.use(requireAuth);

const COMPANY_KEYS = [
  'company_name', 'company_tagline', 'company_address', 'company_phone',
  'company_phone_alt', 'company_email', 'company_website', 'company_logo_url',
  'invoice_prefix', 'invoice_currency', 'invoice_footer', 'invoice_terms',
  'notify_followup_due', 'notify_meeting_reminder', 'notify_payment_due',
  'notify_interview_reminder', 'notify_missing_documents',
];

function readSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

router.get('/', wrap((req, res) => {
  res.json({ data: readSettings() });
}));

router.put('/', canWrite('settings'), wrap((req, res) => {
  const stmt = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
                           ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
  const save = db.transaction((entries) => {
    for (const [k, v] of entries) stmt.run(k, v === null ? null : String(v));
  });
  const entries = Object.entries(req.body).filter(([k]) => COMPANY_KEYS.includes(k));
  if (!entries.length) bad('No recognised settings were supplied');
  save(entries);
  logActivity('settings', 0, 'Settings updated', entries.map(([k]) => k).join(', '), req.user.id);
  res.json({ data: readSettings() });
}));

/* ------------------------------ lookup lists ------------------------------ */

const LOOKUP_TYPES = ['country', 'service', 'lead_source', 'document_category'];

router.get('/lookups', wrap((req, res) => {
  const rows = db.prepare('SELECT * FROM lookups WHERE active = 1 ORDER BY type, sort_order, value').all();
  const data = {};
  for (const t of LOOKUP_TYPES) data[t] = [];
  for (const r of rows) (data[r.type] ||= []).push({ id: r.id, value: r.value });
  res.json({
    data,
    // Fixed vocabularies the UI needs but that are not user-editable.
    enums: {
      lead_statuses: C.LEAD_STATUSES,
      lead_priorities: C.LEAD_PRIORITIES,
      file_statuses: C.FILE_STATUSES,
      meeting_types: C.MEETING_TYPES,
      meeting_statuses: C.MEETING_STATUSES,
      partner_statuses: C.PARTNER_STATUSES,
      payment_statuses: C.PAYMENT_STATUSES,
      payment_methods: C.PAYMENT_METHODS,
      checklist_statuses: C.CHECKLIST_STATUSES,
      roles: C.ROLES,
    },
  });
}));

router.post('/lookups', canWrite('settings'), wrap((req, res) => {
  const type = clean(req.body.type);
  const value = clean(req.body.value);
  if (!LOOKUP_TYPES.includes(type)) bad('Unknown list type');
  if (!value) bad('Value is required');
  db.prepare(`INSERT INTO lookups (type, value, sort_order) VALUES (?, ?, 100)
              ON CONFLICT(type, value) DO UPDATE SET active = 1`).run(type, value);
  logActivity('settings', 0, 'List item added', `${type}: ${value}`, req.user.id);
  res.status(201).json({ data: db.prepare('SELECT * FROM lookups WHERE type = ? AND value = ?').get(type, value) });
}));

router.delete('/lookups/:id', canWrite('settings'), wrap((req, res) => {
  const row = db.prepare('SELECT * FROM lookups WHERE id = ?').get(Number(req.params.id));
  if (!row) bad('List item not found');
  // Soft delete: existing records keep showing the value they were saved with.
  db.prepare('UPDATE lookups SET active = 0 WHERE id = ?').run(row.id);
  logActivity('settings', 0, 'List item removed', `${row.type}: ${row.value}`, req.user.id);
  res.json({ ok: true });
}));

module.exports = { router, readSettings };
