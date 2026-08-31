'use strict';
const express = require('express');
const { db } = require('../db');
const { requireAuth, canWrite, requireRole } = require('../auth');
const {
  wrap, bad, notFound, pick, merge, requireFields, paging, orderBy, conditions,
  logActivity, diffSummary, HttpError, archive, restore, clean, assertUnchanged,
} = require('../helpers');
const v = require('../validate');
const vocab = require('../vocab');

const router = express.Router();
router.use(requireAuth);

const FIELDS = [
  'given_name', 'surname', 'dob', 'passport_no', 'passport_expiry', 'phone', 'whatsapp',
  'email', 'address', 'nid', 'gender', 'nationality', 'service_type', 'country', 'notes',
  'partner_id', 'assigned_to',
];

const GENDERS = ['Male', 'Female', 'Other'];

/**
 * Everything a customer record must survive before it is stored.
 *
 * Previously the only rule was that a given name was present, so an unreachable
 * email, a date of birth in the year 2099 and a 20,000-character address were all
 * accepted without complaint — and an unlisted country dropped silently out of
 * every country-wise report. The checks are permissive about formatting and
 * strict about impossibility; see server/validate.js.
 */
function validateCustomer(data) {
  data.given_name = v.text(data.given_name, 'Given name', v.LIMITS.name);
  data.surname = v.text(data.surname, 'Surname', v.LIMITS.name);
  if (!data.given_name) bad('A given name is required');

  data.email = v.email(data.email);
  data.phone = v.phone(data.phone, 'Phone number');
  data.whatsapp = v.phone(data.whatsapp, 'WhatsApp number');
  data.dob = v.birthDate(data.dob);
  data.passport_no = v.text(data.passport_no, 'Passport number', v.LIMITS.short);
  data.passport_expiry = v.expiryDate(data.passport_expiry, data.dob);
  data.nid = v.text(data.nid, 'NID', v.LIMITS.short);
  data.nationality = v.text(data.nationality, 'Nationality', v.LIMITS.short);
  data.address = v.text(data.address, 'Address', v.LIMITS.address);
  data.notes = v.text(data.notes, 'Notes', v.LIMITS.notes);
  data.gender = data.gender ? v.fromList(data.gender, GENDERS, 'Gender') : null;
  data.country = data.country ? v.fromList(data.country, vocab.values('country'), 'Country') : null;
  data.service_type = data.service_type
    ? v.fromList(data.service_type, vocab.values('service'), 'Service') : null;
  return data;
}

/**
 * A passport number identifies one traveller. The database enforces this too,
 * but checking here lets the message name the customer already holding it.
 */
function assertPassportFree(passportNo, exceptId) {
  if (!passportNo) return;
  const clash = db.prepare(`
    SELECT id, given_name, surname FROM customers
    WHERE upper(trim(passport_no)) = upper(trim(?)) AND deleted_at IS NULL AND id != ?
  `).get(passportNo, exceptId || -1);
  if (clash) {
    bad(`Passport ${passportNo} is already on file for ${clash.given_name} ${clash.surname || ''}`.trim()
      + ` (customer #${clash.id}). Open that record instead, or correct the number.`);
  }
}

const LABELS = {
  given_name: 'Given name', surname: 'Surname', dob: 'Date of birth',
  passport_no: 'Passport no', passport_expiry: 'Passport expiry',
  phone: 'Phone', whatsapp: 'WhatsApp', email: 'Email',
  address: 'Address', nid: 'NID', gender: 'Gender', nationality: 'Nationality',
  service_type: 'Service', country: 'Country', partner_id: 'B2B partner',
  assigned_to: 'Assigned staff',
};

const SELECT = `
  SELECT c.*, trim(c.given_name || ' ' || COALESCE(c.surname,'')) AS full_name,
         u.name AS assigned_name, p.partner_name, cb.name AS created_by_name,
         (SELECT COUNT(*) FROM case_files f WHERE f.customer_id = c.id AND f.deleted_at IS NULL) AS file_count,
         (SELECT COALESCE(SUM(i.total - i.paid), 0) FROM invoices i
           WHERE i.customer_id = c.id AND i.status != 'Cancelled'
             AND i.deleted_at IS NULL) AS outstanding_due
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
  if (q.archived === '1') w.add('c.deleted_at IS NOT NULL');
  else w.add('c.deleted_at IS NULL');
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
    WHERE f.customer_id = ? AND f.deleted_at IS NULL ORDER BY f.created_at DESC
  `).all(customer.id);

  const invoices = db.prepare(
    'SELECT * FROM invoices WHERE customer_id = ? AND deleted_at IS NULL ORDER BY issue_date DESC, id DESC'
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
  const data = validateCustomer(pick(req.body, FIELDS));
  assertPassportFree(data.passport_no, null);
  data.partner_id = data.partner_id ? Number(data.partner_id) : null;
  data.assigned_to = data.assigned_to ? Number(data.assigned_to) : req.user.id;

  const info = db.prepare(`
    INSERT INTO customers (given_name, surname, dob, passport_no, passport_expiry, phone,
      whatsapp, email, address, nid, gender, nationality, service_type, country, notes,
      partner_id, assigned_to, created_by)
    VALUES (@given_name, @surname, @dob, @passport_no, @passport_expiry, @phone,
      @whatsapp, @email, @address, @nid, @gender, @nationality, @service_type, @country, @notes,
      @partner_id, @assigned_to, @created_by)
  `).run({ ...data, created_by: req.user.id });

  logActivity('customer', info.lastInsertRowid, 'Customer created',
    `${data.given_name} ${data.surname || ''}`.trim(), req.user.id);
  res.status(201).json({ data: db.prepare(`${SELECT} WHERE c.id = ?`).get(info.lastInsertRowid) });
}));

