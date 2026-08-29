'use strict';
const express = require('express');
const { db } = require('../db');
const { requireAuth, canWrite, denyPartner } = require('../auth');
const {
  wrap, bad, notFound, pick, requireFields, oneOf, paging, orderBy, conditions,
  logActivity, notify, diffSummary,
} = require('../helpers');
const { LEAD_STATUSES, LEAD_PRIORITIES } = require('../constants');

const router = express.Router();
router.use(requireAuth, denyPartner);

const FIELDS = [
  'full_name', 'phone', 'whatsapp', 'email', 'address', 'source', 'service_type',
  'country', 'priority', 'assigned_to', 'status', 'next_followup_at', 'initial_note',
];

const LABELS = {
  full_name: 'Name', phone: 'Phone', whatsapp: 'WhatsApp', email: 'Email',
  address: 'Address', source: 'Source', service_type: 'Service', country: 'Country',
  priority: 'Priority', assigned_to: 'Assigned staff', status: 'Status',
  next_followup_at: 'Next follow-up',
};

const SELECT = `
  SELECT l.*, u.name AS assigned_name, c.name AS created_by_name,
         (SELECT COUNT(*) FROM followups f
           WHERE f.entity_type = 'lead' AND f.entity_id = l.id AND f.status = 'Pending') AS pending_followups
  FROM leads l
  LEFT JOIN users u ON u.id = l.assigned_to
  LEFT JOIN users c ON c.id = l.created_by
`;

router.get('/', wrap((req, res) => {
  const q = req.query;
  const w = conditions();
  if (q.search) {
    const like = `%${q.search}%`;
    w.add('(l.full_name LIKE ? OR l.phone LIKE ? OR l.whatsapp LIKE ? OR l.email LIKE ?)',
      like, like, like, like);
  }
  w.addIf(q.status, 'l.status = ?');
  w.addIf(q.priority, 'l.priority = ?');
  w.addIf(q.source, 'l.source = ?');
  w.addIf(q.country, 'l.country = ?');
  w.addIf(q.service_type, 'l.service_type = ?');
  w.addIf(q.assigned_to, 'l.assigned_to = ?', Number(q.assigned_to));
  w.addIf(q.date_from, 'date(l.created_at) >= date(?)');
  w.addIf(q.date_to, 'date(l.created_at) <= date(?)');
  if (q.due === 'today') w.add("date(l.next_followup_at) = date('now','localtime')");
  if (q.due === 'overdue') w.add("l.next_followup_at IS NOT NULL AND l.next_followup_at < datetime('now','localtime') AND l.status NOT IN ('Converted','Not Interested','Closed')");

  const { limit, offset, page } = paging(q);
  const sort = orderBy(q, ['l.created_at', 'l.full_name', 'l.next_followup_at', 'l.priority', 'l.status'], 'l.created_at');
  const total = db.prepare(`SELECT COUNT(*) n FROM leads l ${w.where()}`).get(...w.params).n;
  const data = db.prepare(`${SELECT} ${w.where()} ORDER BY ${sort} LIMIT ? OFFSET ?`)
    .all(...w.params, limit, offset);

  res.json({ data, total, page, limit });
}));

router.get('/:id', wrap((req, res) => {
  const lead = db.prepare(`${SELECT} WHERE l.id = ?`).get(Number(req.params.id));
  if (!lead) notFound('Lead not found');
  res.json({ data: lead });
}));

router.post('/', canWrite('leads'), wrap((req, res) => {
  requireFields(req.body, ['full_name']);
  const data = pick(req.body, FIELDS);
  oneOf(data.priority, LEAD_PRIORITIES, 'priority');
  oneOf(data.status, LEAD_STATUSES, 'status');
  data.priority ||= 'Warm';
  data.status ||= 'New Lead';
  data.assigned_to = data.assigned_to ? Number(data.assigned_to) : req.user.id;

  const info = db.prepare(`
    INSERT INTO leads (full_name, phone, whatsapp, email, address, source, service_type,
                       country, priority, assigned_to, status, next_followup_at, initial_note, created_by)
    VALUES (@full_name, @phone, @whatsapp, @email, @address, @source, @service_type,
            @country, @priority, @assigned_to, @status, @next_followup_at, @initial_note, @created_by)
  `).run({ ...data, created_by: req.user.id });

  const id = info.lastInsertRowid;
  logActivity('lead', id, 'Lead created', `${data.full_name} · ${data.source || 'no source'}`, req.user.id);

  // A lead with a follow-up date becomes a real follow-up task, not just a column.
  if (data.next_followup_at) {
    db.prepare(`INSERT INTO followups (entity_type, entity_id, due_at, note, assigned_to, created_by)
                VALUES ('lead', ?, ?, ?, ?, ?)`)
      .run(id, data.next_followup_at, data.initial_note, data.assigned_to, req.user.id);
  }
  if (data.assigned_to && data.assigned_to !== req.user.id) {
    notify(data.assigned_to, {
      type: 'lead_assigned', title: 'New lead assigned to you',
      body: data.full_name, link: `#/leads/${id}`,
    });
  }

  res.status(201).json({ data: db.prepare(`${SELECT} WHERE l.id = ?`).get(id) });
}));

