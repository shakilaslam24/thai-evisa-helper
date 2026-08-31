'use strict';
const express = require('express');
const { db } = require('../db');
const { requireAuth, canWrite, requireRole, seesAllMoney } = require('../auth');
const {
  wrap, bad, notFound, paging, orderBy, conditions, logActivity, toNumber,
  clean, todayISO, HttpError, archive, restore, assertUnchanged,
} = require('../helpers');
const v = require('../validate');
const { readSettings } = require('./settings');

const router = express.Router();
router.use(requireAuth);

const SELECT = `
  SELECT i.*, trim(c.given_name || ' ' || COALESCE(c.surname,'')) AS customer_name,
         c.phone AS customer_phone, c.email AS customer_email, c.address AS customer_address,
         p.partner_name, p.company_name AS partner_company, p.email AS partner_email,
         p.company_address AS partner_address, p.company_phone AS partner_phone,
         f.reference_no, u.name AS created_by_name, du.name AS deleted_by_name,
         (i.total - i.paid) AS due_amount
  FROM invoices i
  LEFT JOIN customers c ON c.id = i.customer_id
  LEFT JOIN partners p ON p.id = i.partner_id
  LEFT JOIN case_files f ON f.id = i.case_file_id
  LEFT JOIN users u ON u.id = i.created_by
  LEFT JOIN users du ON du.id = i.deleted_by
`;

/**
 * The next invoice number, as PREFIX-YEAR-0001.
 *
 * Deliberately takes the highest number that parses as a number, not the most
 * recently created row. Reading the last row meant a single invoice whose suffix
 * was not numeric turned the next number into NaN — and because the column is
 * unique, every invoice after that collided and failed. One bad value would have
 * stopped the whole company invoicing until somebody edited the database by hand.
 *
 * Anything unparseable is now skipped, an underscore in the prefix cannot act as
 * a LIKE wildcard, and the sequence simply carries on.
 */
function nextInvoiceNo() {
  const settings = readSettings();
  const prefix = `${settings.invoice_prefix || 'DF-INV'}-${new Date().getFullYear()}-`;
  const rows = db.prepare(
    "SELECT invoice_no FROM invoices WHERE invoice_no LIKE ? ESCAPE '\\'"
  ).all(`${prefix.replace(/[%_\\]/g, '\\$&')}%`);

  let highest = 0;
  for (const r of rows) {
    const suffix = String(r.invoice_no).slice(prefix.length);
    if (!/^\d+$/.test(suffix)) continue;      // ignore anything that is not a plain number
    const n = Number(suffix);
    if (Number.isSafeInteger(n) && n > highest) highest = n;
  }
  return `${prefix}${String(highest + 1).padStart(4, '0')}`;
}

const MAX_ITEMS = 100;

function normaliseItems(rawItems) {
  const items = Array.isArray(rawItems) ? rawItems : [];
  // A cap the office will never reach, but which stops a bad integration from
  // storing an invoice nobody can print.
  if (items.length > MAX_ITEMS) bad(`An invoice can have at most ${MAX_ITEMS} line items`);
  const cleaned = items
    .map((it) => {
      const description = v.text(it.description, 'Line item description', v.LIMITS.line);
      if (!description) return null;
      const quantity = v.money(toNumber(it.quantity, 1), 'Quantity');
      if (quantity <= 0) bad(`Quantity for "${description}" must be greater than zero`);
      const unitPrice = v.money(toNumber(it.unit_price, 0), 'Unit price');
      return { description, quantity, unit_price: unitPrice, amount: Math.round(quantity * unitPrice * 100) / 100 };
    })
    .filter(Boolean);
  if (!cleaned.length) bad('An invoice needs at least one line item with a description');
  return cleaned;
}

function totalsFor(items, discount, tax) {
  const subtotal = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100;
  const total = Math.round((subtotal - discount + tax) * 100) / 100;
  if (total < 0) bad('Discount cannot be larger than the invoice subtotal');
  return { subtotal, total };
}

function statusFor(total, paid) {
  if (paid <= 0) return 'Unpaid';
  if (paid + 0.001 < total) return 'Partial Paid';
  return 'Paid';
}

