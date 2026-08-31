'use strict';
const express = require('express');
const { db } = require('../db');
const { requireAuth, canWrite, requireRole } = require('../auth');
const {
  wrap, bad, notFound, pick, merge, requireFields, oneOf, paging, orderBy, conditions,
  logActivity, diffSummary, HttpError, archive, restore, clean, assertUnchanged,
} = require('../helpers');
const v = require('../validate');
const { PARTNER_STATUSES, ACTIVE_FILE_STATUSES } = require('../constants');

const router = express.Router();
router.use(requireAuth);

const FIELDS = [
  'partner_name', 'company_name', 'company_address', 'personal_address',
  'personal_phone', 'company_phone', 'whatsapp', 'email', 'trade_license',
  'nid_passport', 'commission_note', 'agreement_note', 'status',
];

const LABELS = {
  partner_name: 'Partner name', company_name: 'Company', company_address: 'Company address',
  personal_address: 'Personal address', personal_phone: 'Personal phone',
  company_phone: 'Company phone', whatsapp: 'WhatsApp', email: 'Email',
  trade_license: 'Trade license', nid_passport: 'NID/Passport',
  commission_note: 'Commission', agreement_note: 'Agreement', status: 'Status',
};

const ACTIVE_LIST = ACTIVE_FILE_STATUSES.map(() => '?').join(',');

function validatePartner(data) {
  data.partner_name = v.text(data.partner_name, 'Partner name', v.LIMITS.name);
  if (!data.partner_name) bad('A partner name is required');
  data.company_name = v.text(data.company_name, 'Company', v.LIMITS.name);
  data.email = v.email(data.email);
  data.personal_phone = v.phone(data.personal_phone, 'Personal phone');
  data.company_phone = v.phone(data.company_phone, 'Company phone');
  data.whatsapp = v.phone(data.whatsapp, 'WhatsApp');
  data.company_address = v.text(data.company_address, 'Company address', v.LIMITS.address);
  data.personal_address = v.text(data.personal_address, 'Personal address', v.LIMITS.address);
  data.trade_license = v.text(data.trade_license, 'Trade license', v.LIMITS.short);
  data.nid_passport = v.text(data.nid_passport, 'NID/Passport', v.LIMITS.short);
  data.commission_note = v.text(data.commission_note, 'Commission', v.LIMITS.notes);
  data.agreement_note = v.text(data.agreement_note, 'Agreement', v.LIMITS.notes);
  return data;
}

const SELECT = `
  SELECT p.*, u.name AS created_by_name,
    (SELECT COUNT(*) FROM case_files f WHERE f.partner_id = p.id AND f.deleted_at IS NULL) AS total_files,
    (SELECT COUNT(*) FROM case_files f WHERE f.partner_id = p.id AND f.deleted_at IS NULL
       AND f.status = 'Approved') AS approved_files,
    (SELECT COUNT(*) FROM case_files f WHERE f.partner_id = p.id AND f.deleted_at IS NULL
       AND f.status = 'Rejected') AS rejected_files,
    (SELECT COALESCE(SUM(i.total - i.paid), 0) FROM invoices i
      WHERE i.partner_id = p.id AND i.status != 'Cancelled'
        AND i.deleted_at IS NULL) AS outstanding_due
  FROM partners p
  LEFT JOIN users u ON u.id = p.created_by
`;

/** A partner-role login may only ever see its own record. */
function guardPartnerScope(req, partnerId) {
  if (req.user.role === 'partner' && req.user.partner_id !== partnerId) {
    throw new HttpError(403, 'You can only view your own partner account');
  }
}

router.get('/', wrap((req, res) => {
  const q = req.query;
  const w = conditions();
  if (req.user.role === 'partner') w.add('p.id = ?', req.user.partner_id || -1);
  if (q.archived === '1') w.add('p.deleted_at IS NOT NULL');
  else w.add('p.deleted_at IS NULL');
  if (q.search) {
    const like = `%${q.search}%`;
    w.add('(p.partner_name LIKE ? OR p.company_name LIKE ? OR p.personal_phone LIKE ? OR p.company_phone LIKE ? OR p.email LIKE ?)',
      like, like, like, like, like);
  }
  w.addIf(q.status, 'p.status = ?');

  const { limit, offset, page } = paging(q);
  const sort = orderBy(q, ['p.partner_name', 'p.created_at', 'p.status'], 'p.partner_name');
  const total = db.prepare(`SELECT COUNT(*) n FROM partners p ${w.where()}`).get(...w.params).n;
  const data = db.prepare(`${SELECT} ${w.where()} ORDER BY ${sort} LIMIT ? OFFSET ?`)
    .all(...w.params, limit, offset);
  res.json({ data, total, page, limit });
}));

