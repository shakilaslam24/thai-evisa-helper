'use strict';
const path = require('path');
const express = require('express');
const { db } = require('./db');
const { loadUser } = require('./auth');
const { HttpError } = require('./helpers');
const { startReminderScheduler } = require('./reminders');
const { ensureSeed } = require('./seed');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

app.use(loadUser);

// A cookie-authenticated API needs its own CSRF guard on state-changing calls.
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'DreamFlyCRM') {
    return res.status(403).json({ error: 'Missing request header — please reload the page' });
  }
  next();
});

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
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed request body' });
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

if (require.main === module) {
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
