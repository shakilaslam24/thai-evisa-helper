'use strict';
const express = require('express');
const { db } = require('../db');
const vocab = require('../vocab');
const { requireAuth, canWrite, denyPartner } = require('../auth');
const {
  wrap, bad, notFound, pick, requireFields, oneOf, paging, orderBy, conditions,
  logActivity, notify, toNumber,
} = require('../helpers');
const { MEETING_TYPES, MEETING_STATUSES } = require('../constants');

const router = express.Router();
router.use(requireAuth, denyPartner);

const SELECT = `
  SELECT m.*, u.name AS assigned_name,
    CASE m.entity_type
      WHEN 'lead'     THEN (SELECT full_name FROM leads WHERE id = m.entity_id)
      WHEN 'customer' THEN (SELECT trim(given_name || ' ' || COALESCE(surname,'')) FROM customers WHERE id = m.entity_id)
      WHEN 'partner'  THEN (SELECT partner_name FROM partners WHERE id = m.entity_id)
    END AS entity_name
  FROM meetings m
  LEFT JOIN users u ON u.id = m.assigned_to
`;

router.get('/', wrap((req, res) => {
  const q = req.query;
  const w = conditions();
  w.addIf(q.status, 'm.status = ?');
  w.addIf(q.meeting_type, 'm.meeting_type = ?');
  w.addIf(q.assigned_to, 'm.assigned_to = ?', Number(q.assigned_to));
  w.addIf(q.entity_type, 'm.entity_type = ?');
  w.addIf(q.entity_id, 'm.entity_id = ?', Number(q.entity_id));
  w.addIf(q.date_from, 'date(m.meeting_at) >= date(?)');
  w.addIf(q.date_to, 'date(m.meeting_at) <= date(?)');
  if (q.when === 'today') w.add("date(m.meeting_at) = date('now','localtime')");
  if (q.when === 'upcoming') w.add("m.meeting_at >= datetime('now','localtime') AND m.status = 'Scheduled'");

  const { limit, offset, page } = paging(q);
  const sort = orderBy(q, ['m.meeting_at', 'm.created_at', 'm.status'], 'm.meeting_at');
  const total = db.prepare(`SELECT COUNT(*) n FROM meetings m ${w.where()}`).get(...w.params).n;
  const data = db.prepare(`${SELECT} ${w.where()} ORDER BY ${sort} LIMIT ? OFFSET ?`)
    .all(...w.params, limit, offset);
  res.json({ data, total, page, limit });
}));

router.post('/', canWrite('meetings'), wrap((req, res) => {
  requireFields(req.body, ['title', 'meeting_at']);
  const data = pick(req.body, [
    'title', 'entity_type', 'entity_id', 'meeting_at', 'meeting_type', 'assigned_to', 'notes',
  ]);
  oneOf(data.meeting_type, vocab.values('meeting_type'), 'meeting type');
  data.meeting_type ||= 'Office Visit';
  data.entity_id = data.entity_id ? Number(data.entity_id) : null;
  data.assigned_to = data.assigned_to ? Number(data.assigned_to) : req.user.id;
  const remind = toNumber(req.body.remind_before_min, 30);

  const info = db.prepare(`
    INSERT INTO meetings (title, entity_type, entity_id, meeting_at, meeting_type,
                          assigned_to, notes, remind_before_min, created_by)
    VALUES (@title, @entity_type, @entity_id, @meeting_at, @meeting_type,
            @assigned_to, @notes, @remind, @created_by)
  `).run({ ...data, remind, created_by: req.user.id });

  const id = info.lastInsertRowid;
  if (data.entity_type && data.entity_id) {
    logActivity(data.entity_type, data.entity_id, 'Meeting scheduled',
      `${data.title} · ${data.meeting_at}`, req.user.id);
    // A fixed meeting is a real change in the lead's position in the pipeline.
    if (data.entity_type === 'lead') {
      db.prepare(`UPDATE leads SET status = 'Meeting Fixed', updated_at = datetime('now')
                  WHERE id = ? AND status NOT IN ('Converted','Not Interested','Closed')`)
        .run(data.entity_id);
    }
  }
  logActivity('meeting', id, 'Meeting created', data.title, req.user.id);
  if (data.assigned_to !== req.user.id) {
    notify(data.assigned_to, {
      type: 'meeting_assigned', title: 'Meeting assigned to you',
      body: `${data.title} — ${data.meeting_at}`, link: '#/meetings',
    });
  }
  res.status(201).json({ data: db.prepare(`${SELECT} WHERE m.id = ?`).get(id) });
}));

router.put('/:id', canWrite('meetings'), wrap((req, res) => {
  const id = Number(req.params.id);
  const before = db.prepare('SELECT * FROM meetings WHERE id = ?').get(id);
  if (!before) notFound('Meeting not found');
  const data = pick(req.body, ['title', 'meeting_at', 'meeting_type', 'assigned_to', 'notes', 'status']);
  oneOf(data.meeting_type, vocab.values('meeting_type'), 'meeting type');
  oneOf(data.status, MEETING_STATUSES, 'status');

  db.prepare(`
    UPDATE meetings SET title = COALESCE(@title, title),
      meeting_at = COALESCE(@meeting_at, meeting_at),
      meeting_type = COALESCE(@meeting_type, meeting_type),
      assigned_to = @assigned_to, notes = @notes,
      status = COALESCE(@status, status),
      remind_before_min = @remind
    WHERE id = @id
  `).run({
    ...data,
    assigned_to: data.assigned_to ? Number(data.assigned_to) : before.assigned_to,
    remind: toNumber(req.body.remind_before_min, before.remind_before_min),
    id,
  });

  // Rescheduling clears the old reminder so the new time can fire its own.
  if (data.meeting_at && data.meeting_at !== before.meeting_at) {
    db.prepare('DELETE FROM notifications WHERE dedupe_key = ?').run(`meeting:${id}`);
  }
  logActivity('meeting', id, 'Meeting updated', data.title || before.title, req.user.id);
  res.json({ data: db.prepare(`${SELECT} WHERE m.id = ?`).get(id) });
}));

router.patch('/:id/status', canWrite('meetings'), wrap((req, res) => {
  const id = Number(req.params.id);
  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(id);
  if (!meeting) notFound('Meeting not found');
  const status = oneOf(req.body.status, MEETING_STATUSES, 'status');
  if (!status) bad('Status is required');
  db.prepare('UPDATE meetings SET status = ? WHERE id = ?').run(status, id);
  logActivity('meeting', id, 'Meeting status changed', `${meeting.status} → ${status}`, req.user.id);
  if (meeting.entity_type && meeting.entity_id) {
    logActivity(meeting.entity_type, meeting.entity_id, `Meeting ${status.toLowerCase()}`,
      meeting.title, req.user.id);
  }
  res.json({ data: db.prepare(`${SELECT} WHERE m.id = ?`).get(id) });
}));

router.delete('/:id', canWrite('meetings'), wrap((req, res) => {
  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(Number(req.params.id));
  if (!meeting) notFound('Meeting not found');
  db.prepare('DELETE FROM meetings WHERE id = ?').run(meeting.id);
  logActivity('meeting', meeting.id, 'Meeting deleted', meeting.title, req.user.id);
  res.json({ ok: true });
}));

module.exports = router;
