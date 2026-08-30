'use strict';
const express = require('express');
const { db } = require('../db');
const vocab = require('../vocab');
const { requireAuth, canWrite } = require('../auth');
const {
  wrap, bad, notFound, pick, requireFields, oneOf, paging, orderBy, conditions,
  logActivity, notify, diffSummary, HttpError,
} = require('../helpers');
const {
  FILE_STATUSES, ACTIVE_FILE_STATUSES, CHECKLIST_STATUSES,
  DEFAULT_CHECKLIST_ITEMS, PAYMENT_STATUSES,
} = require('../constants');

const router = express.Router();
router.use(requireAuth);

const FIELDS = [
  'customer_id', 'partner_id', 'country', 'service_type', 'file_type', 'application_type',
  'submission_date', 'stage', 'status', 'assigned_to', 'interview_date', 'embassy_date',
  'completion_date', 'payment_status', 'remarks',
];

const LABELS = {
  country: 'Country', service_type: 'Service', file_type: 'File type',
  application_type: 'Application type', submission_date: 'Submission date',
  stage: 'Processing stage', status: 'Status', assigned_to: 'Assigned staff',
  interview_date: 'Interview date', embassy_date: 'Embassy/VFS date',
  completion_date: 'Completion date', payment_status: 'Payment status', remarks: 'Remarks',
  partner_id: 'B2B partner',
};

const SELECT = `
  SELECT f.*, trim(c.given_name || ' ' || COALESCE(c.surname,'')) AS customer_name,
         c.passport_no, c.phone AS customer_phone, c.email AS customer_email,
         p.partner_name, u.name AS assigned_name, cb.name AS created_by_name,
         (SELECT COUNT(*) FROM document_checklist dc
           WHERE dc.case_file_id = f.id AND dc.status = 'Missing') AS missing_documents,
         (SELECT COUNT(*) FROM documents d
           WHERE d.entity_type = 'case_file' AND d.entity_id = f.id) AS document_count
  FROM case_files f
  LEFT JOIN customers c ON c.id = f.customer_id
  LEFT JOIN partners p ON p.id = f.partner_id
  LEFT JOIN users u ON u.id = f.assigned_to
  LEFT JOIN users cb ON cb.id = f.created_by
`;

/**
 * Reference numbers look like DF-2026-0007 and never reuse a retired number.
 * The "DF" part is the `file_prefix` setting, so a company can use its own.
 */