/** Full partner dashboard: file mix, invoice totals, and recent communication. */
router.get('/:id', wrap((req, res) => {
  const id = Number(req.params.id);
  guardPartnerScope(req, id);
  const partner = db.prepare(`${SELECT} WHERE p.id = ?`).get(id);
  if (!partner) notFound('Partner not found');

  const byStatus = db.prepare(`SELECT status, COUNT(*) n FROM case_files
                               WHERE partner_id = ? AND deleted_at IS NULL
                               GROUP BY status`).all(id);
  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r.n]));
  const processing = db.prepare(
    `SELECT COUNT(*) n FROM case_files WHERE partner_id = ? AND deleted_at IS NULL
       AND status IN (${ACTIVE_LIST})`
  ).get(id, ...ACTIVE_FILE_STATUSES).n;

  const pendingDocs = db.prepare(`
    SELECT COUNT(*) n FROM document_checklist dc
    JOIN case_files f ON f.id = dc.case_file_id
    WHERE f.partner_id = ? AND f.deleted_at IS NULL AND dc.status = 'Missing'
  `).get(id).n;

  const invoices = db.prepare(`
    SELECT COUNT(*) count, COALESCE(SUM(total),0) billed, COALESCE(SUM(paid),0) paid
    FROM invoices WHERE partner_id = ? AND status != 'Cancelled' AND deleted_at IS NULL
  `).get(id);

  res.json({
    data: partner,
    summary: {
      total_files: partner.total_files,
      under_processing: processing,
      approved: counts.Approved || 0,
      rejected: counts.Rejected || 0,
      interview_called: counts['Interview Called'] || 0,
      documents_pending: counts['Documents Pending'] || 0,
      missing_documents: pendingDocs,
      by_status: counts,
      invoices_count: invoices.count,
      total_billed: invoices.billed,
      total_paid: invoices.paid,
      total_due: invoices.billed - invoices.paid,
    },
  });
}));

router.get('/:id/files', wrap((req, res) => {
  const id = Number(req.params.id);
  guardPartnerScope(req, id);
  const rows = db.prepare(`
    SELECT f.*, trim(c.given_name || ' ' || COALESCE(c.surname,'')) AS customer_name,
           c.passport_no, u.name AS assigned_name
    FROM case_files f
    LEFT JOIN customers c ON c.id = f.customer_id
    LEFT JOIN users u ON u.id = f.assigned_to
    WHERE f.partner_id = ? AND f.deleted_at IS NULL
    ORDER BY f.created_at DESC
  `).all(id);
  res.json({ data: rows });
}));

router.get('/:id/invoices', wrap((req, res) => {
  const id = Number(req.params.id);
  guardPartnerScope(req, id);
  const rows = db.prepare(`SELECT * FROM invoices WHERE partner_id = ? AND deleted_at IS NULL
                           ORDER BY issue_date DESC, id DESC`).all(id);
  res.json({ data: rows });
}));

router.get('/:id/payments', wrap((req, res) => {
  const id = Number(req.params.id);
  guardPartnerScope(req, id);
  const rows = db.prepare(`
    SELECT pay.*, i.invoice_no, u.name AS received_by_name
    FROM payments pay
    JOIN invoices i ON i.id = pay.invoice_id
    LEFT JOIN users u ON u.id = pay.received_by
    WHERE i.partner_id = ? AND i.deleted_at IS NULL
    ORDER BY pay.paid_at DESC, pay.id DESC
  `).all(id);
  res.json({ data: rows });
}));

router.post('/', canWrite('partners'), wrap((req, res) => {
  const data = validatePartner(pick(req.body, FIELDS));
  oneOf(data.status, PARTNER_STATUSES, 'status');
  data.status ||= 'Active';

  const info = db.prepare(`
    INSERT INTO partners (partner_name, company_name, company_address, personal_address,
      personal_phone, company_phone, whatsapp, email, trade_license, nid_passport,
      commission_note, agreement_note, status, created_by)
    VALUES (@partner_name, @company_name, @company_address, @personal_address,
      @personal_phone, @company_phone, @whatsapp, @email, @trade_license, @nid_passport,
      @commission_note, @agreement_note, @status, @created_by)
  `).run({ ...data, created_by: req.user.id });

  logActivity('partner', info.lastInsertRowid, 'Partner added',
    `${data.partner_name}${data.company_name ? ` · ${data.company_name}` : ''}`, req.user.id);
  res.status(201).json({ data: db.prepare(`${SELECT} WHERE p.id = ?`).get(info.lastInsertRowid) });
}));