router.put('/:id', canWrite('customers'), wrap((req, res) => {
  const id = Number(req.params.id);
  const before = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!before) notFound('Customer not found');
  if (before.deleted_at) bad('This customer is archived — restore them before editing');
  assertUnchanged(before, req.body, 'customer');
  // Absent fields keep what is stored; only what the request mentions changes.
  const data = validateCustomer(merge(before, req.body, FIELDS));
  assertPassportFree(data.passport_no, id);
  data.partner_id = data.partner_id ? Number(data.partner_id) : null;
  data.assigned_to = data.assigned_to ? Number(data.assigned_to) : null;

  db.prepare(`
    UPDATE customers SET given_name=@given_name, surname=@surname, dob=@dob,
      passport_no=@passport_no, passport_expiry=@passport_expiry, phone=@phone,
      whatsapp=@whatsapp, email=@email, address=@address, nid=@nid, gender=@gender,
      nationality=@nationality, service_type=@service_type, country=@country, notes=@notes,
      partner_id=@partner_id, assigned_to=@assigned_to,
      updated_at=datetime('now','localtime'), updated_by=@updated_by, version=version+1
    WHERE id=@id
  `).run({ ...data, updated_by: req.user.id, id });

  const summary = diffSummary(before, data, LABELS);
  if (summary) logActivity('customer', id, 'Customer updated', summary, req.user.id);
  res.json({ data: db.prepare(`${SELECT} WHERE c.id = ?`).get(id) });
}));

/**
 * Archive rather than delete.
 *
 * Deleting a customer used to cascade away every case file, leave their
 * follow-ups, meetings and uploaded documents pointing at nothing, and strand
 * their invoices with no one to bill. The record and everything hanging off it
 * now stays; it simply disappears from the working views, and an administrator
 * can bring it back.
 */
router.delete('/:id', requireRole('admin'), wrap((req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(Number(req.params.id));
  if (!customer) notFound('Customer not found');
  if (customer.deleted_at) bad('This customer is already archived');

  const owing = db.prepare(`SELECT COALESCE(SUM(total - paid),0) due, COALESCE(SUM(paid),0) paid
                            FROM invoices WHERE customer_id = ?
                              AND status != 'Cancelled' AND deleted_at IS NULL`).get(customer.id);
  if (owing.due > 0.001) {
    bad(`This customer still owes ${owing.due.toFixed(2)}. Settle, refund or cancel their `
      + 'invoices first — archiving would take the debt off the books.');
  }

  const name = `${customer.given_name} ${customer.surname || ''}`.trim();
  const files = db.prepare('SELECT id FROM case_files WHERE customer_id = ? AND deleted_at IS NULL')
    .all(customer.id);

  db.transaction(() => {
    archive('customers', customer.id, req.user.id, req.body?.reason);
    // Their open files go with them, so nothing is left pointing at a client
    // who is no longer in the system.
    for (const f of files) archive('case_files', f.id, req.user.id, `Customer ${name} archived`);
  })();

  logActivity('customer', customer.id, 'Customer archived',
    `${name}${files.length ? ` · ${files.length} file(s) archived with them` : ''}`
    + (req.body?.reason ? ` · reason: ${clean(req.body.reason)}` : ''), req.user.id);
  res.json({ ok: true, archived_files: files.length });
}));

router.post('/:id/restore', requireRole('admin'), wrap((req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(Number(req.params.id));
  if (!customer) notFound('Customer not found');
  if (!customer.deleted_at) bad('This customer is not archived');
  const name = `${customer.given_name} ${customer.surname || ''}`.trim();
  db.transaction(() => {
    restore('customers', customer.id);
    const files = db.prepare(`SELECT id FROM case_files WHERE customer_id = ?
                              AND delete_reason = ?`).all(customer.id, `Customer ${name} archived`);
    for (const f of files) restore('case_files', f.id);
  })();
  logActivity('customer', customer.id, 'Customer restored', name, req.user.id);
  res.json({ data: db.prepare(`${SELECT} WHERE c.id = ?`).get(customer.id) });
}));

module.exports = router;
