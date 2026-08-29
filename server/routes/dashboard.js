'use strict';
const express = require('express');
const { db } = require('../db');
const { requireAuth, denyPartner } = require('../auth');
const { wrap } = require('../helpers');
const { ACTIVE_FILE_STATUSES } = require('../constants');

const router = express.Router();
router.use(requireAuth);

const ACTIVE_PLACEHOLDERS = ACTIVE_FILE_STATUSES.map(() => '?').join(',');
const count = (sql, ...params) => db.prepare(sql).get(...params).n;

/**
 * A partner login gets a dashboard built only from its own files and invoices —
 * it must never see company-wide lead, customer or revenue figures.
 */
function partnerDashboard(req, res) {
  const pid = req.user.partner_id || -1;
  const byStatus = Object.fromEntries(
    db.prepare('SELECT status, COUNT(*) n FROM case_files WHERE partner_id = ? GROUP BY status')
      .all(pid).map((r) => [r.status, r.n])
  );
  const money = db.prepare(`SELECT COALESCE(SUM(total),0) billed, COALESCE(SUM(paid),0) collected,
    COUNT(*) invoices FROM invoices WHERE partner_id = ? AND status != 'Cancelled'`).get(pid);
  const thisMonth = db.prepare(`SELECT COALESCE(SUM(total),0) billed, COALESCE(SUM(paid),0) collected,
    COUNT(*) invoices FROM invoices WHERE partner_id = ? AND status != 'Cancelled'
    AND strftime('%Y-%m', issue_date) = strftime('%Y-%m','now','localtime')`).get(pid);

  const stats = {
    total_files: count('SELECT COUNT(*) n FROM case_files WHERE partner_id = ?', pid),
    active_files: count(
      `SELECT COUNT(*) n FROM case_files WHERE partner_id = ? AND status IN (${ACTIVE_PLACEHOLDERS})`,
      pid, ...ACTIVE_FILE_STATUSES),
    files_processing: byStatus['Under Processing'] || 0,
    files_interview_pending: byStatus['Interview Called'] || 0,
    files_documents_pending: (byStatus['Documents Pending'] || 0)
      + (byStatus['Additional Documents Required'] || 0),
    files_approved: byStatus.Approved || 0,
    files_rejected: byStatus.Rejected || 0,
    files_completed: (byStatus.Completed || 0) + (byStatus.Delivered || 0),
    total_invoices: money.invoices,
    unpaid_invoices: count(
      "SELECT COUNT(*) n FROM invoices WHERE partner_id = ? AND status IN ('Unpaid','Partial Paid')", pid),
    total_billed: money.billed,
    total_collected: money.collected,
    pending_payments: Math.round((money.billed - money.collected) * 100) / 100,
    month_billed: thisMonth.billed,
    month_collected: thisMonth.collected,
    month_invoices: thisMonth.invoices,
    total_leads: 0, new_leads: 0, leads_today: 0, converted_leads: 0,
    followups_today: 0, followups_overdue: 0, meetings_today: 0, meetings_upcoming: 0,
    total_customers: count('SELECT COUNT(*) n FROM customers WHERE partner_id = ?', pid),
    total_partners: 1, active_partners: 1,
  };

  const monthlySales = db.prepare(`
    SELECT strftime('%Y-%m', issue_date) AS month, COALESCE(SUM(total),0) billed,
           COALESCE(SUM(paid),0) collected, COUNT(*) invoices
    FROM invoices WHERE partner_id = ? AND status != 'Cancelled'
      AND issue_date >= date('now','localtime','-11 months','start of month')
    GROUP BY month ORDER BY month
  `).all(pid);

  const upcomingInterviews = db.prepare(`
    SELECT f.id, f.reference_no, f.interview_date, f.country,
           trim(c.given_name || ' ' || COALESCE(c.surname,'')) AS customer_name
    FROM case_files f LEFT JOIN customers c ON c.id = f.customer_id
    WHERE f.partner_id = ? AND f.interview_date IS NOT NULL
      AND date(f.interview_date) >= date('now','localtime')
      AND f.status NOT IN ('Approved','Rejected','Delivered','Completed')
    ORDER BY f.interview_date LIMIT 8
  `).all(pid);

  res.json({
    stats, monthlySales, leadTrend: [], todayFollowups: [], todayMeetings: [],
    recentActivity: [], upcomingInterviews,
    filesByStatus: Object.entries(byStatus).map(([status, n]) => ({ status, n })),
  });
}

