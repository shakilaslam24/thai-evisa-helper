'use strict';
const express = require('express');
const { db } = require('../db');
const { requireAuth, canWrite, requireRole } = require('../auth');
const {
  wrap, notFound, pick, requireFields, paging, orderBy, conditions,
  logActivity, diffSummary, HttpError,
} = require('../helpers');

const router = express.Router();
router.use(requireAuth);

const FIELDS = [
  'given_name', 'surname', 'dob', 'passport_no', 'phone', 'whatsapp', 'email',
  'address', 'nid', 'gender', 'nationality', 'service_type', 'country', 'notes',
  'partner_id', 'assigned_to',
];

const LABELS = {
  given_name: 'Given name', surname: 'Surname', dob: 'Date of birth',
  passport_no: 'Passport no', phone: 'Phone', whatsapp: 'WhatsApp', email: 'Email',
  address: 'Address', nid: 'NID', gender: 'Gender', nationality: 'Nationality',
  service_type: 'Service', country: 'Country', partner_id: 'B2B partner',
  assigned_to: 'Assigned staff',
};

const SELECT = `
  SELECT c.*, trim(c.given_name || ' ' || COALESCE(c.surname,'')) AS full_name,
         u.name AS assigned_name, p.partner_name, cb.name AS created_by_name,
         (SELECT COUNT(*) FROM case_files f WHERE f.customer_id = c.id) AS file_count,
         (SELECT COALESCE(SUM(i.total - i.paid), 0) FROM invoices i
           WHERE i.customer_id = c.id AND i.status != 'Cancelled') AS outstanding_due
  FROM customers c
  LEFT JOIN users u ON u.id = c.assigned_to
  LEFT JOIN partners p ON p.id = c.partner_id
  LEFT JOIN users cb ON cb.id = c.created_by
`;

function guardPartnerScope(req, customer) {
  if (req.user.role === 'partner' && customer.partner_id !== req.user.partner_id) {
    throw new HttpError(403, 'You can only view customers submitted under your account');
  }
}

router.get('/', wrap((req, res) => {
  const q = req.query;
  const w = conditions();
  if (req.user.role === 'partner') w.add('c.partner_id = ?', req.user.partner_id || -1);
  if (q.search) {
    const like = `%${q.search}%`;
    w.add(`(c.given_name LIKE ? OR c.surname LIKE ? OR c.passport_no LIKE ?
            OR c.phone LIKE ? OR c.whatsapp LIKE ? OR c.email LIKE ?)`,
      like, like, like, like, like, like);
  }
  w.addIf(q.country, 'c.country = ?');
  w.addIf(q.service_type, 'c.service_type = ?');
  w.addIf(q.partner_id, 'c.partner_id = ?', Number(q.partner_id));
  w.addIf(q.assigned_to, 'c.assigned_to = ?', Number(q.assigned_to));
  w.addIf(q.date_from, 'date(c.created_at) >= date(?)');
  w.addIf(q.date_to, 'date(c.created_at) <= date(?)');

  const { limit, offset, page } = paging(q);
  const sort = orderBy(q, ['c.created_at', 'c.given_name', 'c.surname', 'c.country'], 'c.created_at');
  const total = db.prepare(`SELECT COUNT(*) n FROM customers c ${w.where()}`).get(...w.params).n;
  const data = db.prepare(`${SELECT} ${w.where()} ORDER BY ${sort} LIMIT ? OFFSET ?`)
    .all(...w.params, limit, offset);
  res.json({ data, total, page, limit });
}));

router.get('/:id', wrap((req, res) => {
  const customer = db.prepare(`${SELECT} WHERE c.id = ?`).get(Number(req.params.id));
  if (!customer) notFound('Customer not found');
  guardPartnerScope(req, customer);

  const files = db.prepare(`
    SELECT f.*, u.name AS assigned_name, p.partner_name
    FROM case_files f
    LEFT JOIN users u ON u.id = f.assigned_to
    LEFT JOIN partners p ON p.id = f.partner_id
    WHERE f.customer_id = ? ORDER BY f.created_at DESC
  `).all(customer.id);

  const invoices = db.prepare(
    'SELECT * FROM invoices WHERE customer_id = ? ORDER BY issue_date DESC, id DESC'
  ).all(customer.id);

  const documents = db.prepare(`
    SELECT * FROM documents WHERE entity_type = 'customer' AND entity_id = ?
    ORDER BY created_at DESC
  `).all(customer.id);

  const lead = db.prepare('SELECT id, full_name, source, created_at FROM leads WHERE customer_id = ?')
    .get(customer.id);

  res.json({ data: customer, files, invoices, documents, lead: lead || null });
}));

router.post('/', canWrite('customers'), wrap((req, res) => {
  requireFields(req.body, ['given_name']);
  const data = pick(req.body, FIELDS);
  data.partner_id = data.partner_id ? Number(data.partner_id) : null;
  data.assigned_to = data.assigned_to ? Number(data.assigned_to) : req.user.id;

  const info = db.prepare(`
    INSERT INTO customers (given_name, surname, dob, passport_no, phone, whatsapp, email,
      address, nid, gender, nationality, service_type, country, notes, partner_id,
      assigned_to, created_by)
    VALUES (@given_name, @surname, @dob, @passport_no, @phone, @whatsapp, @email,
      @address, @nid, @gender, @nationality, @service_type, @country, @notes, @partner_id,
      @assigned_to, @created_by)
  `).run({ ...data, created_by: req.user.id });

  logActivity('customer', info.lastInsertRowid, 'Customer created',
    `${data.given_name} ${data.surname || ''}`.trim(), req.user.id);
  res.status(201).json({ data: db.prepare(`${SELECT} WHERE c.id = ?`).get(info.lastInsertRowid) });
}));

router.put('/:id', canWrite('customers'), wrap((req, res) => {
  const id = Number(req.params.id);
  const before = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!before) notFound('Customer not found');
  const data = pick(req.body, FIELDS);
  data.partner_id = data.partner_id ? Number(data.partner_id) : null;
  data.assigned_to = data.assigned_to ? Number(data.assigned_to) : null;

  db.prepare(`
    UPDATE customers SET given_name=@given_name, surname=@surname, dob=@dob,
      passport_no=@passport_no, phone=@phone, whatsapp=@whatsapp, email=@email,
      address=@address, nid=@nid, gender=@gender, nationality=@nationality,
      service_type=@service_type, country=@country, notes=@notes, partner_id=@partner_id,
      assigned_to=@assigned_to, updated_at=datetime('now')
    WHERE id=@id
  `).run({ ...data, id });

  const summary = diffSummary(before, data, LABELS);
  if (summary) logActivity('customer', id, 'Customer updated', summary, req.user.id);
  res.json({ data: db.prepare(`${SELECT} WHERE c.id = ?`).get(id) });
}));

// customers -> case_files is ON DELETE CASCADE, so allowing this to anyone
// below admin would be a way around the file deletion rule.
router.delete('/:id', requireRole('admin'), wrap((req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(Number(req.params.id));
  if (!customer) notFound('Customer not found');
  db.prepare('DELETE FROM customers WHERE id = ?').run(customer.id);
  logActivity('customer', customer.id, 'Customer deleted',
    `${customer.given_name} ${customer.surname || ''}`.trim(), req.user.id);
  res.json({ ok: true });
}));

module.exports = router;
