'use strict';
const crypto = require('crypto');
const { db } = require('./db');
const { hashPassword } = require('./auth');
const C = require('./constants');

const DEFAULT_SETTINGS = {
  company_name: 'DreamFly Consultancy',
  company_tagline: 'Visa, Tour & Work Package Specialists',
  company_address: '',
  company_phone: '',
  company_phone_alt: '',
  company_email: '',
  company_website: '',
  company_logo_url: '',
  invoice_prefix: 'DF-INV',
  invoice_currency: 'BDT',
  invoice_footer: 'Thank you for choosing DreamFly Consultancy.',
  invoice_terms: 'Payment is due within 7 days of the invoice date.',
  notify_followup_due: '1',
  notify_meeting_reminder: '1',
  notify_payment_due: '1',
  notify_interview_reminder: '1',
  notify_missing_documents: '1',
};

function seedLookups() {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO lookups (type, value, sort_order) VALUES (?, ?, ?)'
  );
  const run = db.transaction(() => {
    C.DEFAULT_COUNTRIES.forEach((v, i) => insert.run('country', v, i));
    C.DEFAULT_SERVICES.forEach((v, i) => insert.run('service', v, i));
    C.DEFAULT_LEAD_SOURCES.forEach((v, i) => insert.run('lead_source', v, i));
    C.DEFAULT_DOC_CATEGORIES.forEach((v, i) => insert.run('document_category', v, i));
  });
  run();
}

function seedSettings() {
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const run = db.transaction(() => {
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insert.run(k, v);
  });
  run();
}

/**
 * Creates the first administrator. The password comes from ADMIN_PASSWORD when
 * set; otherwise a strong one is generated and printed once, so the system is
 * never deployed with a guessable default login.
 */
function seedAdmin() {
  const existing = db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'admin'").get().n;
  if (existing > 0) return null;

  const email = (process.env.ADMIN_EMAIL || 'admin@dreamfly.local').toLowerCase();
  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD
    || crypto.randomBytes(9).toString('base64url');

  db.prepare(`INSERT INTO users (name, email, password_hash, role)
              VALUES (?, ?, ?, 'admin')`)
    .run(process.env.ADMIN_NAME || 'System Administrator', email, hashPassword(password));

  console.log('\n──────────────────────────────────────────────');
  console.log(' DreamFly CRM — administrator account created');
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  if (generated) console.log('   (Generated once — save it now, then change it in the app.)');
  console.log('──────────────────────────────────────────────\n');
  return { email, password };
}

/** Runs on every boot; all steps are idempotent. */
function ensureSeed() {
  seedLookups();
  seedSettings();
  return seedAdmin();
}

/* --------------------------- optional demo data --------------------------- */

