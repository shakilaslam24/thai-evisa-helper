'use strict';
const express = require('express');
const { db } = require('../db');
const vocab = require('../vocab');
const { requireAuth, canWrite, requireRole, seesAllMoney } = require('../auth');
const {
  wrap, bad, notFound, paging, orderBy, conditions, logActivity, toNumber, clean, todayISO,
} = require('../helpers');
const v = require('../validate');
const { PAYMENT_METHODS } = require('../constants');
const { recalcInvoice } = require('./invoices');

const router = express.Router();
router.use(requireAuth);

const SELECT = `
  SELECT pay.*, i.invoice_no, i.currency, i.total AS invoice_total, i.paid AS invoice_paid,
         orig.paid_at AS reversed_paid_at, orig.method AS reversed_method,
         trim(c.given_name || ' ' || COALESCE(c.surname,'')) AS customer_name,
         p.partner_name, u.name AS received_by_name
  FROM payments pay
  JOIN invoices i ON i.id = pay.invoice_id
  LEFT JOIN customers c ON c.id = i.customer_id
  LEFT JOIN partners p ON p.id = i.partner_id
  LEFT JOIN case_files f ON f.id = i.case_file_id
  LEFT JOIN users u ON u.id = pay.received_by
  LEFT JOIN payments orig ON orig.id = pay.reversal_of
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
  w.add('i.deleted_at IS NULL');
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

/**
 * Stops one payment being booked twice, without stopping two real ones.
 *
 * The browser sends a key generated when the Record payment form opens, so a
 * double-clicked submit carries the same key and the second is refused. A caller
 * that sends no key gets a narrower net: an identical payment — same invoice,
 * amount, method and reference — recorded in the last few seconds is treated as
 * the same click.
 *
 * The window is deliberately short. An earlier version bucketed by the minute
 * and rejected a genuine run of small instalments entered back to back, which is
 * a normal thing to do at a counter.
 */
const DUPLICATE_WINDOW_SECONDS = 15;

function assertNotDuplicate(req, invoiceId, amount, method, reference) {
  if (clean(req.headers['idempotency-key'] || req.body.idempotency_key)) return;  // the key handles it
  const recent = db.prepare(`
    SELECT id, created_at FROM payments
    WHERE invoice_id = ? AND amount = ? AND method = ?
      AND COALESCE(reference,'') = COALESCE(?,'')
      AND created_at >= datetime('now','localtime', ?)
    ORDER BY id DESC LIMIT 1
  `).get(invoiceId, amount, method, reference, `-${DUPLICATE_WINDOW_SECONDS} seconds`);
  if (recent) {
    bad('An identical payment was recorded a moment ago. Refresh the invoice to see it — '
      + 'if this really is a second payment of the same amount, add a reference to tell them apart.');
  }
}

router.post('/', canWrite('payments'), wrap((req, res) => {
  const invoiceId = Number(req.body.invoice_id);
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!invoice) notFound('Invoice not found');
  if (invoice.deleted_at) bad('This invoice has been archived');
  if (invoice.status === 'Cancelled') bad('This invoice has been cancelled');

  const amount = v.money(toNumber(req.body.amount, 0), 'Payment amount');
  if (amount <= 0) bad('Payment amount must be greater than zero');
  const outstanding = Math.round((invoice.total - invoice.paid) * 100) / 100;
  if (amount - outstanding > 0.001) {
    bad(`That is more than the ${outstanding} still outstanding on this invoice`);
  }
  const method = vocab.values('payment_method').includes(clean(req.body.method) || 'Cash')
    ? (clean(req.body.method) || 'Cash') : null;
  if (!method) bad(`Unknown payment method: "${clean(req.body.method)}"`);

  const paidAt = v.date(req.body.paid_at, 'Payment date') || todayISO();
  const reference = v.text(req.body.reference, 'Reference', v.LIMITS.short);
  const note = v.text(req.body.note, 'Note', v.LIMITS.line);

  assertNotDuplicate(req, invoiceId, amount, method, reference);
  // Scoped to the invoice: a key only ever has to be unique within the bill it
  // belongs to, so one client's key can never block a payment on a different
  // invoice.
  const rawKey = clean(req.headers['idempotency-key'] || req.body.idempotency_key);
  const suppliedKey = rawKey ? `${invoiceId}:${rawKey}` : null;

  let info;
  try {
    info = db.prepare(`
      INSERT INTO payments (invoice_id, amount, method, paid_at, reference, note, received_by, idempotency_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(invoiceId, amount, method, paidAt, reference, note, req.user.id, suppliedKey);
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE' && String(err.message).includes('idempotency_key')) {
      bad('That payment has already been recorded — refresh the invoice to see it');
    }
    throw err;
  }

  const updated = recalcInvoice(invoiceId);
  logActivity('invoice', invoiceId, 'Payment received',
    `${invoice.currency} ${amount.toFixed(2)} via ${method} on ${paidAt}`
    + `${reference ? ` · ref ${reference}` : ''} · received by ${req.user.name}`
    + ` — invoice now ${updated.status}`, req.user.id);
  if (invoice.customer_id) logActivity('customer', invoice.customer_id, 'Payment received',
    `${invoice.invoice_no}: ${invoice.currency} ${amount}`, req.user.id);
  if (invoice.partner_id) logActivity('partner', invoice.partner_id, 'Payment received',
    `${invoice.invoice_no}: ${invoice.currency} ${amount}`, req.user.id);

  res.status(201).json({ data: db.prepare(`${SELECT} WHERE pay.id = ?`).get(info.lastInsertRowid) });
}));

