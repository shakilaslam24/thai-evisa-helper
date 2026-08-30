'use strict';
const express = require('express');
const { db } = require('../db');
const vocab = require('../vocab');
const { requireAuth, canWrite, seesAllMoney } = require('../auth');
const {
  wrap, bad, notFound, paging, orderBy, conditions, logActivity, toNumber, clean, todayISO,
} = require('../helpers');
const { PAYMENT_METHODS } = require('../constants');
const { recalcInvoice } = require('./invoices');

const router = express.Router();
router.use(requireAuth);

const SELECT = `
  SELECT pay.*, i.invoice_no, i.currency, i.total AS invoice_total, i.paid AS invoice_paid,
         trim(c.given_name || ' ' || COALESCE(c.surname,'')) AS customer_name,
         p.partner_name, u.name AS received_by_name
  FROM payments pay
  JOIN invoices i ON i.id = pay.invoice_id
  LEFT JOIN customers c ON c.id = i.customer_id
  LEFT JOIN partners p ON p.id = i.partner_id
  LEFT JOIN case_files f ON f.id = i.case_file_id
  LEFT JOIN users u ON u.id = pay.received_by
`;

router.get('/', wrap((req, res) => {
  const q = req.query;
  const w = conditions();
  if (req.user.role === 'partner') w.add('i.partner_id = ?', req.user.partner_id || -1);
  // Payments against the customers and files they handle, plus anything they
  // took in themselves, so a payment they recorded never vanishes from view.
  else if (!seesAllMoney(req.user)) {
    w.add('(pay.received_by = ? OR i.created_by = ? OR c.assigned_to = ? OR f.assigned_to = ?)',
      req.user.id, req.user.id, req.user.id, req.user.id);
  }
  if (q.search) {
    const like = `%${q.search}%`;
    w.add('(i.invoice_no LIKE ? OR c.given_name LIKE ? OR c.surname LIKE ? OR p.partner_name LIKE ? OR pay.reference LIKE ?)',
      like, like, like, like, like);
  }
  w.addIf(q.invoice_id, 'pay.invoice_id = ?', Number(q.invoice_id));
  w.addIf(q.method, 'pay.method = ?');
  w.addIf(q.partner_id, 'i.partner_id = ?', Number(q.partner_id));
  w.addIf(q.customer_id, 'i.customer_id = ?', Number(q.customer_id));
  w.addIf(q.date_from, 'date(pay.paid_at) >= date(?)');
  w.addIf(q.date_to, 'date(pay.paid_at) <= date(?)');

  const { limit, offset, page } = paging(q);
  const sort = orderBy(q, ['pay.paid_at', 'pay.amount', 'pay.created_at'], 'pay.paid_at');
  const total = db.prepare(`
    SELECT COUNT(*) n FROM payments pay
    JOIN invoices i ON i.id = pay.invoice_id
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN partners p ON p.id = i.partner_id
    LEFT JOIN case_files f ON f.id = i.case_file_id ${w.where()}
  `).get(...w.params).n;
  const collected = db.prepare(`
    SELECT COALESCE(SUM(pay.amount),0) s FROM payments pay
    JOIN invoices i ON i.id = pay.invoice_id
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN partners p ON p.id = i.partner_id
    LEFT JOIN case_files f ON f.id = i.case_file_id ${w.where()}
  `).get(...w.params).s;
  const data = db.prepare(`${SELECT} ${w.where()} ORDER BY ${sort}, pay.id DESC LIMIT ? OFFSET ?`)
    .all(...w.params, limit, offset);

  res.json({ data, total, page, limit, totals: { collected } });
}));

router.post('/', canWrite('payments'), wrap((req, res) => {
  const invoiceId = Number(req.body.invoice_id);
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!invoice) notFound('Invoice not found');
  if (invoice.status === 'Cancelled') bad('This invoice has been cancelled');

  const amount = toNumber(req.body.amount, 0);
  if (amount <= 0) bad('Payment amount must be greater than zero');
  const outstanding = Math.round((invoice.total - invoice.paid) * 100) / 100;
  if (amount - outstanding > 0.001) {
    bad(`That is more than the ${outstanding} still outstanding on this invoice`);
  }
  const method = clean(req.body.method) || 'Cash';
  if (!vocab.values('payment_method').includes(method)) bad(`Unknown payment method: "${method}"`);

  const info = db.prepare(`
    INSERT INTO payments (invoice_id, amount, method, paid_at, reference, note, received_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(invoiceId, amount, method, clean(req.body.paid_at) || todayISO(),
    clean(req.body.reference), clean(req.body.note), req.user.id);

  const updated = recalcInvoice(invoiceId);
  logActivity('invoice', invoiceId, 'Payment received',
    `${invoice.currency} ${amount} via ${method} — now ${updated.status}`, req.user.id);
  if (invoice.customer_id) logActivity('customer', invoice.customer_id, 'Payment received',
    `${invoice.invoice_no}: ${invoice.currency} ${amount}`, req.user.id);
  if (invoice.partner_id) logActivity('partner', invoice.partner_id, 'Payment received',
    `${invoice.invoice_no}: ${invoice.currency} ${amount}`, req.user.id);

  res.status(201).json({ data: db.prepare(`${SELECT} WHERE pay.id = ?`).get(info.lastInsertRowid) });
}));

router.delete('/:id', canWrite('payments'), wrap((req, res) => {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(Number(req.params.id));
  if (!payment) notFound('Payment not found');
  db.prepare('DELETE FROM payments WHERE id = ?').run(payment.id);
  recalcInvoice(payment.invoice_id);
  logActivity('invoice', payment.invoice_id, 'Payment removed', String(payment.amount), req.user.id);
  res.json({ ok: true });
}));

module.exports = router;
