'use strict';
const express = require('express');
const { db } = require('../db');
const { requireAuth, canWrite, denyPartner } = require('../auth');
const {
  wrap, bad, notFound, pick, requireFields, paging, orderBy, conditions,
  logActivity, notify,
} = require('../helpers');

const router = express.Router();
router.use(requireAuth, denyPartner);

/**
 * Follow-ups attach to leads, customers, files or partners, so the display name
 * comes from whichever table the entity_type points at.
 */
const SELECT = `
  SELECT f.*, u.name AS assigned_name, cb.name AS created_by_name,
    CASE f.entity_type
      WHEN 'lead'      THEN (SELECT full_name FROM leads WHERE id = f.entity_id)
      WHEN 'customer'  THEN (SELECT trim(given_name || ' ' || COALESCE(surname,'')) FROM customers WHERE id = f.entity_id)
      WHEN 'partner'   THEN (SELECT partner_name FROM partners WHERE id = f.entity_id)
      WHEN 'case_file' THEN (SELECT COALESCE(reference_no, 'File #' || id) FROM case_files WHERE id = f.entity_id)
    END AS entity_name,
    CASE f.entity_type
      WHEN 'lead'      THEN (SELECT phone FROM leads WHERE id = f.entity_id)
      WHEN 'customer'  THEN (SELECT phone FROM customers WHERE id = f.entity_id)
      WHEN 'partner'   THEN (SELECT personal_phone FROM partners WHERE id = f.entity_id)
    END AS entity_phone
  FROM followups f
  LEFT JOIN users u ON u.id = f.assigned_to
  LEFT JOIN users cb ON cb.id = f.created_by
`;

router.get('/', wrap((req, res) => {
  const q = req.query;
  const w = conditions();
  w.addIf(q.status, 'f.status = ?');
  w.addIf(q.assigned_to, 'f.assigned_to = ?', Number(q.assigned_to));
  w.addIf(q.entity_type, 'f.entity_type = ?');
  w.addIf(q.entity_id, 'f.entity_id = ?', Number(q.entity_id));
  w.addIf(q.date_from, 'date(f.due_at) >= date(?)');
  w.addIf(q.date_to, 'date(f.due_at) <= date(?)');

  if (q.due === 'today') w.add("f.status = 'Pending' AND date(f.due_at) = date('now','localtime')");
  if (q.due === 'overdue') w.add("f.status = 'Pending' AND f.due_at < datetime('now','localtime')");
  if (q.due === 'upcoming') w.add("f.status = 'Pending' AND f.due_at > datetime('now','localtime')");

  const { limit, offset, page } = paging(q);
  const sort = orderBy(q, ['f.due_at', 'f.created_at', 'f.status'], 'f.due_at');
  const total = db.prepare(`SELECT COUNT(*) n FROM followups f ${w.where()}`).get(...w.params).n;
  const data = db.prepare(`${SELECT} ${w.where()} ORDER BY ${sort} LIMIT ? OFFSET ?`)
    .all(...w.params, limit, offset);
  res.json({ data, total, page, limit });
}));

router.post('/', canWrite('followups'), wrap((req, res) => {
  requireFields(req.body, ['entity_type', 'entity_id', 'due_at']);
  const data = pick(req.body, ['entity_type', 'entity_id', 'due_at', 'note', 'assigned_to']);
  if (!['lead', 'customer', 'case_file', 'partner'].includes(data.entity_type)) {
    bad('Follow-ups can only be attached to a lead, customer, file or partner');
  }
  data.entity_id = Number(data.entity_id);
  data.assigned_to = data.assigned_to ? Number(data.assigned_to) : req.user.id;

  const info = db.prepare(`
    INSERT INTO followups (entity_type, entity_id, due_at, note, assigned_to, created_by)
    VALUES (@entity_type, @entity_id, @due_at, @note, @assigned_to, @created_by)
  `).run({ ...data, created_by: req.user.id });

  // Keep the lead's own "next follow-up" column in step with its earliest open task.
  if (data.entity_type === 'lead') syncLeadFollowup(data.entity_id);

  logActivity(data.entity_type, data.entity_id, 'Follow-up scheduled',
    `${data.due_at}${data.note ? ` — ${data.note}` : ''}`, req.user.id);
  if (data.assigned_to !== req.user.id) {
    notify(data.assigned_to, {
      type: 'followup_assigned', title: 'Follow-up assigned to you',
      body: `${data.due_at} — ${data.note || 'No note'}`, link: '#/followups',
    });
  }
  res.status(201).json({ data: db.prepare(`${SELECT} WHERE f.id = ?`).get(info.lastInsertRowid) });
}));