function nextReferenceNo() {
  const year = new Date().getFullYear();
  const prefix = `${vocab.setting('file_prefix', 'DF')}-${year}-`;
  const last = db.prepare(
    'SELECT reference_no FROM case_files WHERE reference_no LIKE ? ORDER BY id DESC LIMIT 1'
  ).get(`${prefix}%`);
  const seq = last ? Number(String(last.reference_no).slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

function guardPartnerScope(req, file) {
  if (req.user.role === 'partner' && file.partner_id !== req.user.partner_id) {
    throw new HttpError(403, 'You can only view files submitted under your account');
  }
}

router.get('/', wrap((req, res) => {
  const q = req.query;
  const w = conditions();
  if (req.user.role === 'partner') w.add('f.partner_id = ?', req.user.partner_id || -1);
  if (q.search) {
    const like = `%${q.search}%`;
    w.add(`(c.given_name LIKE ? OR c.surname LIKE ? OR c.passport_no LIKE ?
            OR f.reference_no LIKE ? OR c.phone LIKE ? OR p.partner_name LIKE ?)`,
      like, like, like, like, like, like);
  }
  w.addIf(q.status, 'f.status = ?');
  w.addIf(q.stage, 'f.stage = ?');
  w.addIf(q.country, 'f.country = ?');
  w.addIf(q.service_type, 'f.service_type = ?');
  w.addIf(q.partner_id, 'f.partner_id = ?', Number(q.partner_id));
  w.addIf(q.assigned_to, 'f.assigned_to = ?', Number(q.assigned_to));
  w.addIf(q.payment_status, 'f.payment_status = ?');
  w.addIf(q.date_from, 'date(f.created_at) >= date(?)');
  w.addIf(q.date_to, 'date(f.created_at) <= date(?)');
  if (q.active === '1') {
    w.add(`f.status IN (${ACTIVE_FILE_STATUSES.map(() => '?').join(',')})`, ...ACTIVE_FILE_STATUSES);
  }

  const { limit, offset, page } = paging(q);
  const sort = orderBy(q, ['f.created_at', 'f.submission_date', 'f.interview_date', 'f.status'], 'f.created_at');
  const total = db.prepare(`
    SELECT COUNT(*) n FROM case_files f
    LEFT JOIN customers c ON c.id = f.customer_id
    LEFT JOIN partners p ON p.id = f.partner_id
    ${w.where()}
  `).get(...w.params).n;
  const data = db.prepare(`${SELECT} ${w.where()} ORDER BY ${sort} LIMIT ? OFFSET ?`)
    .all(...w.params, limit, offset);
  res.json({ data, total, page, limit });
}));

router.get('/:id', wrap((req, res) => {
  const file = db.prepare(`${SELECT} WHERE f.id = ?`).get(Number(req.params.id));
  if (!file) notFound('File not found');
  guardPartnerScope(req, file);

  const checklist = db.prepare(
    'SELECT * FROM document_checklist WHERE case_file_id = ? ORDER BY id'
  ).all(file.id);
  const documents = db.prepare(`
    SELECT d.*, u.name AS uploaded_by_name FROM documents d
    LEFT JOIN users u ON u.id = d.uploaded_by
    WHERE d.entity_type = 'case_file' AND d.entity_id = ? ORDER BY d.created_at DESC
  `).all(file.id);
  const invoices = db.prepare(
    'SELECT * FROM invoices WHERE case_file_id = ? ORDER BY issue_date DESC'
  ).all(file.id);

  res.json({ data: file, checklist, documents, invoices });
}));

router.post('/', canWrite('files'), wrap((req, res) => {
  requireFields(req.body, ['customer_id']);
  const data = pick(req.body, FIELDS);
  oneOf(data.status, vocab.values('file_status'), 'status');
  oneOf(data.payment_status, PAYMENT_STATUSES, 'payment status');
  data.status ||= 'Draft';
  data.payment_status ||= 'Unpaid';
  data.customer_id = Number(data.customer_id);
  data.partner_id = data.partner_id ? Number(data.partner_id) : null;
  data.assigned_to = data.assigned_to ? Number(data.assigned_to) : req.user.id;

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(data.customer_id);
  if (!customer) bad('The selected customer does not exist');
  // Fall back to the customer's own country/service when the file leaves them blank.
  data.country ||= customer.country;
  data.service_type ||= customer.service_type;
  data.partner_id ||= customer.partner_id;

  const create = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO case_files (reference_no, customer_id, partner_id, country, service_type,
        file_type, application_type, submission_date, stage, status, assigned_to,
        interview_date, embassy_date, completion_date, payment_status, remarks, created_by)
      VALUES (@reference_no, @customer_id, @partner_id, @country, @service_type,
        @file_type, @application_type, @submission_date, @stage, @status, @assigned_to,
        @interview_date, @embassy_date, @completion_date, @payment_status, @remarks, @created_by)
    `).run({
      ...data,
      reference_no: req.body.reference_no || nextReferenceNo(),
      created_by: req.user.id,
    });
    const id = info.lastInsertRowid;
    // Seed the standard document checklist so nothing is silently forgotten.
    const add = db.prepare('INSERT INTO document_checklist (case_file_id, name) VALUES (?, ?)');
    for (const name of vocab.values('checklist_item')) add.run(id, name);
    return id;
  });

  const id = create();
  const file = db.prepare(`${SELECT} WHERE f.id = ?`).get(id);
  logActivity('case_file', id, 'File created', `${file.reference_no} · ${file.customer_name}`, req.user.id);
  logActivity('customer', data.customer_id, 'File opened', file.reference_no, req.user.id);
  if (data.partner_id) logActivity('partner', data.partner_id, 'File submitted', file.reference_no, req.user.id);
  res.status(201).json({ data: file });
}));

/**
 * Section 8.3 — enter a file directly under a B2B partner. Creates (or reuses,
 * by passport number) the customer record and opens the file in one step.
 */
router.post('/partner-entry', canWrite('files'), wrap((req, res) => {
  requireFields(req.body, ['partner_id', 'given_name']);
  const b = req.body;
  const partnerId = Number(b.partner_id);
  if (!db.prepare('SELECT 1 FROM partners WHERE id = ?').get(partnerId)) bad('Partner not found');
  oneOf(b.status || null, vocab.values('file_status'), 'status');

  const run = db.transaction(() => {
    let customer = b.passport_no
      ? db.prepare('SELECT * FROM customers WHERE passport_no = ?').get(String(b.passport_no).trim())
      : null;

    if (!customer) {
      const info = db.prepare(`
        INSERT INTO customers (given_name, surname, dob, passport_no, phone, email, address,
          country, service_type, notes, partner_id, assigned_to, created_by)
        VALUES (@given_name, @surname, @dob, @passport_no, @phone, @email, @address,
          @country, @service_type, @notes, @partner_id, @assigned_to, @created_by)
      `).run({
        given_name: b.given_name, surname: b.surname || null, dob: b.dob || null,
        passport_no: b.passport_no || null, phone: b.phone || null, email: b.email || null,
        address: b.address || null, country: b.country || null,
        service_type: b.service_type || null, notes: b.notes || null,
        partner_id: partnerId, assigned_to: req.user.id, created_by: req.user.id,
      });
      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
    }

    const fileInfo = db.prepare(`
      INSERT INTO case_files (reference_no, customer_id, partner_id, country, service_type,
        status, assigned_to, remarks, created_by)
      VALUES (@reference_no, @customer_id, @partner_id, @country, @service_type,
        @status, @assigned_to, @remarks, @created_by)
    `).run({
      reference_no: b.reference_no || nextReferenceNo(),
      customer_id: customer.id, partner_id: partnerId,
      country: b.country || customer.country,
      service_type: b.service_type || customer.service_type,
      status: b.status || 'Draft', assigned_to: req.user.id,
      remarks: b.notes || null, created_by: req.user.id,
    });
    const fileId = fileInfo.lastInsertRowid;
    const add = db.prepare('INSERT INTO document_checklist (case_file_id, name) VALUES (?, ?)');
    for (const name of vocab.values('checklist_item')) add.run(fileId, name);
    return { customerId: customer.id, fileId };
  });

  const { customerId, fileId } = run();
  const file = db.prepare(`${SELECT} WHERE f.id = ?`).get(fileId);
  logActivity('partner', partnerId, 'Partner file entry', `${file.reference_no} · ${file.customer_name}`, req.user.id);
  logActivity('case_file', fileId, 'File created via partner entry', file.reference_no, req.user.id);
  res.status(201).json({ data: file, customer_id: customerId });
}));

router.put('/:id', canWrite('files'), wrap((req, res) => {
  const id = Number(req.params.id);
  const before = db.prepare('SELECT * FROM case_files WHERE id = ?').get(id);
  if (!before) notFound('File not found');
  const data = pick(req.body, FIELDS);
  oneOf(data.status, vocab.values('file_status'), 'status');
  oneOf(data.payment_status, PAYMENT_STATUSES, 'payment status');
  data.status ||= before.status;
  data.payment_status ||= before.payment_status;
  data.customer_id = data.customer_id ? Number(data.customer_id) : before.customer_id;
  data.partner_id = data.partner_id ? Number(data.partner_id) : null;
  data.assigned_to = data.assigned_to ? Number(data.assigned_to) : null;

  db.prepare(`
    UPDATE case_files SET customer_id=@customer_id, partner_id=@partner_id, country=@country,
      service_type=@service_type, file_type=@file_type, application_type=@application_type,
      submission_date=@submission_date, stage=@stage, status=@status, assigned_to=@assigned_to,
      interview_date=@interview_date, embassy_date=@embassy_date, completion_date=@completion_date,
      payment_status=@payment_status, remarks=@remarks, updated_at=datetime('now')
    WHERE id=@id
  `).run({ ...data, id });

  const summary = diffSummary(before, data, LABELS);
  if (summary) logActivity('case_file', id, 'File updated', summary, req.user.id);
  if (data.assigned_to && data.assigned_to !== before.assigned_to && data.assigned_to !== req.user.id) {
    notify(data.assigned_to, {
      type: 'file_assigned', title: 'A file was assigned to you',
      body: before.reference_no, link: `#/files/${id}`,
    });
  }
  res.json({ data: db.prepare(`${SELECT} WHERE f.id = ?`).get(id) });
}));

