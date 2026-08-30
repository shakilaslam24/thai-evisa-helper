'use strict';
/**
 * Create an administrator, or reset an existing user's password, at any time.
 *
 *   npm run admin -- --email you@company.com --password 'a-strong-password'
 *   npm run admin -- --email you@company.com            (generates a password)
 *   npm run admin -- --list                             (show the accounts)
 *
 * Unlike the first-run seed, this always takes effect — it is the way back in
 * when a password is lost or an admin email needs changing.
 */
const crypto = require('crypto');
const { db } = require('./db');
const { hashPassword } = require('./auth');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}

function listUsers() {
  const rows = db.prepare(
    'SELECT id, name, email, role, active FROM users ORDER BY role, name'
  ).all();
  if (!rows.length) {
    console.log('\nNo user accounts exist yet. Run:  npm run seed\n');
    return;
  }
  console.log('\nAccounts in this system:\n');
  for (const u of rows) {
    console.log(`  ${u.email.padEnd(32)} ${u.role.padEnd(9)} ${u.active ? '' : '(inactive)'}`);
  }
  console.log('\nForgotten a password? Reset it with:');
  console.log("  npm run admin -- --email <that email> --password 'new-password'\n");
}

function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) return listUsers();

  const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : null;
  if (!email || !email.includes('@')) {
    console.error('\nAn email address is required.\n');
    console.error("  npm run admin -- --email you@company.com --password 'a-strong-password'");
    console.error('  npm run admin -- --list\n');
    process.exitCode = 1;
    return;
  }

  const generated = typeof args.password !== 'string';
  const password = generated ? crypto.randomBytes(9).toString('base64url') : args.password;
  if (password.length < 8) {
    console.error('\nThe password must be at least 8 characters.\n');
    process.exitCode = 1;
    return;
  }

  const existing = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
  let action;
  if (existing) {
    db.prepare(`UPDATE users SET password_hash = ?, role = 'admin', active = 1,
                updated_at = datetime('now') WHERE id = ?`)
      .run(hashPassword(password), existing.id);
    // Any device signed in as this user must sign in again with the new password.
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
    action = 'updated — password reset, role set to admin';
  } else {
    db.prepare(`INSERT INTO users (name, email, password_hash, role)
                VALUES (?, ?, ?, 'admin')`)
      .run(typeof args.name === 'string' ? args.name : 'System Administrator',
        email, hashPassword(password));
    action = 'created';
  }

  console.log('\n──────────────────────────────────────────────');
  console.log(` Administrator account ${action}`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  if (generated) console.log('   (Generated — save it now, then change it in the app.)');
  console.log('──────────────────────────────────────────────\n');
  console.log('Now start the system and sign in:  npm start\n');
}

if (require.main === module) {
  run();
  db.close();
}

module.exports = { run };
