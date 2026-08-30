'use strict';
/**
 * Public application tracking — no login.
 *
 * A client enters their passport number and their name and sees where their
 * application stands. Two facts are required rather than one, so a passport
 * number on its own opens nothing, and attempts are rate limited so the pair
 * cannot be guessed by brute force.
 *
 * Name rather than date of birth is the second factor because a date of birth
 * is often not captured when a client hands over their details, which would
 * leave those clients unable to track anything at all.
 *
 * The response is deliberately narrow: status and dates yes, but never phone
 * numbers, addresses, notes, invoice amounts or internal remarks.
 */
const express = require('express');
const { db } = require('./../db');
const { wrap, bad, HttpError } = require('../helpers');
const vocab = require('../vocab');

const router = express.Router();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 12;
const attempts = new Map();

function rateLimit(req) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    const minutes = Math.ceil((entry.resetAt - now) / 60000);
    throw new HttpError(429, `Too many attempts. Please try again in ${minutes} minute(s).`);
  }
}

// Occasional sweep so the attempt map cannot grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) if (now > entry.resetAt) attempts.delete(key);
}, WINDOW_MS).unref();

const isEnabled = () => vocab.setting('public_tracking', '1') !== '0';

/** Ignore case, punctuation and spacing so ordinary typing still matches. */
const normalise = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9\u0980-\u09FF ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Accepts the full name, just the given name, or just the surname, in any word
 * order — passports and everyday use disagree about which name comes first.
 *
 * The comparison runs both ways: every word typed appears in the stored name,
 * or every stored word appears in what was typed. The second direction matters
 * here, where a record saved as "Mahmudul Karim" is routinely written out as
 * "Md. Mahmudul Karim". Either way the client has to know the real name, so a
 * single common word still opens nothing.
 */
function nameMatches(entered, customer) {
  const typed = normalise(entered);
  if (typed.length < 3) return false;

  const given = normalise(customer.given_name);
  const surname = normalise(customer.surname);
  const full = normalise(`${customer.given_name} ${customer.surname || ''}`);
  if (typed === full || (given && typed === given) || (surname && typed === surname)) return true;

  const storedWords = full.split(' ').filter(Boolean);
  const typedWords = typed.split(' ').filter(Boolean);
  if (!storedWords.length || !typedWords.length) return false;

  const stored = new Set(storedWords);
  const supplied = new Set(typedWords);
  return typedWords.every((w) => stored.has(w))
    || storedWords.every((w) => supplied.has(w));
}

/** How far along the application is, for a simple progress bar. */
const STAGE_ORDER = [
  'Draft', 'Documents Pending', 'Ready for Submission', 'Submitted',
  'Under Processing', 'Interview Called', 'Approved', 'Delivered', 'Completed',
];

function progressFor(status) {
  if (status === 'Rejected') return { step: 0, total: STAGE_ORDER.length, done: true };
  const index = STAGE_ORDER.indexOf(status);
  if (index < 0) return { step: 0, total: STAGE_ORDER.length, done: false };
  return {
    step: index + 1,
    total: STAGE_ORDER.length,
    done: ['Approved', 'Delivered', 'Completed'].includes(status),
  };
}

/** Plain-language wording, because clients do not know internal vocabulary. */
const CLIENT_MESSAGE = {
  Draft: 'Your file has been opened. We are preparing your application.',
  'Documents Pending': 'We are waiting for some documents from you. Please see the list below.',
  'Ready for Submission': 'Your file is complete and ready to be submitted.',
  Submitted: 'Your application has been submitted.',
  'Under Processing': 'Your application is being processed.',
  'Additional Documents Required': 'Additional documents have been requested. Please see the list below.',
  'Interview Called': 'You have been called for an interview. Please check the interview date below.',
  Approved: 'Good news — your application has been approved.',
  Rejected: 'Your application was not approved. Please contact our office.',
  Delivered: 'Your documents have been handed over. Thank you.',
  Completed: 'This application is complete. Thank you.',
  Hold: 'Your application is currently on hold. Please contact our office.',
};

router.get('/settings', wrap((req, res) => {
  const company = Object.fromEntries(
    db.prepare('SELECT key, value FROM settings').all().map((r) => [r.key, r.value])
  );
  res.json({
    data: {
      enabled: isEnabled(),
      company_name: company.company_name || 'DreamFly Consultancy',
      company_tagline: company.company_tagline || '',
      company_logo_url: company.company_logo_url || '',
      company_phone: company.company_phone || '',
      company_email: company.company_email || '',
    },
  });
}));

router.post('/', wrap((req, res) => {
  if (!isEnabled()) throw new HttpError(404, 'Online tracking is not available.');
  rateLimit(req);

  const passport = String(req.body.passport_no || '').trim();
  const name = String(req.body.name || '').trim();
  if (!passport || !name) bad('Please enter both your passport number and your name.');
  if (normalise(name).length < 3) bad('Please enter your name as written in your passport.');

  const candidates = db.prepare(
    'SELECT id, given_name, surname FROM customers WHERE upper(passport_no) = upper(?)'
  ).all(passport);
  const customer = candidates.find((c) => nameMatches(name, c));

  // One message for "no such passport" and "wrong name", so the form cannot be
  // used to discover which passport numbers exist in the system.
  const notFound = () => res.status(404).json({
    error: 'No application found for those details. Please check the passport number and name, or contact our office.',
  });
  if (!customer) return notFound();

  const files = db.prepare(`
    SELECT id, reference_no, country, service_type, status, submission_date,
           interview_date, embassy_date, completion_date, updated_at
    FROM case_files WHERE customer_id = ? ORDER BY created_at DESC
  `).all(customer.id);
  if (!files.length) return notFound();

  const missingFor = db.prepare(
    "SELECT name FROM document_checklist WHERE case_file_id = ? AND status = 'Missing' ORDER BY id"
  );

  res.json({
    data: {
      name: `${customer.given_name} ${customer.surname || ''}`.trim(),
      applications: files.map((f) => ({
        reference_no: f.reference_no,
        country: f.country,
        service_type: f.service_type,
        status: f.status,
        message: CLIENT_MESSAGE[f.status] || 'Your application is in progress.',
        progress: progressFor(f.status),
        submission_date: f.submission_date,
        interview_date: f.interview_date,
        embassy_date: f.embassy_date,
        completion_date: f.completion_date,
        last_updated: f.updated_at,
        documents_needed: missingFor.all(f.id).map((r) => r.name),
      })),
    },
  });
}));

module.exports = router;