router.patch('/:id/status', canWrite('files'), wrap((req, res) => {
  const id = Number(req.params.id);
  const file = db.prepare('SELECT * FROM case_files WHERE id = ?').get(id);
  if (!file) notFound('File not found');
  const status = oneOf(req.body.status, vocab.values('file_status'), 'status');
  if (!status) bad('Status is required');

  const patch = { status, id, completion_date: file.completion_date };
  // Closing statuses stamp a completion date automatically if none was set.
  if (['Completed', 'Delivered', 'Approved', 'Rejected'].includes(status) && !file.completion_date) {
    patch.completion_date = new Date().toISOString().slice(0, 10);
  }
  db.prepare(`UPDATE case_files SET status = @status, completion_date = @completion_date,
              updated_at = datetime('now') WHERE id = @id`).run(patch);

  logActivity('case_file', id, 'Status changed', `${file.status} → ${status}`, req.user.id);
  if (file.customer_id) logActivity('customer', file.customer_id, 'File status changed',
    `${file.reference_no}: ${file.status} → ${status}`, req.user.id);
  if (file.partner_id) logActivity('partner', file.partner_id, 'File status changed',
    `${file.reference_no}: ${file.status} → ${status}`, req.user.id);
  if (file.assigned_to && file.assigned_to !== req.user.id) {
    notify(file.assigned_to, {
      type: 'file_status', title: `File ${file.reference_no} is now ${status}`,
      body: `Changed by ${req.user.name}`, link: `#/files/${id}`,
    });
  }
  res.json({ data: db.prepare(`${SELECT} WHERE f.id = ?`).get(id) });
}));

