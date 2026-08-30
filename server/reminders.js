'use strict';
const { db } = require('./db');
const { notify } = require('./helpers');

/**
 * Turns time-based conditions into in-system notifications. Runs on a timer and
 * on demand; dedupe_key keeps repeated sweeps from re-notifying the same thing.
 */

function adminAndManagerIds() {
  return db.prepare("SELECT id FROM users WHERE active = 1 AND role IN ('admin','manager')")
    .all().map((r) => r.id);
}

function fanOut(userIds, payload) {
  for (const id of new Set(userIds.filter(Boolean))) notify(id, payload);
}

function sweepFollowups() {
  const due = db.prepare(`
    SELECT f.*,
      CASE f.entity_type
        WHEN 'lead'      THEN (SELECT full_name FROM leads WHERE id = f.entity_id)
        WHEN 'customer'  THEN (SELECT trim(given_name || ' ' || COALESCE(surname,'')) FROM customers WHERE id = f.entity_id)
        WHEN 'partner'   THEN (SELECT partner_name FROM partners WHERE id = f.entity_id)
        WHEN 'case_file' THEN (SELECT reference_no FROM case_files WHERE id = f.entity_id)
      END AS entity_name
      , (SELECT name FROM users WHERE id = f.assigned_to) AS assigned_name
    FROM followups f
    WHERE f.status = 'Pending' AND f.due_at <= datetime('now','localtime')
  `).all();

  const today = new Date().toISOString().slice(0, 10);
  const supervisors = adminAndManagerIds();

  for (const f of due) {
    const dueAt = new Date(String(f.due_at).replace(' ', 'T'));
    const daysLate = Math.floor((Date.now() - dueAt.getTime()) / 86400000);
    const overdue = dueAt < new Date(Date.now() - 3600000);

    fanOut([f.assigned_to], {
      type: overdue ? 'followup_overdue' : 'followup_due',
      title: overdue
        ? `Overdue follow-up${daysLate >= 1 ? ` — ${daysLate} day${daysLate > 1 ? 's' : ''} late` : ''}`
        : 'Follow-up due now',
      body: `${f.entity_name || 'Record'} — ${f.note || 'No note'} (${f.due_at})`,
      link: '#/followups',
      // Dated key: a still-open item raises a fresh reminder every day rather
      // than notifying once and then falling silent.
      dedupeKey: `followup:${f.id}:${overdue ? `overdue:${today}` : 'due'}`,
    });

    // Two days late means the assignee is not acting on it — tell a manager.
    if (daysLate >= 2) {
      fanOut(supervisors, {
        type: 'followup_escalated',
        title: `Follow-up ${daysLate} days late`,
        body: `${f.entity_name || 'Record'} — assigned to ${f.assigned_name || 'nobody'}`,
        link: '#/followups?due=overdue',
        dedupeKey: `followup-escalated:${f.id}:${today}`,
      });
    }
  }
  return due.length;
}

function sweepMeetings() {
  // Fire once the meeting enters its own "remind before" window.
  const soon = db.prepare(`
    SELECT m.*,
      CASE m.entity_type
        WHEN 'lead'     THEN (SELECT full_name FROM leads WHERE id = m.entity_id)
        WHEN 'customer' THEN (SELECT trim(given_name || ' ' || COALESCE(surname,'')) FROM customers WHERE id = m.entity_id)
        WHEN 'partner'  THEN (SELECT partner_name FROM partners WHERE id = m.entity_id)
      END AS entity_name
    FROM meetings m
    WHERE m.status = 'Scheduled'
      AND datetime(m.meeting_at, '-' || m.remind_before_min || ' minutes') <= datetime('now','localtime')
      AND m.meeting_at >= datetime('now','localtime','-1 day')
  `).all();

  for (const m of soon) {
    fanOut([m.assigned_to, m.created_by], {
      type: 'meeting_reminder',
      title: `Meeting: ${m.title}`,
      body: `${m.meeting_at} · ${m.meeting_type}${m.entity_name ? ` · ${m.entity_name}` : ''}`,
      link: '#/meetings',
      dedupeKey: `meeting:${m.id}`,
    });
  }
  return soon.length;
}