/** Recalculate paid/status from the payment rows, and roll it up to the file. */
function recalcInvoice(invoiceId) {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!invoice) return null;
  const paid = db.prepare('SELECT COALESCE(SUM(amount),0) s FROM payments WHERE invoice_id = ?')
    .get(invoiceId).s;
  const status = invoice.status === 'Cancelled' ? 'Cancelled' : statusFor(invoice.total, paid);
  db.prepare("UPDATE invoices SET paid = ?, status = ?, updated_at = datetime('now','localtime') WHERE id = ?")
    .run(paid, status, invoiceId);

  if (invoice.case_file_id) {
    const roll = db.prepare(`SELECT COALESCE(SUM(total),0) t, COALESCE(SUM(paid),0) p
                             FROM invoices WHERE case_file_id = ?
                               AND status != 'Cancelled' AND deleted_at IS NULL`)
      .get(invoice.case_file_id);
    db.prepare("UPDATE case_files SET payment_status = ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(roll.t > 0 ? statusFor(roll.t, roll.p) : 'Unpaid', invoice.case_file_id);
  }
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
}

function guardPartnerScope(req, invoice) {
  if (req.user.role === 'partner' && invoice.partner_id !== req.user.partner_id) {
    throw new HttpError(403, 'You can only view invoices issued to your account');
  }
}

router.get('/', wrap((req, res) => {
  const q = req.query;
  const w = conditions();
  if (req.user.role === 'partner') w.add('i.partner_id = ?', req.user.partner_id || -1);
  // A staff member's sales are the invoices against the customers and files
  // they handle — they cannot raise invoices themselves, so scoping by who
  // created the invoice would show them nothing at all.
  else if (!seesAllMoney(req.user)) {
    w.add('(i.created_by = ? OR c.assigned_to = ? OR f.assigned_to = ?)',
      req.user.id, req.user.id, req.user.id);
  }
  if (q.search) {
    const like = `%${q.search}%`;
    w.add('(i.invoice_no LIKE ? OR c.given_name LIKE ? OR c.surname LIKE ? OR p.partner_name LIKE ?)',
      like, like, like, like);
  }
  w.addIf(q.status, 'i.status = ?');
  w.addIf(q.customer_id, 'i.customer_id = ?', Number(q.customer_id));
  w.addIf(q.partner_id, 'i.partner_id = ?', Number(q.partner_id));
  w.addIf(q.date_from, 'date(i.issue_date) >= date(?)');
  w.addIf(q.date_to, 'date(i.issue_date) <= date(?)');
  if (q.due === '1') w.add("i.status IN ('Unpaid','Partial Paid')");
  // Archived invoices stay in the database and keep their payments, but they are
  // out of every listing and every total unless somebody asks to see them.
  if (q.archived === '1') w.add('i.deleted_at IS NOT NULL');
  else w.add('i.deleted_at IS NULL');

  const { limit, offset, page } = paging(q);
  const sort = orderBy(q, ['i.issue_date', 'i.created_at', 'i.total', 'i.status'], 'i.issue_date');
  const total = db.prepare(`
    SELECT COUNT(*) n FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN partners p ON p.id = i.partner_id
    LEFT JOIN case_files f ON f.id = i.case_file_id ${w.where()}
  `).get(...w.params).n;
  const data = db.prepare(`${SELECT} ${w.where()} ORDER BY ${sort}, i.id DESC LIMIT ? OFFSET ?`)
    .all(...w.params, limit, offset);

  const totals = db.prepare(`
    SELECT COALESCE(SUM(i.total),0) billed, COALESCE(SUM(i.paid),0) collected
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN partners p ON p.id = i.partner_id
    LEFT JOIN case_files f ON f.id = i.case_file_id ${w.where()}
  `).get(...w.params);

  res.json({ data, total, page, limit, totals: { ...totals, due: totals.billed - totals.collected } });
}));

router.get('/next-number', canWrite('invoices'), wrap((req, res) => {
  res.json({ data: { invoice_no: nextInvoiceNo() } });
}));

router.get('/:id', wrap((req, res) => {
  const invoice = db.prepare(`${SELECT} WHERE i.id = ?`).get(Number(req.params.id));
  if (!invoice) notFound('Invoice not found');
  guardPartnerScope(req, invoice);
  // Opening one invoice is deliberately not restricted for the team: a walk-in
  // client pays whoever is at the desk, and that person has to be able to find
  // the bill. What stays scoped is the listing and its totals — how much each
  // person sold — not the ability to serve a colleague's client.
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id').all(invoice.id);
  const payments = db.prepare(`
    SELECT pay.*, u.name AS received_by_name FROM payments pay
    LEFT JOIN users u ON u.id = pay.received_by
    WHERE pay.invoice_id = ? ORDER BY pay.paid_at DESC, pay.id DESC
  `).all(invoice.id);
  res.json({ data: invoice, items, payments, company: readSettings() });
}));