/**
 * Refund some or all of a payment.
 *
 * This is how money goes back, and it is available to whoever is at the desk —
 * a cancelled trip or a rejected visa is ordinary business, not an exception.
 * The refund is a second row with a negative amount pointing at the payment it
 * reverses, so the original receipt is never touched: the books show that BDT
 * 5,000 came in on Tuesday and BDT 5,000 went back on Friday, which is the truth.
 */
router.post('/:id/refund', canWrite('payments'), wrap((req, res) => {
  const original = db.prepare('SELECT * FROM payments WHERE id = ?').get(Number(req.params.id));
  if (!original) notFound('Payment not found');
  if (original.amount < 0) bad('This row is itself a refund and cannot be refunded');

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(original.invoice_id);
  const alreadyRefunded = db.prepare(
    'SELECT COALESCE(SUM(-amount),0) s FROM payments WHERE reversal_of = ?'
  ).get(original.id).s;
  const refundable = Math.round((original.amount - alreadyRefunded) * 100) / 100;
  if (refundable <= 0) bad('This payment has already been refunded in full');

  const amount = req.body.amount === undefined || req.body.amount === null || req.body.amount === ''
    ? refundable
    : v.money(toNumber(req.body.amount, 0), 'Refund amount');
  if (amount <= 0) bad('A refund must be greater than zero');
  if (amount - refundable > 0.001) {
    bad(`Only ${invoice.currency} ${refundable.toFixed(2)} of this payment can still be refunded`);
  }
  const reason = v.text(req.body.reason, 'Reason', v.LIMITS.line);
  if (!reason) bad('Please say why the money is being refunded — it goes on the record');

  const method = clean(req.body.method) || original.method;
  if (!vocab.values('payment_method').includes(method)) bad(`Unknown refund method: "${method}"`);

  const info = db.prepare(`
    INSERT INTO payments (invoice_id, amount, method, paid_at, reference, note,
                          received_by, reversal_of, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(original.invoice_id, -amount, method,
    v.date(req.body.refunded_at, 'Refund date') || todayISO(),
    v.text(req.body.reference, 'Reference', v.LIMITS.short),
    `Refund of payment #${original.id}`, req.user.id, original.id, reason);

  const updated = recalcInvoice(original.invoice_id);
  logActivity('invoice', original.invoice_id, 'Refund issued',
    `${invoice.currency} ${amount.toFixed(2)} returned via ${method} against payment #${original.id} `
    + `(${invoice.currency} ${original.amount.toFixed(2)} taken on ${original.paid_at}`
    + `${original.reference ? `, ref ${original.reference}` : ''}) · reason: ${reason} `
    + `· by ${req.user.name} — invoice now ${updated.status}`, req.user.id);
  res.status(201).json({ data: db.prepare(`${SELECT} WHERE pay.id = ?`).get(info.lastInsertRowid) });
}));

/**
 * Removing a payment row outright is now an administrator's correction of a
 * mis-keyed entry, not a way to make money disappear — everyone else refunds.
 * Everything about the row goes into the log first, so the deletion itself is
 * reconstructable.
 */
router.delete('/:id', requireRole('admin'), wrap((req, res) => {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(Number(req.params.id));
  if (!payment) notFound('Payment not found');
  const invoice = db.prepare('SELECT invoice_no, currency FROM invoices WHERE id = ?').get(payment.invoice_id);
  const refunds = db.prepare('SELECT COUNT(*) n FROM payments WHERE reversal_of = ?').get(payment.id).n;
  if (refunds > 0) bad('This payment has refunds recorded against it — remove those first');
  const receiver = db.prepare('SELECT name FROM users WHERE id = ?').get(payment.received_by);

  db.prepare('DELETE FROM payments WHERE id = ?').run(payment.id);
  recalcInvoice(payment.invoice_id);
  logActivity('invoice', payment.invoice_id, 'Payment record deleted',
    `${invoice.currency} ${Number(payment.amount).toFixed(2)} via ${payment.method} `
    + `dated ${payment.paid_at}${payment.reference ? `, ref ${payment.reference}` : ''}`
    + `${payment.note ? `, note "${payment.note}"` : ''} · originally received by `
    + `${receiver ? receiver.name : 'unknown'} on ${payment.created_at} · deleted by ${req.user.name}`,
    req.user.id);
  res.json({ ok: true });
}));

module.exports = router;
