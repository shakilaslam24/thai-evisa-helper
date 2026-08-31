'use strict';
/**
 * Field validation, shared by every write endpoint.
 *
 * The rules are deliberately forgiving about *format* and strict about
 * *impossibility*. Bangladeshi contact details arrive in a dozen shapes —
 * +8801711…, 01711…, with dashes, with spaces — and rejecting a real number
 * because of a dash helps nobody. What is rejected is data that cannot be true:
 * a date of birth in the future, a passport that expired before it was issued,
 * an address longer than a page, a country the system has never heard of.
 *
 * Every check here runs on the server. The browser repeats some of them for a
 * faster answer, but nothing depends on the browser having done so.
 */
const { bad } = require('./helpers');

const LIMITS = {
  name: 120,
  short: 80,       // passport, NID, licence numbers
  phone: 32,
  email: 160,
  line: 255,       // single-line free text
  address: 500,
  notes: 4000,
};

const trimmed = (v) => (v === undefined || v === null ? null : String(v).trim() || null);

/** Length caps stop a paste accident from breaking every screen that shows it. */
function text(value, label, max) {
  const v = trimmed(value);
  if (v === null) return null;
  if (v.length > max) bad(`${label} is too long — ${v.length} characters, the limit is ${max}`);
  return v;
}

/**
 * Deliberately permissive: one @, something either side, a dot in the domain.
 * Anything stricter starts rejecting addresses that genuinely work.
 */
function email(value, label = 'Email') {
  const v = text(value, label, LIMITS.email);
  if (v === null) return null;
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v)) {
    bad(`${label} does not look like an email address: "${v}"`);
  }
  return v.toLowerCase();
}

/** Digits, spaces, dashes, brackets and a leading +. Needs 6–15 actual digits. */
function phone(value, label = 'Phone number') {
  const v = text(value, label, LIMITS.phone);
  if (v === null) return null;
  if (!/^\+?[\d\s().-]+$/.test(v)) {
    bad(`${label} may only contain digits, spaces and + ( ) - : "${v}"`);
  }
  const digits = v.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15) {
    bad(`${label} has ${digits.length} digits — a real number has between 6 and 15`);
  }
  return v;
}

/** A real calendar date in YYYY-MM-DD. Rejects 2026-02-31 as well as gibberish. */
function date(value, label) {
  const v = trimmed(value);
  if (v === null) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) bad(`${label} must be a date in YYYY-MM-DD form, not "${v}"`);
  const [, y, mo, d] = m.map(Number);
  const parsed = new Date(Date.UTC(y, mo - 1, d));
  if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== mo - 1 || parsed.getUTCDate() !== d) {
    bad(`${label} is not a real date: "${v}"`);
  }
  return v;
}

/** A date-and-time as the browser sends it: YYYY-MM-DD HH:MM (or with a T). */
function dateTime(value, label) {
  const v = trimmed(value);
  if (v === null) return null;
  const normalised = v.replace('T', ' ').slice(0, 16);
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})$/.exec(normalised);
  if (!m) bad(`${label} must be a date and time in YYYY-MM-DD HH:MM form, not "${v}"`);
  date(m[1], label);
  if (Number(m[2]) > 23 || Number(m[3]) > 59) bad(`${label} has an impossible time: "${v}"`);
  return normalised;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function pastDate(value, label) {
  const v = date(value, label);
  if (v !== null && v > todayISO()) bad(`${label} cannot be in the future: "${v}"`);
  return v;
}

/** Nobody in a passport office is 130 years old, and nobody is born tomorrow. */
function birthDate(value, label = 'Date of birth') {
  const v = pastDate(value, label);
  if (v === null) return null;
  const year = Number(v.slice(0, 4));
  const thisYear = new Date().getFullYear();
  if (year < thisYear - 130) bad(`${label} is too far in the past: "${v}"`);
  return v;
}

/**
 * An expiry may be in the past — an expired passport is a real situation the
 * office needs to record and chase. What it may not be is before the traveller
 * was born.
 */
function expiryDate(value, dob, label = 'Passport expiry') {
  const v = date(value, label);
  if (v === null) return null;
  if (dob && v <= dob) bad(`${label} cannot be on or before the date of birth`);
  return v;
}

/**
 * Values chosen from a list the office maintains. Unknown values are refused
 * rather than stored, because a country nobody configured drops silently out of
 * every country-wise report.
 */
function fromList(value, allowed, label) {
  const v = trimmed(value);
  if (v === null) return null;
  const match = allowed.find((a) => a.toLowerCase() === v.toLowerCase());
  if (!match) {
    bad(`${label} "${v}" is not on the list. Add it in Settings first, or pick an existing one.`);
  }
  return match;
}

/** Positive money with at most two decimals, and a ceiling that catches typos. */
function money(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n)) bad(`${label} must be a number`);
  if (n < 0) bad(`${label} cannot be negative`);
  if (n > 1e11) bad(`${label} is implausibly large — please check the figure`);
  return Math.round(n * 100) / 100;
}

module.exports = { LIMITS, text, email, phone, date, dateTime, pastDate, birthDate, expiryDate, fromList, money, trimmed };