function sweepInterviews() {
  const rows = db.prepare(`
    SELECT f.id, f.reference_no, f.interview_date, f.assigned_to,
           trim(c.given_name || ' ' || COALESCE(c.surname,'')) AS customer_name
    FROM case_files f LEFT JOIN customers c ON c.id = f.customer_id
    WHERE f.interview_date IS NOT NULL
      AND date(f.interview_date) BETWEEN date('now','localtime') AND date('now','localtime','+3 days')
      AND f.status NOT IN ('Approved','Rejected','Delivered','Completed')
  `).all();

  const supervisors = adminAndManagerIds();
  for (const f of rows) {
    fanOut([f.assigned_to, ...supervisors], {
      type: 'interview_reminder',
      title: `Interview on ${f.interview_date}`,
      body: `${f.reference_no} · ${f.customer_name || 'Customer'}`,
      link: `#/files/${f.id}`,
      dedupeKey: `interview:${f.id}:${f.interview_date}:${new Date().toISOString().slice(0, 10)}`,
    });
  }
  return rows.length;
}

function sweepPaymentDues() {
  const rows = db.prepare(`
    SELECT i.id, i.invoice_no, i.due_date, i.total, i.paid, i.currency, i.created_by,
           COALESCE(p.partner_name, trim(c.given_name || ' ' || COALESCE(c.surname,''))) AS customer_label
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN partners p ON p.id = i.partner_id
    WHERE i.status IN ('Unpaid','Partial Paid')
      AND i.due_date IS NOT NULL AND date(i.due_date) <= date('now','localtime')
  `).all();

  const finance = db.prepare("SELECT id FROM users WHERE active = 1 AND role IN ('admin','manager','accounts')")
    .all().map((r) => r.id);
  const today = new Date().toISOString().slice(0, 10);
  for (const i of rows) {
    const daysLate = Math.floor(
      (Date.now() - new Date(String(i.due_date).replace(' ', 'T')).getTime()) / 86400000
    );
    fanOut([...finance, i.created_by], {
      type: 'payment_due',
      title: `Payment overdue: ${i.invoice_no}${daysLate > 0 ? ` (${daysLate} day${daysLate > 1 ? 's' : ''})` : ''}`,
      body: `${i.currency} ${(i.total - i.paid).toFixed(2)} outstanding${i.customer_label ? ` from ${i.customer_label}` : ''} since ${i.due_date}`,
      link: `#/invoices/${i.id}`,
      dedupeKey: `invoice-due:${i.id}:${today}`,
    });
  }
  return rows.length;
}

function sweepMissingDocuments() {
  const rows = db.prepare(`
    SELECT f.id, f.reference_no, f.assigned_to, COUNT(dc.id) AS missing
    FROM case_files f
    JOIN document_checklist dc ON dc.case_file_id = f.id AND dc.status = 'Missing'
    WHERE f.status IN ('Ready for Submission','Submitted','Documents Pending','Additional Documents Required')
    GROUP BY f.id
  `).all();

  for (const f of rows) {
    fanOut([f.assigned_to], {
      type: 'documents_missing',
      title: `${f.missing} document(s) missing`,
      body: `File ${f.reference_no} still has documents outstanding`,
      link: `#/files/${f.id}`,
      dedupeKey: `docs:${f.id}:${f.missing}`,
    });
  }
  return rows.length;
}

function runReminderSweep() {
  const settings = Object.fromEntries(
    db.prepare('SELECT key, value FROM settings').all().map((r) => [r.key, r.value])
  );
  const on = (key) => settings[key] !== '0';
  const counts = {};
  try {
    if (on('notify_followup_due')) counts.followups = sweepFollowups();
    if (on('notify_meeting_reminder')) counts.meetings = sweepMeetings();
    if (on('notify_interview_reminder')) counts.interviews = sweepInterviews();
    if (on('notify_payment_due')) counts.payments = sweepPaymentDues();
    if (on('notify_missing_documents')) counts.documents = sweepMissingDocuments();
  } catch (err) {
    console.error('[reminders] sweep failed:', err.message);
  }
  return counts;
}

function startReminderScheduler(intervalMs = 60_000) {
  runReminderSweep();
  const timer = setInterval(runReminderSweep, intervalMs);
  timer.unref();
  return timer;
}

module.exports = { runReminderSweep, startReminderScheduler };