router.put('/:id', canWrite('partners'), wrap((req, res) => {
  const id = Number(req.params.id);
  const before = db.prepare('SELECT * FROM partners WHERE id = ?').get(id);
  if (!before) notFound('Partner not found');
  if (before.deleted_at) bad('This partner is archived — restore them before editing');
  assertUnchanged(before, req.body, 'partner');
  const data = validatePartner(merge(before, req.body, FIELDS));
  oneOf(data.status, PARTNER_STATUSES, 'status');
  data.status ||= before.status;

  db.prepare(`
    UPDATE partners SET partner_name=@partner_name, company_name=@company_name,
      company_address=@company_address, personal_address=@personal_address,
      personal_phone=@personal_phone, company_phone=@company_phone, whatsapp=@whatsapp,
      email=@email, trade_license=@trade_license, nid_passport=@nid_passport,
      commission_note=@commission_note, agreement_note=@agreement_note, status=@status,
      updated_at=datetime('now','localtime'), updated_by=@updated_by, version=version+1
    WHERE id=@id
  `).run({ ...data, updated_by: req.user.id, id });

  const summary = diffSummary(before, data, LABELS);
  if (summary) logActivity('partner', id, 'Partner updated', summary, req.user.id);
  res.json({ data: db.prepare(`${SELECT} WHERE p.id = ?`).get(id) });
}));

/**
 * Archive rather than delete, and only an administrator may do it.
 *
 * Deleting a partner set partner_id to NULL on their invoices — and a partner
 * invoice has no customer either, so it was left billed to nobody at all while
 * still carrying its payments. Their files, customers and login lost the link
 * too. Archiving keeps every one of those relationships.
 */
router.delete('/:id', requireRole('admin'), wrap((req, res) => {
  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(Number(req.params.id));
  if (!partner) notFound('Partner not found');
  if (partner.deleted_at) bad('This partner is already archived');

  const owing = db.prepare(`SELECT COALESCE(SUM(total - paid),0) due FROM invoices
                            WHERE partner_id = ? AND status != 'Cancelled' AND deleted_at IS NULL`)
    .get(partner.id).due;
  if (owing > 0.001) {
    bad(`${partner.partner_name} still owes ${owing.toFixed(2)}. Settle or cancel their invoices `
      + 'before archiving the account.');
  }
  const openFiles = db.prepare(`SELECT COUNT(*) n FROM case_files WHERE partner_id = ?
                                AND deleted_at IS NULL AND status IN (${ACTIVE_LIST})`)
    .get(partner.id, ...ACTIVE_FILE_STATUSES).n;
  if (openFiles > 0) {
    bad(`${partner.partner_name} has ${openFiles} file(s) still in progress. Finish or reassign `
      + 'them first.');
  }

  archive('partners', partner.id, req.user.id, req.body?.reason);
  // Their login, if any, is switched off at the same time.
  db.prepare("UPDATE users SET active = 0 WHERE partner_id = ? AND role = 'partner'").run(partner.id);
  db.prepare(`DELETE FROM sessions WHERE user_id IN
              (SELECT id FROM users WHERE partner_id = ? AND role = 'partner')`).run(partner.id);

  logActivity('partner', partner.id, 'Partner archived',
    `${partner.partner_name}${partner.company_name ? ` · ${partner.company_name}` : ''}`
    + (req.body?.reason ? ` · reason: ${clean(req.body.reason)}` : ''), req.user.id);
  res.json({ ok: true });
}));

router.post('/:id/restore', requireRole('admin'), wrap((req, res) => {
  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(Number(req.params.id));
  if (!partner) notFound('Partner not found');
  if (!partner.deleted_at) bad('This partner is not archived');
  restore('partners', partner.id);
  logActivity('partner', partner.id, 'Partner restored', partner.partner_name, req.user.id);
  res.json({ data: db.prepare(`${SELECT} WHERE p.id = ?`).get(partner.id) });
}));

module.exports = router;