router.put('/:id', canWrite('leads'), wrap((req, res) => {
  const id = Number(req.params.id);
  const before = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (!before) notFound('Lead not found');

  const data = pick(req.body, FIELDS);
  oneOf(data.priority, LEAD_PRIORITIES, 'priority');
  oneOf(data.status, LEAD_STATUSES, 'status');
  data.priority ||= before.priority;
  data.status ||= before.status;
  data.assigned_to = data.assigned_to ? Number(data.assigned_to) : null;

  db.prepare(`
    UPDATE leads SET full_name=@full_name, phone=@phone, whatsapp=@whatsapp, email=@email,
      address=@address, source=@source, service_type=@service_type, country=@country,
      priority=@priority, assigned_to=@assigned_to, status=@status,
      next_followup_at=@next_followup_at, initial_note=@initial_note,
      updated_at=datetime('now')
    WHERE id=@id
  `).run({ ...data, id });

  const summary = diffSummary(before, data, LABELS);
  if (summary) logActivity('lead', id, 'Lead updated', summary, req.user.id);
  if (data.assigned_to && data.assigned_to !== before.assigned_to && data.assigned_to !== req.user.id) {
    notify(data.assigned_to, {
      type: 'lead_assigned', title: 'A lead was assigned to you',
      body: data.full_name, link: `#/leads/${id}`,
    });
  }
  res.json({ data: db.prepare(`${SELECT} WHERE l.id = ?`).get(id) });
}));

router.patch('/:id/status', canWrite('leads'), wrap((req, res) => {
  const id = Number(req.params.id);
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (!lead) notFound('Lead not found');
  const status = oneOf(req.body.status, LEAD_STATUSES, 'status');
  if (!status) bad('Status is required');

  db.prepare("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  logActivity('lead', id, 'Status changed', `${lead.status} → ${status}`, req.user.id);
  res.json({ data: db.prepare(`${SELECT} WHERE l.id = ?`).get(id) });
}));

router.delete('/:id', canWrite('leads'), wrap((req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(req.params.id));
  if (!lead) notFound('Lead not found');
  db.prepare('DELETE FROM leads WHERE id = ?').run(lead.id);
  logActivity('lead', lead.id, 'Lead deleted', lead.full_name, req.user.id);
  res.json({ ok: true });
}));

/** Convert a lead into a full customer profile, carrying its details across. */
router.post('/:id/convert', canWrite('customers'), wrap((req, res) => {
  const id = Number(req.params.id);
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (!lead) notFound('Lead not found');
  if (lead.customer_id) bad('This lead has already been converted to a customer');

  const body = req.body || {};
  const nameParts = String(lead.full_name || '').trim().split(/\s+/);
  const given = (body.given_name || nameParts.slice(0, -1).join(' ') || nameParts[0] || lead.full_name);
  const surname = (body.surname || (nameParts.length > 1 ? nameParts.at(-1) : null));

  const convert = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO customers (given_name, surname, dob, passport_no, phone, whatsapp, email,
                             address, nid, gender, nationality, service_type, country, notes,
                             partner_id, assigned_to, created_by)
      VALUES (@given_name, @surname, @dob, @passport_no, @phone, @whatsapp, @email,
              @address, @nid, @gender, @nationality, @service_type, @country, @notes,
              @partner_id, @assigned_to, @created_by)
    `).run({
      given_name: given,
      surname: surname || null,
      dob: body.dob || null,
      passport_no: body.passport_no || null,
      phone: lead.phone,
      whatsapp: lead.whatsapp,
      email: lead.email,
      address: lead.address,
      nid: body.nid || null,
      gender: body.gender || null,
      nationality: body.nationality || null,
      service_type: body.service_type || lead.service_type,
      country: body.country || lead.country,
      notes: lead.initial_note,
      partner_id: body.partner_id ? Number(body.partner_id) : null,
      assigned_to: lead.assigned_to,
      created_by: req.user.id,
    });
    const customerId = info.lastInsertRowid;
    db.prepare(`UPDATE leads SET customer_id = ?, status = 'Converted',
                converted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
      .run(customerId, id);
    return customerId;
  });

  const customerId = convert();
  logActivity('lead', id, 'Converted to customer', `Customer #${customerId}`, req.user.id);
  logActivity('customer', customerId, 'Customer created from lead', `Lead #${id} — ${lead.full_name}`, req.user.id);
  res.status(201).json({ data: { customer_id: customerId } });
}));

module.exports = router;
