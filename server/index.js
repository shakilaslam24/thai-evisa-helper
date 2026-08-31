'use strict';
const path = require('path');
const express = require('express');
const { db } = require('./db');
const { loadUser } = require('./auth');
const { HttpError, describeDbError } = require('./helpers');
const { startReminderScheduler } = require('./reminders');
const { ensureSeed } = require('./seed');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');

/**
 * Only believe X-Forwarded-For when a reverse proxy really is in front of us.
 *
 * With this on unconditionally, anyone could send their own X-Forwarded-For and
 * Express would report it as req.ip — which is what the rate limiters count
 * against. Set TRUST_PROXY=1 in .env when nginx, Caddy or Cloudflare terminates
 * TLS; leave it unset when the app is reached directly.
 */
const TRUST_PROXY = process.env.TRUST_PROXY;
if (TRUST_PROXY && TRUST_PROXY !== '0' && TRUST_PROXY !== 'false') {
  app.set('trust proxy', Number(TRUST_PROXY) || TRUST_PROXY);
}
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  // Everything the pages need is served from this origin, so the policy can be
  // strict: no third-party scripts, no framing, no form posts elsewhere. If a
  // markup-escaping bug ever slips through, this is what stops it becoming
  // script execution.
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
  // Only meaningful over HTTPS, and only safe to send once TLS is actually in
  // place — otherwise a plain-HTTP trial pins browsers to a scheme it cannot serve.
  if (req.secure || req.get('X-Forwarded-Proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
});

app.use(loadUser);

// A cookie-authenticated API needs its own CSRF guard on state-changing calls.
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // Public tracking carries no session, so there is no authority to forge. It is
  // protected by requiring two matching details and by its own rate limit.
  if (req.path.startsWith('/track')) return next();
  if (req.get('X-Requested-With') !== 'DreamFlyCRM') {
    return res.status(403).json({ error: 'Missing request header — please reload the page' });
  }
  next();
});

app.use('/api/track', require('./routes/track'));   // public — no login required
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings').router);
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/followups', require('./routes/followups').router);
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/files', require('./routes/files').router);
app.use('/api/partners', require('./routes/partners'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/invoices', require('./routes/invoices').router);
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activities', require('./routes/activities'));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown endpoint' }));

// Anything that is not an API call falls through to the single-page app shell.
app.use((req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'That file is larger than the 15 MB limit' });
  }
  if (err && err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files at once — 10 is the limit' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed request body' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That request is too large' });
  }
  // A constraint the database refused is the user being told "no", not a fault.
  const constraint = describeDbError(err);
  if (constraint) return res.status(400).json({ error: constraint });

  console.error('[error]', err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

/**
 * Dates and times are stored and compared on the server's own clock, so that
 * clock has to be the office's. Left unset a Linux server runs on UTC, and in
 * Dhaka every reminder would then fire six hours late.
 */
function checkTimezone() {
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
  if (!process.env.TZ && offsetHours === 0) {
    console.warn('\n──────────────────────────────────────────────');
    console.warn(' WARNING: this server is running on UTC.');
    console.warn(' Follow-up and meeting reminders will fire at the wrong local time.');
    console.warn('\n Set your timezone in .env, then restart:');
    console.warn('   TZ=Asia/Dhaka');
    console.warn('──────────────────────────────────────────────\n');
  } else {
    console.log(`Timezone: ${zone} (UTC${offsetHours >= 0 ? '+' : ''}${offsetHours})`);
  }
}

if (require.main === module) {
  checkTimezone();
  ensureSeed();
  startReminderScheduler();
  const server = app.listen(PORT, () => {
    console.log(`DreamFly CRM running on http://localhost:${PORT}`);
  });
  const shutdown = () => {
    server.close(() => { db.close(); process.exit(0); });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