router.get('/', wrap((req, res) => {
  const mine = req.query.scope === 'mine' ? req.user.id : null;
  if (req.user.role === 'partner') return partnerDashboard(req, res);
  // "My" scope narrows every staff-owned metric to the signed-in user.
  const byMe = (column) => (mine ? ` AND ${column} = ${mine}` : '');

  const fileCounts = Object.fromEntries(
    db.prepare('SELECT status, COUNT(*) n FROM case_files GROUP BY status').all()
      .map((r) => [r.status, r.n])
  );

  const stats = {
    total_leads: count(`SELECT COUNT(*) n FROM leads WHERE 1=1${byMe('assigned_to')}`),
    new_leads: count(`SELECT COUNT(*) n FROM leads WHERE status = 'New Lead'${byMe('assigned_to')}`),
    leads_today: count(`SELECT COUNT(*) n FROM leads WHERE date(created_at) = date('now','localtime')${byMe('assigned_to')}`),
    converted_leads: count(`SELECT COUNT(*) n FROM leads WHERE status = 'Converted'${byMe('assigned_to')}`),

    followups_today: count(`SELECT COUNT(*) n FROM followups
      WHERE status = 'Pending' AND date(due_at) = date('now','localtime')${byMe('assigned_to')}`),
    followups_overdue: count(`SELECT COUNT(*) n FROM followups
      WHERE status = 'Pending' AND due_at < datetime('now','localtime')${byMe('assigned_to')}`),

    meetings_today: count(`SELECT COUNT(*) n FROM meetings
      WHERE date(meeting_at) = date('now','localtime') AND status = 'Scheduled'${byMe('assigned_to')}`),
    meetings_upcoming: count(`SELECT COUNT(*) n FROM meetings
      WHERE meeting_at > datetime('now','localtime') AND status = 'Scheduled'${byMe('assigned_to')}`),

    total_customers: count('SELECT COUNT(*) n FROM customers'),
    total_files: count('SELECT COUNT(*) n FROM case_files'),
    active_files: count(
      `SELECT COUNT(*) n FROM case_files WHERE status IN (${ACTIVE_PLACEHOLDERS})`, ...ACTIVE_FILE_STATUSES),
    files_processing: fileCounts['Under Processing'] || 0,
    files_completed: (fileCounts.Completed || 0) + (fileCounts.Delivered || 0),
    files_interview_pending: fileCounts['Interview Called'] || 0,
    files_approved: fileCounts.Approved || 0,
    files_rejected: fileCounts.Rejected || 0,
    files_documents_pending: (fileCounts['Documents Pending'] || 0)
      + (fileCounts['Additional Documents Required'] || 0),

    total_partners: count('SELECT COUNT(*) n FROM partners'),
    active_partners: count("SELECT COUNT(*) n FROM partners WHERE status = 'Active'"),

    total_invoices: count("SELECT COUNT(*) n FROM invoices WHERE status != 'Cancelled'"),
    unpaid_invoices: count("SELECT COUNT(*) n FROM invoices WHERE status IN ('Unpaid','Partial Paid')"),
  };

  const money = db.prepare(`
    SELECT COALESCE(SUM(total),0) billed, COALESCE(SUM(paid),0) collected
    FROM invoices WHERE status != 'Cancelled'
  `).get();
  stats.total_billed = money.billed;
  stats.total_collected = money.collected;
  stats.pending_payments = Math.round((money.billed - money.collected) * 100) / 100;

  const thisMonth = db.prepare(`
    SELECT COALESCE(SUM(total),0) billed, COALESCE(SUM(paid),0) collected, COUNT(*) invoices
    FROM invoices
    WHERE status != 'Cancelled' AND strftime('%Y-%m', issue_date) = strftime('%Y-%m','now','localtime')
  `).get();
  stats.month_billed = thisMonth.billed;
  stats.month_collected = thisMonth.collected;
  stats.month_invoices = thisMonth.invoices;

  const monthlySales = db.prepare(`
    SELECT strftime('%Y-%m', issue_date) AS month,
           COALESCE(SUM(total),0) billed, COALESCE(SUM(paid),0) collected, COUNT(*) invoices
    FROM invoices
    WHERE status != 'Cancelled' AND issue_date >= date('now','localtime','-11 months','start of month')
    GROUP BY month ORDER BY month
  `).all();

  const leadTrend = db.prepare(`
    SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) leads,
           SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) converted
    FROM leads
    WHERE created_at >= date('now','localtime','-11 months','start of month')
    GROUP BY month ORDER BY month
  `).all();

  const todayFollowups = db.prepare(`
    SELECT f.id, f.due_at, f.note, f.entity_type, f.entity_id, u.name AS assigned_name,
      CASE f.entity_type
        WHEN 'lead'      THEN (SELECT full_name FROM leads WHERE id = f.entity_id)
        WHEN 'customer'  THEN (SELECT trim(given_name || ' ' || COALESCE(surname,'')) FROM customers WHERE id = f.entity_id)
        WHEN 'partner'   THEN (SELECT partner_name FROM partners WHERE id = f.entity_id)
        WHEN 'case_file' THEN (SELECT reference_no FROM case_files WHERE id = f.entity_id)
      END AS entity_name,
      CASE f.entity_type
        WHEN 'lead'     THEN (SELECT phone FROM leads WHERE id = f.entity_id)
        WHEN 'customer' THEN (SELECT phone FROM customers WHERE id = f.entity_id)
      END AS entity_phone
    FROM followups f LEFT JOIN users u ON u.id = f.assigned_to
    WHERE f.status = 'Pending' AND date(f.due_at) <= date('now','localtime')${mine ? ` AND f.assigned_to = ${mine}` : ''}
    ORDER BY f.due_at LIMIT 12
  `).all();

  const todayMeetings = db.prepare(`
    SELECT m.id, m.title, m.meeting_at, m.meeting_type, m.status, u.name AS assigned_name,
      CASE m.entity_type
        WHEN 'lead'     THEN (SELECT full_name FROM leads WHERE id = m.entity_id)
        WHEN 'customer' THEN (SELECT trim(given_name || ' ' || COALESCE(surname,'')) FROM customers WHERE id = m.entity_id)
        WHEN 'partner'  THEN (SELECT partner_name FROM partners WHERE id = m.entity_id)
      END AS entity_name
    FROM meetings m LEFT JOIN users u ON u.id = m.assigned_to
    WHERE date(m.meeting_at) = date('now','localtime') AND m.status = 'Scheduled'${mine ? ` AND m.assigned_to = ${mine}` : ''}
    ORDER BY m.meeting_at LIMIT 12
  `).all();

  const recentActivity = db.prepare(`
    SELECT a.*, u.name AS user_name FROM activities a
    LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.id DESC LIMIT 8
  `).all();

  const filesByStatus = db.prepare(
    'SELECT status, COUNT(*) n FROM case_files GROUP BY status ORDER BY n DESC'
  ).all();

  const upcomingInterviews = db.prepare(`
    SELECT f.id, f.reference_no, f.interview_date, f.country,
           trim(c.given_name || ' ' || COALESCE(c.surname,'')) AS customer_name
    FROM case_files f LEFT JOIN customers c ON c.id = f.customer_id
    WHERE f.interview_date IS NOT NULL AND date(f.interview_date) >= date('now','localtime')
      AND f.status NOT IN ('Approved','Rejected','Delivered','Completed')
    ORDER BY f.interview_date LIMIT 8
  `).all();

  res.json({
    stats, monthlySales, leadTrend, todayFollowups, todayMeetings,
    recentActivity, filesByStatus, upcomingInterviews,
  });
}));