function seedDemo() {
  if (db.prepare('SELECT COUNT(*) n FROM leads').get().n > 0) {
    console.log('Demo data skipped — the database already has leads.');
    return;
  }
  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();

  const staffId = db.prepare(`INSERT INTO users (name, email, phone, password_hash, role)
    VALUES (?, ?, ?, ?, 'staff')`)
    .run('Rafiq Hasan', 'rafiq@dreamfly.local', '+8801711000001', hashPassword('demo-staff-2026'))
    .lastInsertRowid;
  db.prepare(`INSERT INTO users (name, email, phone, password_hash, role)
    VALUES (?, ?, ?, ?, 'accounts')`)
    .run('Nusrat Jahan', 'accounts@dreamfly.local', '+8801711000002', hashPassword('demo-accts-2026'));

  const partnerId = db.prepare(`INSERT INTO partners
    (partner_name, company_name, company_address, personal_phone, company_phone, whatsapp,
     email, trade_license, commission_note, status, created_by)
    VALUES (?,?,?,?,?,?,?,?,?, 'Active', ?)`)
    .run('Kamal Uddin', 'SkyGate Travels', 'Uttara, Dhaka', '+8801811000010', '+88029000010',
      '+8801811000010', 'kamal@skygate.example', 'TRAD-2026-118',
      'BDT 1,500 commission per approved file', admin.id).lastInsertRowid;

  const leads = [
    ['Tanvir Ahmed', '+8801712345678', 'Facebook', 'Tourist Visa', 'Thailand', 'Hot', 'Follow-up Running'],
    ['Shirin Akter', '+8801812345679', 'Referral', 'Work Package', 'Malaysia', 'Warm', 'Contacted'],
    ['Jahid Hossain', '+8801912345680', 'Walk-in', 'Student Visa', 'Canada', 'Cold', 'New Lead'],
    ['Farhana Islam', '+8801612345681', 'WhatsApp', 'Tour Package', 'Singapore', 'Hot', 'Meeting Fixed'],
  ];
  const addLead = db.prepare(`INSERT INTO leads
    (full_name, phone, whatsapp, source, service_type, country, priority, assigned_to,
     status, next_followup_at, initial_note, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const addFollowup = db.prepare(`INSERT INTO followups
    (entity_type, entity_id, due_at, note, assigned_to, created_by) VALUES ('lead',?,?,?,?,?)`);

  leads.forEach((l, i) => {
    const due = new Date(Date.now() + (i - 1) * 86400000).toISOString().slice(0, 16).replace('T', ' ');
    const id = addLead.run(l[0], l[1], l[1], l[2], l[3], l[4], l[5], staffId, l[6], due,
      'Enquiry received — send requirement list.', admin.id).lastInsertRowid;
    addFollowup.run(id, due, 'Call and confirm document status', staffId, admin.id);
  });

  const customerId = db.prepare(`INSERT INTO customers
    (given_name, surname, dob, passport_no, phone, email, address, gender, nationality,
     service_type, country, partner_id, assigned_to, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run('Mahmudul', 'Karim', '1992-04-11', 'BX0154892', '+8801713333333',
      'mahmud@example.com', 'Banani, Dhaka', 'Male', 'Bangladeshi',
      'Tourist Visa', 'Thailand', partnerId, staffId, admin.id).lastInsertRowid;

  const fileId = db.prepare(`INSERT INTO case_files
    (reference_no, customer_id, partner_id, country, service_type, file_type, submission_date,
     stage, status, assigned_to, interview_date, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(`DF-${new Date().getFullYear()}-0001`, customerId, partnerId, 'Thailand', 'Tourist Visa',
      'E-Visa', new Date().toISOString().slice(0, 10), 'Embassy submission', 'Under Processing',
      staffId, new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), admin.id).lastInsertRowid;

  const addCheck = db.prepare('INSERT INTO document_checklist (case_file_id, name, status) VALUES (?,?,?)');
  C.DEFAULT_CHECKLIST_ITEMS.forEach((name, i) => addCheck.run(fileId, name, i < 3 ? 'Received' : 'Missing'));

  const invoiceId = db.prepare(`INSERT INTO invoices
    (invoice_no, customer_id, case_file_id, issue_date, due_date, currency, subtotal, discount,
     tax, total, paid, status, notes, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(`DF-INV-${new Date().getFullYear()}-0001`, customerId, fileId,
      new Date().toISOString().slice(0, 10),
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      'BDT', 18000, 1000, 0, 17000, 0, 'Unpaid', 'Thailand tourist e-visa processing', admin.id)
    .lastInsertRowid;
  const addItem = db.prepare(`INSERT INTO invoice_items
    (invoice_id, description, quantity, unit_price, amount) VALUES (?,?,?,?,?)`);
  addItem.run(invoiceId, 'Thailand Tourist e-Visa — embassy fee', 1, 12000, 12000);
  addItem.run(invoiceId, 'Documentation & processing service charge', 1, 6000, 6000);

  db.prepare(`INSERT INTO payments (invoice_id, amount, method, paid_at, reference, received_by)
              VALUES (?,?,?,?,?,?)`)
    .run(invoiceId, 8000, 'bKash', new Date().toISOString().slice(0, 10), 'TRX8891234', admin.id);
  db.prepare("UPDATE invoices SET paid = 8000, status = 'Partial Paid' WHERE id = ?").run(invoiceId);
  db.prepare("UPDATE case_files SET payment_status = 'Partial Paid' WHERE id = ?").run(fileId);

  db.prepare(`INSERT INTO meetings (title, entity_type, entity_id, meeting_at, meeting_type,
    assigned_to, notes, created_by) VALUES (?,?,?,?,?,?,?,?)`)
    .run('Document handover — Farhana Islam', 'lead', 4,
      new Date(Date.now() + 3600000).toISOString().slice(0, 16).replace('T', ' '),
      'Office Visit', staffId, 'Bring original passport and bank statement', admin.id);

  console.log('Demo data created (staff login: rafiq@dreamfly.local / demo-staff-2026).');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--reset')) {
    const tables = ['payments', 'invoice_items', 'invoices', 'document_checklist', 'documents',
      'case_files', 'meetings', 'followups', 'customers', 'leads', 'partners',
      'activities', 'notifications', 'sessions'];
    db.exec('PRAGMA foreign_keys = OFF');
    for (const t of tables) db.exec(`DELETE FROM ${t}`);
    db.exec("DELETE FROM users WHERE role != 'admin'");
    db.exec('PRAGMA foreign_keys = ON');
    console.log('Transactional data cleared. Admin users and settings kept.');
  }
  ensureSeed();
  if (args.includes('--demo')) seedDemo();
  db.close();
}

module.exports = { ensureSeed, seedDemo, DEFAULT_SETTINGS };