router.post('/', canWrite('invoices'), wrap((req, res) => {
  const b = req.body;
  if (!b.customer_id && !b.partner_id) bad('An invoice must be raised against a customer or a B2B partner');

  const items = normaliseItems(b.items);
  const discount = toNumber(b.discount, 0);
  const tax = toNumber(b.tax, 0);
  const { subtotal, total } = totalsFor(items, discount, tax);
  const settings = readSettings();

  const create = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO invoices (invoice_no, customer_id, partner_id, case_file_id, issue_date,
        due_date, currency, subtotal, discount, tax, total, paid, status, notes, created_by)
      VALUES (@invoice_no, @customer_id, @partner_id, @case_file_id, @issue_date,
        @due_date, @currency, @subtotal, @discount, @tax, @total, 0, 'Unpaid', @notes, @created_by)
    `).run({
      // The number is the system's to issue, never the caller's. Accepting one
      // from the request let any client forge, back-date or duplicate it, and
      // was what allowed the numbering to be poisoned.
      invoice_no: nextInvoiceNo(),
      customer_id: b.customer_id ? Number(b.customer_id) : null,
      partner_id: b.partner_id ? Number(b.partner_id) : null,
      case_file_id: b.case_file_id ? Number(b.case_file_id) : null,
      issue_date: v.date(b.issue_date, 'Issue date') || todayISO(),
      due_date: v.date(b.due_date, 'Due date'),
      currency: clean(b.currency) || settings.invoice_currency || 'BDT',
      subtotal, discount, tax, total,
      notes: v.text(b.notes, 'Notes', v.LIMITS.notes),
      created_by: req.user.id,
    });
    const id = info.lastInsertRowid;
    const addItem = db.prepare(`INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount)
                                VALUES (?, ?, ?, ?, ?)`);
    for (const it of items) addItem.run(id, it.description, it.quantity, it.unit_price, it.amount);
    return id;
  });

  const id = create();
  const invoice = db.prepare(`${SELECT} WHERE i.id = ?`).get(id);
  logActivity('invoice', id, 'Invoice created', `${invoice.invoice_no} · ${invoice.currency} ${total}`, req.user.id);
  if (invoice.customer_id) logActivity('customer', invoice.customer_id, 'Invoice created', invoice.invoice_no, req.user.id);
  if (invoice.partner_id) logActivity('partner', invoice.partner_id, 'Invoice created', invoice.invoice_no, req.user.id);
  if (invoice.case_file_id) logActivity('case_file', invoice.case_file_id, 'Invoice created', invoice.invoice_no, req.user.id);
  res.status(201).json({ data: invoice });
}));

router.put('/:id', canWrite('invoices'), wrap((req, res) => {
  const id = Number(req.params.id);
  const before = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!before) notFound('Invoice not found');
  if (before.status === 'Cancelled') bad('A cancelled invoice cannot be edited');
  assertUnchanged(before, req.body, 'invoice');

  const b = req.body;
  const items = normaliseItems(b.items);
  const discount = toNumber(b.discount, 0);
  const tax = toNumber(b.tax, 0);
  const { subtotal, total } = totalsFor(items, discount, tax);
  if (total + 0.001 < before.paid) {
    bad(`The new total is less than the ${before.paid} already received against this invoice`);
  }

  const update = db.transaction(() => {
    db.prepare(`
      UPDATE invoices SET customer_id=@customer_id, partner_id=@partner_id, case_file_id=@case_file_id,
        issue_date=@issue_date, due_date=@due_date, currency=@currency, subtotal=@subtotal,
        discount=@discount, tax=@tax, total=@total, notes=@notes,
        updated_at=datetime('now','localtime'), updated_by=@updated_by, version=version+1
      WHERE id=@id
    `).run({
      customer_id: b.customer_id ? Number(b.customer_id) : null,
      partner_id: b.partner_id ? Number(b.partner_id) : null,
      case_file_id: b.case_file_id ? Number(b.case_file_id) : null,
      issue_date: v.date(b.issue_date, 'Issue date') || before.issue_date,
      due_date: Object.prototype.hasOwnProperty.call(b, 'due_date')
        ? v.date(b.due_date, 'Due date') : before.due_date,
      currency: clean(b.currency) || before.currency,
      subtotal, discount, tax, total,
      notes: Object.prototype.hasOwnProperty.call(b, 'notes')
        ? v.text(b.notes, 'Notes', v.LIMITS.notes) : before.notes,
      updated_by: req.user.id, id,
    });
    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);
    const addItem = db.prepare(`INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount)
                                VALUES (?, ?, ?, ?, ?)`);
    for (const it of items) addItem.run(id, it.description, it.quantity, it.unit_price, it.amount);
  });
  update();
  recalcInvoice(id);

  logActivity('invoice', id, 'Invoice updated', `${before.invoice_no} · total ${before.total} → ${total}`, req.user.id);
  res.json({ data: db.prepare(`${SELECT} WHERE i.id = ?`).get(id) });
}));

router.post('/:id/cancel', canWrite('invoices'), wrap((req, res) => {
  const id = Number(req.params.id);
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!invoice) notFound('Invoice not found');
  if (invoice.deleted_at) bad('This invoice is archived — restore it first');
  if (invoice.status === 'Cancelled') bad('This invoice is already cancelled');
  if (invoice.paid > 0) {
    bad('This invoice has payments against it — refund them first, then cancel it');
  }
  db.prepare(`UPDATE invoices SET status = 'Cancelled', updated_at = datetime('now','localtime'),
              updated_by = ? WHERE id = ?`).run(req.user.id, id);
  logActivity('invoice', id, 'Invoice cancelled', invoice.invoice_no, req.user.id);
  res.json({ data: db.prepare(`${SELECT} WHERE i.id = ?`).get(id) });
}));

/**
 * Archive, not delete.
 *
 * A real DELETE here removed the invoice *and*, through ON DELETE CASCADE, every
 * payment recorded against it — money genuinely received, gone, with only the
 * invoice number left in the activity log. Archiving keeps the row and its
 * payments intact and simply takes it out of every listing, total and report,
 * and an administrator can put it back.
 *
 * An invoice that has money against it cannot be archived at all: refund the
 * payments first, so the reversal is recorded rather than hidden.
 */
router.delete('/:id', requireRole('admin'), wrap((req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(Number(req.params.id));
  if (!invoice) notFound('Invoice not found');
  if (invoice.deleted_at) bad('This invoice is already archived');

  const received = db.prepare('SELECT COUNT(*) n, COALESCE(SUM(amount),0) s FROM payments WHERE invoice_id = ?')
    .get(invoice.id);
  if (received.n > 0) {
    bad(`This invoice has ${received.n} payment(s) totalling ${invoice.currency} ${received.s.toFixed(2)}. `
      + 'Refund them first — archiving would hide money that was actually received.');
  }

  archive('invoices', invoice.id, req.user.id, req.body?.reason);
  if (invoice.case_file_id) {
    const roll = db.prepare(`SELECT COALESCE(SUM(total),0) t, COALESCE(SUM(paid),0) p
                             FROM invoices WHERE case_file_id = ?
                               AND status != 'Cancelled' AND deleted_at IS NULL`).get(invoice.case_file_id);
    db.prepare('UPDATE case_files SET payment_status = ? WHERE id = ?')
      .run(roll.t > 0 ? statusFor(roll.t, roll.p) : 'Unpaid', invoice.case_file_id);
  }
  logActivity('invoice', invoice.id, 'Invoice archived',
    `${invoice.invoice_no} · ${invoice.currency} ${invoice.total}`
    + (req.body?.reason ? ` · reason: ${clean(req.body.reason)}` : ''), req.user.id);
  res.json({ ok: true });
}));

router.post('/:id/restore', requireRole('admin'), wrap((req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(Number(req.params.id));
  if (!invoice) notFound('Invoice not found');
  if (!invoice.deleted_at) bad('This invoice is not archived');
  restore('invoices', invoice.id);
  recalcInvoice(invoice.id);
  logActivity('invoice', invoice.id, 'Invoice restored', invoice.invoice_no, req.user.id);
  res.json({ data: db.prepare(`${SELECT} WHERE i.id = ?`).get(invoice.id) });
}));

module.exports = { router, recalcInvoice, nextInvoiceNo };