/** Cross-module search used by the header search box. */
router.get('/search', denyPartner, wrap((req, res) => {
  const term = String(req.query.q || '').trim();
  if (term.length < 2) return res.json({ data: [] });
  const like = `%${term}%`;
  const results = [];

  for (const row of db.prepare(`
    SELECT id, full_name, phone, status FROM leads
    WHERE full_name LIKE ? OR phone LIKE ? OR whatsapp LIKE ? OR email LIKE ? LIMIT 8
  `).all(like, like, like, like)) {
    results.push({ type: 'Lead', id: row.id, title: row.full_name,
      subtitle: `${row.phone || ''} · ${row.status}`, link: `#/leads/${row.id}` });
  }

  for (const row of db.prepare(`
    SELECT id, given_name, surname, passport_no, phone FROM customers
    WHERE given_name LIKE ? OR surname LIKE ? OR passport_no LIKE ? OR phone LIKE ? OR email LIKE ? LIMIT 8
  `).all(like, like, like, like, like)) {
    results.push({ type: 'Customer', id: row.id,
      title: `${row.given_name} ${row.surname || ''}`.trim(),
      subtitle: `${row.passport_no || 'No passport'} · ${row.phone || ''}`,
      link: `#/customers/${row.id}` });
  }

  for (const row of db.prepare(`
    SELECT f.id, f.reference_no, f.status, c.passport_no,
           trim(c.given_name || ' ' || COALESCE(c.surname,'')) AS customer_name
    FROM case_files f LEFT JOIN customers c ON c.id = f.customer_id
    WHERE f.reference_no LIKE ? OR c.passport_no LIKE ? OR c.given_name LIKE ? OR c.surname LIKE ? LIMIT 8
  `).all(like, like, like, like)) {
    results.push({ type: 'File', id: row.id, title: row.reference_no || `File #${row.id}`,
      subtitle: `${row.customer_name || ''} · ${row.status}`, link: `#/files/${row.id}` });
  }

  for (const row of db.prepare(`
    SELECT id, partner_name, company_name FROM partners
    WHERE partner_name LIKE ? OR company_name LIKE ? OR email LIKE ?
       OR personal_phone LIKE ? OR company_phone LIKE ? LIMIT 8
  `).all(like, like, like, like, like)) {
    results.push({ type: 'Partner', id: row.id, title: row.partner_name,
      subtitle: row.company_name || '', link: `#/partners/${row.id}` });
  }

  for (const row of db.prepare(`
    SELECT id, invoice_no, total, status FROM invoices WHERE invoice_no LIKE ? LIMIT 5
  `).all(like)) {
    results.push({ type: 'Invoice', id: row.id, title: row.invoice_no,
      subtitle: `${row.total} · ${row.status}`, link: `#/invoices/${row.id}` });
  }

  res.json({ data: results });
}));

module.exports = router;
