'use strict';
const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole, denyPartner, seesAllWork, seesAllMoney } = require('../auth');
const { wrap, bad, conditions, HttpError } = require('../helpers');
const { ACTIVE_FILE_STATUSES } = require('../constants');

const router = express.Router();
router.use(requireAuth, denyPartner);

/** Default any report to the current month when no range is supplied. */
function range(q) {
  const from = q.date_from || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);
  const to = q.date_to || new Date().toISOString().slice(0, 10);
  return { from, to };
}

/**
 * Reports a staff member has no business running at all: one lists every
 * colleague's numbers, the other the company's partner billing.
 */
const PRIVILEGED_REPORTS = ['staff_performance', 'partner_wise'];

/**
 * Each builder receives (query, scope). `scope.mine` is the user id when the
 * report must be narrowed to that person, or null for a company-wide view.
 * `own(col)` appends the restriction; it returns '' when nothing is restricted.
 */
const REPORTS = {
  /* ---- leads ---- */
  daily_leads: (q, sc) => {
    const { from, to } = range(q);
    return {
      title: 'Daily Lead Report',
      columns: ['Date', 'Leads', 'Converted', 'Not Interested'],
      rows: db.prepare(`
        SELECT date(created_at) AS d, COUNT(*) total,
               SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) converted,
               SUM(CASE WHEN status = 'Not Interested' THEN 1 ELSE 0 END) lost
        FROM leads WHERE date(created_at) BETWEEN date(?) AND date(?)${sc.own('assigned_to')}
        GROUP BY d ORDER BY d DESC
      `).all(from, to).map((r) => [r.d, r.total, r.converted, r.lost]),
      range: { from, to },
    };
  },

  lead_conversion: (q, sc) => {
    const { from, to } = range(q);
    const rows = db.prepare(`
      SELECT strftime('%Y-%m', created_at) AS m, COUNT(*) total,
             SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) converted
      FROM leads WHERE date(created_at) BETWEEN date(?) AND date(?)${sc.own('assigned_to')}
      GROUP BY m ORDER BY m DESC
    `).all(from, to);
    return {
      title: 'Monthly Lead Conversion',
      columns: ['Month', 'Leads', 'Converted', 'Conversion %'],
      rows: rows.map((r) => [r.m, r.total, r.converted,
        r.total ? `${((r.converted / r.total) * 100).toFixed(1)}%` : '0%']),
      range: { from, to },
    };
  },

  lead_source: (q, sc) => {
    const { from, to } = range(q);
    const rows = db.prepare(`
      SELECT COALESCE(source,'Not set') s, COUNT(*) total,
             SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) converted
      FROM leads WHERE date(created_at) BETWEEN date(?) AND date(?)${sc.own('assigned_to')}
      GROUP BY s ORDER BY total DESC
    `).all(from, to);
    return {
      title: 'Lead Source Performance',
      columns: ['Source', 'Leads', 'Converted', 'Conversion %'],
      rows: rows.map((r) => [r.s, r.total, r.converted,
        r.total ? `${((r.converted / r.total) * 100).toFixed(1)}%` : '0%']),
      range: { from, to },
    };
  },

  /* ---- follow-up ---- */
  followup_pending: (q, sc) => ({
    title: 'Pending & Overdue Follow-ups',
    columns: ['Due', 'Record', 'Type', 'Note', 'Assigned to', 'State'],
    rows: db.prepare(`
      SELECT f.due_at, f.entity_type, f.note, u.name AS staff,
        CASE f.entity_type
          WHEN 'lead'      THEN (SELECT full_name FROM leads WHERE id = f.entity_id)
          WHEN 'customer'  THEN (SELECT trim(given_name || ' ' || COALESCE(surname,'')) FROM customers WHERE id = f.entity_id)
          WHEN 'partner'   THEN (SELECT partner_name FROM partners WHERE id = f.entity_id)
          WHEN 'case_file' THEN (SELECT reference_no FROM case_files WHERE id = f.entity_id)
        END AS name,
        CASE WHEN f.due_at < datetime('now','localtime') THEN 'Overdue' ELSE 'Upcoming' END AS state
      FROM followups f LEFT JOIN users u ON u.id = f.assigned_to
      WHERE f.status = 'Pending'${sc.own('f.assigned_to')} ORDER BY f.due_at
    `).all().map((r) => [r.due_at, r.name || '—', r.entity_type, r.note || '—', r.staff || '—', r.state]),
  }),

  /* ---- files ---- */
  active_files: (q, sc) => ({
    title: 'Active File Report',
    columns: ['Reference', 'Customer', 'Country', 'Service', 'Status', 'Submitted', 'Staff', 'Partner'],
    rows: db.prepare(`
      SELECT f.reference_no, f.country, f.service_type, f.status, f.submission_date,
             trim(c.given_name || ' ' || COALESCE(c.surname,'')) AS customer, u.name AS staff,
             p.partner_name
      FROM case_files f
      LEFT JOIN customers c ON c.id = f.customer_id
      LEFT JOIN users u ON u.id = f.assigned_to
      LEFT JOIN partners p ON p.id = f.partner_id
      WHERE f.status IN (${ACTIVE_FILE_STATUSES.map(() => '?').join(',')})${sc.own('f.assigned_to')}
      ORDER BY f.created_at DESC
    `).all(...ACTIVE_FILE_STATUSES)
      .map((r) => [r.reference_no, r.customer || '—', r.country || '—', r.service_type || '—',
        r.status, r.submission_date || '—', r.staff || '—', r.partner_name || 'Direct']),
  }),

  country_wise: (q, sc) => {
    const { from, to } = range(q);
    const rows = db.prepare(`
      SELECT COALESCE(country,'Not set') c, COUNT(*) total,
             SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) approved,
             SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) rejected
      FROM case_files WHERE date(created_at) BETWEEN date(?) AND date(?)${sc.own('assigned_to')}
      GROUP BY c ORDER BY total DESC
    `).all(from, to);
    return {
      title: 'Country-wise File Report',
      columns: ['Country', 'Files', 'Approved', 'Rejected', 'Success %'],
      rows: rows.map((r) => {
        const decided = r.approved + r.rejected;
        return [r.c, r.total, r.approved, r.rejected,
          decided ? `${((r.approved / decided) * 100).toFixed(1)}%` : '—'];
      }),
      range: { from, to },
    };
  },

  approved_vs_rejected: (q, sc) => {
    const { from, to } = range(q);
    const rows = db.prepare(`
      SELECT strftime('%Y-%m', COALESCE(completion_date, updated_at)) m,
             SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) approved,
             SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) rejected
      FROM case_files
      WHERE status IN ('Approved','Rejected')
        AND date(COALESCE(completion_date, updated_at)) BETWEEN date(?) AND date(?)${sc.own('assigned_to')}
      GROUP BY m ORDER BY m DESC
    `).all(from, to);
    return {
      title: 'Approved vs Rejected',
      columns: ['Month', 'Approved', 'Rejected', 'Success %'],
      rows: rows.map((r) => {
        const d = r.approved + r.rejected;
        return [r.m, r.approved, r.rejected, d ? `${((r.approved / d) * 100).toFixed(1)}%` : '—'];
      }),
      range: { from, to },
    };
  },

  /* ---- partners ---- */
  partner_wise: (q, sc) => ({
    title: 'Partner-wise File Report',
    columns: ['Partner', 'Company', 'Files', 'Processing', 'Approved', 'Rejected', 'Billed', 'Due'],
    rows: db.prepare(`
      SELECT p.partner_name, p.company_name,
        (SELECT COUNT(*) FROM case_files f WHERE f.partner_id = p.id) total,
        (SELECT COUNT(*) FROM case_files f WHERE f.partner_id = p.id
          AND f.status IN (${ACTIVE_FILE_STATUSES.map(() => '?').join(',')})) processing,
        (SELECT COUNT(*) FROM case_files f WHERE f.partner_id = p.id AND f.status = 'Approved') approved,
        (SELECT COUNT(*) FROM case_files f WHERE f.partner_id = p.id AND f.status = 'Rejected') rejected,
        (SELECT COALESCE(SUM(total),0) FROM invoices i WHERE i.partner_id = p.id AND i.status != 'Cancelled') billed,
        (SELECT COALESCE(SUM(total - paid),0) FROM invoices i WHERE i.partner_id = p.id AND i.status != 'Cancelled') due
      FROM partners p ORDER BY total DESC, p.partner_name
    `).all(...ACTIVE_FILE_STATUSES)
      .map((r) => [r.partner_name, r.company_name || '—', r.total, r.processing,
        r.approved, r.rejected, r.billed.toFixed(2), r.due.toFixed(2)]),
  }),

  /* ---- money ---- */
  invoice_report: (q, sc) => {
    const { from, to } = range(q);
    return {
      title: 'Invoice Report',
      columns: ['Invoice', 'Date', 'Billed to', 'Total', 'Paid', 'Due', 'Status'],
      rows: db.prepare(`
        SELECT i.invoice_no, i.issue_date, i.total, i.paid, i.status, i.currency,
               COALESCE(p.partner_name, trim(c.given_name || ' ' || COALESCE(c.surname,''))) AS billed_to
        FROM invoices i
        LEFT JOIN customers c ON c.id = i.customer_id
        LEFT JOIN partners p ON p.id = i.partner_id
        LEFT JOIN case_files f ON f.id = i.case_file_id
        WHERE date(i.issue_date) BETWEEN date(?) AND date(?)${sc.ownMoney()}
        ORDER BY i.issue_date DESC, i.id DESC
      `).all(from, to).map((r) => [r.invoice_no, r.issue_date, r.billed_to || '—',
        r.total.toFixed(2), r.paid.toFixed(2), (r.total - r.paid).toFixed(2), r.status]),
      range: { from, to },
    };
  },

  payment_due: (q, sc) => ({
    title: 'Payment Due Report',
    columns: ['Invoice', 'Billed to', 'Issued', 'Due date', 'Total', 'Paid', 'Outstanding', 'Status'],
    rows: db.prepare(`
      SELECT i.invoice_no, i.issue_date, i.due_date, i.total, i.paid, i.status,
             COALESCE(p.partner_name, trim(c.given_name || ' ' || COALESCE(c.surname,''))) AS billed_to
      FROM invoices i
      LEFT JOIN customers c ON c.id = i.customer_id
      LEFT JOIN partners p ON p.id = i.partner_id
      LEFT JOIN case_files f ON f.id = i.case_file_id
      WHERE i.status IN ('Unpaid','Partial Paid')${sc.ownMoney()}
      ORDER BY COALESCE(i.due_date, i.issue_date)
    `).all().map((r) => [r.invoice_no, r.billed_to || '—', r.issue_date, r.due_date || '—',
      r.total.toFixed(2), r.paid.toFixed(2), (r.total - r.paid).toFixed(2), r.status]),
  }),

  collection: (q, sc) => {
    const { from, to } = range(q);
    return {
      title: 'Payment Collection Report',
      columns: ['Date', 'Payments', 'Collected'],
      rows: db.prepare(`
        SELECT date(pay.paid_at) d, COUNT(*) n, COALESCE(SUM(pay.amount),0) total
        FROM payments pay
        JOIN invoices i ON i.id = pay.invoice_id
        LEFT JOIN customers c ON c.id = i.customer_id
        LEFT JOIN case_files f ON f.id = i.case_file_id
        WHERE date(pay.paid_at) BETWEEN date(?) AND date(?)${sc.ownCollection()}
        GROUP BY d ORDER BY d DESC
      `).all(from, to).map((r) => [r.d, r.n, r.total.toFixed(2)]),
      range: { from, to },
    };
  },

  /* ---- team ---- */
  staff_performance: (q, sc) => {
    const { from, to } = range(q);
    const rows = db.prepare(`
      SELECT u.id, u.name, u.role,
        (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.id
          AND date(l.created_at) BETWEEN date(@from) AND date(@to)) leads,
        (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.id AND l.status = 'Converted'
          AND date(COALESCE(l.converted_at, l.updated_at)) BETWEEN date(@from) AND date(@to)) converted,
        (SELECT COUNT(*) FROM followups f WHERE f.assigned_to = u.id AND f.status = 'Done'
          AND date(f.completed_at) BETWEEN date(@from) AND date(@to)) followups_done,
        (SELECT COUNT(*) FROM followups f WHERE f.assigned_to = u.id AND f.status = 'Pending'
          AND f.due_at < datetime('now','localtime')) overdue,
        (SELECT COUNT(*) FROM meetings m WHERE m.assigned_to = u.id
          AND date(m.meeting_at) BETWEEN date(@from) AND date(@to)) meetings,
        (SELECT COUNT(*) FROM case_files f WHERE f.created_by = u.id
          AND date(f.created_at) BETWEEN date(@from) AND date(@to)) files,
        (SELECT COUNT(*) FROM case_files f WHERE f.assigned_to = u.id AND f.status = 'Approved') approved,
        (SELECT COUNT(*) FROM case_files f WHERE f.assigned_to = u.id AND f.status = 'Rejected') rejected,
        (SELECT COALESCE(SUM(i.total),0) FROM invoices i WHERE i.created_by = u.id
          AND i.status != 'Cancelled' AND date(i.issue_date) BETWEEN date(@from) AND date(@to)) revenue
      FROM users u WHERE u.active = 1 AND u.role != 'partner'
      ORDER BY converted DESC, leads DESC
    `).all({ from, to });
    return {
      title: 'Staff Performance',
      columns: ['Staff', 'Role', 'Leads', 'Converted', 'Conv. %', 'Follow-ups done',
        'Overdue', 'Meetings', 'Files', 'Approved', 'Rejected', 'Revenue'],
      rows: rows.map((r) => [r.name, r.role, r.leads, r.converted,
        r.leads ? `${((r.converted / r.leads) * 100).toFixed(1)}%` : '—',
        r.followups_done, r.overdue, r.meetings, r.files, r.approved, r.rejected,
        r.revenue.toFixed(2)]),
      raw: rows,
      range: { from, to },
    };
  },
};