router.put('/:id', canWrite('followups'), wrap((req, res) => {
  const id = Number(req.params.id);
  const before = db.prepare('SELECT * FROM followups WHERE id = ?').get(id);
  if (!before) notFound('Follow-up not found');
  const data = pick(req.body, ['due_at', 'note', 'assigned_to']);
  db.prepare(`UPDATE followups SET due_at = COALESCE(@due_at, due_at), note = @note,
              assigned_to = @assigned_to WHERE id = @id`)
    .run({ ...data, assigned_to: data.assigned_to ? Number(data.assigned_to) : before.assigned_to, id });
  if (before.entity_type === 'lead') syncLeadFollowup(before.entity_id);
  logActivity(before.entity_type, before.entity_id, 'Follow-up updated', data.note, req.user.id);
  res.json({ data: db.prepare(`${SELECT} WHERE f.id = ?`).get(id) });
}));

/** Close a follow-up, record the outcome, and optionally chain the next one. */
router.post('/:id/complete', canWrite('followups'), wrap((req, res) => {
  const id = Number(req.params.id);
  const item = db.prepare('SELECT * FROM followups WHERE id = ?').get(id);
  if (!item) notFound('Follow-up not found');
  if (item.status !== 'Pending') bad('This follow-up is already closed');

  const outcome = req.body.outcome || null;
  const nextDue = req.body.next_due_at || null;
  const nextNote = req.body.next_note || null;

  const finish = db.transaction(() => {
    db.prepare(`UPDATE followups SET status = 'Done', outcome = ?, completed_at = datetime('now')
                WHERE id = ?`).run(outcome, id);
    if (nextDue) {
      db.prepare(`INSERT INTO followups (entity_type, entity_id, due_at, note, assigned_to, created_by)
                  VALUES (?, ?, ?, ?, ?, ?)`)
        .run(item.entity_type, item.entity_id, nextDue, nextNote, item.assigned_to, req.user.id);
    }
  });
  finish();

  if (item.entity_type === 'lead') syncLeadFollowup(item.entity_id);
  logActivity(item.entity_type, item.entity_id, 'Follow-up completed',
    outcome || 'No outcome noted', req.user.id);
  res.json({ ok: true });
}));

router.post('/:id/cancel', canWrite('followups'), wrap((req, res) => {
  const item = db.prepare('SELECT * FROM followups WHERE id = ?').get(Number(req.params.id));
  if (!item) notFound('Follow-up not found');
  db.prepare("UPDATE followups SET status = 'Cancelled' WHERE id = ?").run(item.id);
  if (item.entity_type === 'lead') syncLeadFollowup(item.entity_id);
  logActivity(item.entity_type, item.entity_id, 'Follow-up cancelled', item.note, req.user.id);
  res.json({ ok: true });
}));

function syncLeadFollowup(leadId) {
  const next = db.prepare(`SELECT MIN(due_at) d FROM followups
                           WHERE entity_type = 'lead' AND entity_id = ? AND status = 'Pending'`)
    .get(leadId).d;
  db.prepare("UPDATE leads SET next_followup_at = ?, updated_at = datetime('now') WHERE id = ?")
    .run(next || null, leadId);
}

module.exports = { router, syncLeadFollowup };
