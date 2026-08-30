'use strict';
/**
 * Dropdown vocabularies = built-in values + whatever the admin added in Settings.
 *
 * Some lists are fully editable (countries, services, payment methods…). Others
 * keep a locked core because reports and dashboards count on those exact values
 * existing — "Approved", "Rejected", "Converted" and so on. For those, an admin
 * can add their own statuses on top, but cannot delete the ones the system
 * reasons about.
 */
const { db } = require('./db');
const C = require('./constants');

/** Lists whose built-in values are locked; admins may only add to them. */
const LOCKED_CORE = {
  lead_status: C.LEAD_STATUSES,
  file_status: C.FILE_STATUSES,
};

/** Lists an admin fully controls, seeded with sensible defaults. */
const EDITABLE = {
  country: C.DEFAULT_COUNTRIES,
  service: C.DEFAULT_SERVICES,
  lead_source: C.DEFAULT_LEAD_SOURCES,
  document_category: C.DEFAULT_DOC_CATEGORIES,
  payment_method: C.PAYMENT_METHODS,
  meeting_type: C.MEETING_TYPES,
  checklist_item: C.DEFAULT_CHECKLIST_ITEMS,
};

const ALL_TYPES = [...Object.keys(EDITABLE), ...Object.keys(LOCKED_CORE)];

const customValues = (type) => db.prepare(
  'SELECT value FROM lookups WHERE type = ? AND active = 1 ORDER BY sort_order, value'
).all(type).map((r) => r.value);

/**
 * Every value currently accepted for a list. For locked lists the built-in core
 * always comes first, so a saved record can never be orphaned by an edit.
 */
function values(type) {
  const core = LOCKED_CORE[type] || [];
  const custom = customValues(type).filter((v) => !core.includes(v));
  return [...core, ...custom];
}

/** Which entries the Settings screen must show as undeletable. */
const lockedValues = (type) => LOCKED_CORE[type] || [];

const isEditableType = (type) => Object.prototype.hasOwnProperty.call(EDITABLE, type)
  || Object.prototype.hasOwnProperty.call(LOCKED_CORE, type);

/** A single settings value with a fallback, e.g. the file reference prefix. */
function setting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  const value = row && row.value !== null ? String(row.value).trim() : '';
  return value || fallback;
}

module.exports = { values, lockedValues, isEditableType, setting, ALL_TYPES, EDITABLE, LOCKED_CORE };