/** Builds the scope helpers for whoever is asking. */
function scopeFor(user) {
  const allWork = seesAllWork(user);
  const allMoney = seesAllMoney(user);
  return {
    own: (column) => (allWork ? '' : ` AND ${column} = ${user.id}`),
    // A staff member cannot raise invoices, so their sales are the invoices
    // against the customers and files they handle, not ones they created.
    ownMoney: () => (allMoney ? '' : ` AND (i.created_by = ${user.id}
      OR c.assigned_to = ${user.id} OR f.assigned_to = ${user.id})`),
    ownCollection: () => (allMoney ? '' : ` AND (pay.received_by = ${user.id}
      OR i.created_by = ${user.id} OR c.assigned_to = ${user.id} OR f.assigned_to = ${user.id})`),
    allWork,
    allMoney,
  };
}

const availableTo = (user) => Object.keys(REPORTS)
  .filter((key) => seesAllWork(user) || !PRIVILEGED_REPORTS.includes(key));

router.get('/', wrap((req, res) => {
  const sc = scopeFor(req.user);
  res.json({
    data: availableTo(req.user).map((key) => ({ key, title: REPORTS[key]({}, sc).title })),
    scoped: !sc.allWork || !sc.allMoney,
  });
}));

router.get('/:key', wrap((req, res) => {
  const build = REPORTS[req.params.key];
  if (!build) bad(`Unknown report: "${req.params.key}"`);
  if (!availableTo(req.user).includes(req.params.key)) {
    throw new HttpError(403, 'Your role does not have access to this report');
  }
  const sc = scopeFor(req.user);
  res.json({ data: build(req.query, sc), scoped: !sc.allWork || !sc.allMoney });
}));

/** CSV export of any report, so figures can be handed to an accountant. */
router.get('/:key/csv', wrap((req, res) => {
  const build = REPORTS[req.params.key];
  if (!build) bad(`Unknown report: "${req.params.key}"`);
  if (!availableTo(req.user).includes(req.params.key)) {
    throw new HttpError(403, 'Your role does not have access to this report');
  }
  const report = build(req.query, scopeFor(req.user));
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [report.columns.map(escape).join(','),
    ...report.rows.map((r) => r.map(escape).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.key}.csv"`);
  res.send(csv);
}));

module.exports = router;