router.delete('/:id', canWrite('files'), wrap((req, res) => {
  const file = db.prepare('SELECT * FROM case_files WHERE id = ?').get(Number(req.params.id));
  if (!file) notFound('File not found');
  db.prepare('DELETE FROM case_files WHERE id = ?').run(file.id);
  logActivity('case_file', file.id, 'File deleted', file.reference_no, req.user.id);
  res.json({ ok: true });
}));

/* --------------------------- document checklist --------------------------- */

router.post('/:id/checklist', canWrite('files'), wrap((req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM case_files WHERE id = ?').get(id)) notFound('File not found');
  requireFields(req.body, ['name']);
  const info = db.prepare('INSERT INTO document_checklist (case_file_id, name, note) VALUES (?, ?, ?)')
    .run(id, String(req.body.name).trim(), req.body.note || null);
  logActivity('case_file', id, 'Checklist item added', req.body.name, req.user.id);
  res.status(201).json({ data: db.prepare('SELECT * FROM document_checklist WHERE id = ?').get(info.lastInsertRowid) });
}));

router.patch('/:id/checklist/:itemId', canWrite('files'), wrap((req, res) => {
  const itemId = Number(req.params.itemId);
  const item = db.prepare('SELECT * FROM document_checklist WHERE id = ? AND case_file_id = ?')
    .get(itemId, Number(req.params.id));
  if (!item) notFound('Checklist item not found');
  const status = oneOf(req.body.status, CHECKLIST_STATUSES, 'status') || item.status;
  db.prepare('UPDATE document_checklist SET status = ?, note = ? WHERE id = ?')
    .run(status, req.body.note ?? item.note, itemId);
  logActivity('case_file', item.case_file_id, 'Document checklist updated',
    `${item.name}: ${item.status} → ${status}`, req.user.id);
  res.json({ data: db.prepare('SELECT * FROM document_checklist WHERE id = ?').get(itemId) });
}));

router.delete('/:id/checklist/:itemId', canWrite('files'), wrap((req, res) => {
  const item = db.prepare('SELECT * FROM document_checklist WHERE id = ? AND case_file_id = ?')
    .get(Number(req.params.itemId), Number(req.params.id));
  if (!item) notFound('Checklist item not found');
  db.prepare('DELETE FROM document_checklist WHERE id = ?').run(item.id);
  res.json({ ok: true });
}));

module.exports = { router, nextReferenceNo };
