# DreamFly Consultancy — CRM & Management System

A complete business management system for a visa, tour and work-package consultancy:
leads, follow-up, meetings, customers, case files, B2B partners, documents, invoices,
payments, reports and staff performance — in one place.

Built as a small, self-contained Node.js application with a SQLite database and a
zero-build front end, so it runs on any modest VPS or shared Node host.

---

## Quick start

```bash
npm install
npm start
```

Then open <http://localhost:3000>.

On the very first run the system creates an administrator account and prints the
credentials **once** to the console:

```
──────────────────────────────────────────────
 DreamFly CRM — administrator account created
   Email:    admin@dreamfly.local
   Password: <generated>
   (Generated once — save it now, then change it in the app.)
──────────────────────────────────────────────
```

`ADMIN_EMAIL` / `ADMIN_PASSWORD` set those values, but **only when the very
first admin is created**. To create an administrator or reset a password at any
time — including when a password is lost — use:

```bash
npm run admin -- --email you@dreamfly.com --password 'a-strong-password'
npm run admin -- --list      # show which accounts exist
```

### Sample data (optional)

To explore the system with realistic records before entering your own:

```bash
npm run seed -- --demo
```

---

## Configuration

Copy `.env.example` and set the values, or export them in your process manager.

| Variable         | Purpose                                                        | Default        |
| ---------------- | -------------------------------------------------------------- | -------------- |
| `PORT`           | HTTP port                                                       | `3000`         |
| `NODE_ENV`       | Set to `production` to mark session cookies `Secure` (needs HTTPS) | `development` |
| `DATA_DIR`       | Where the database and uploaded documents are stored             | `./data`       |
| `ADMIN_EMAIL`    | Email of the first administrator (first run only — otherwise use `npm run admin`) | `admin@dreamfly.local` |
| `ADMIN_PASSWORD` | Password of the first administrator (first run only — otherwise use `npm run admin`) | generated      |
| `ADMIN_NAME`     | Display name of the first administrator                          | `System Administrator` |

Everything else — company details, invoice template, countries, service categories,
lead sources, document categories, users and notification rules — is configured
inside the app under **Settings**.

---

## What is included

| Module | Highlights |
| --- | --- |
| **Dashboard** | Leads, today's and overdue follow-up, today's meetings, customers, active/processing/completed/interview/rejected files, partners, invoices, pending payments, monthly sales summary. "Whole company" and "My work" views. |
| **Leads** | Full enquiry capture, source, priority, assignment, status pipeline, call/WhatsApp shortcuts, one-click conversion to a customer. |
| **Follow-up** | Scheduled follow-ups with due/overdue/upcoming queues, completion outcomes and automatic chaining to the next follow-up. |
| **Meetings** | Office/phone/video/follow-up meetings with per-meeting reminder windows and scheduled/completed/rescheduled/cancelled states. |
| **Customers** | Full traveller profile, passport and NID details, linked B2B partner, files, invoices, documents and activity history. |
| **Files / Cases** | Auto-generated reference numbers, twelve-stage status tracking, submission/embassy/interview/completion dates, per-file document checklist. |
| **B2B Partners** | Company and personal contacts, trade licence, commission and agreement notes, plus a partner dashboard of files, approvals, rejections, invoices and payments. Includes the one-step "add file under partner" entry. |
| **Documents** | Upload, categorise, preview, download and delete files against any record; every document lists whose it is (name, passport, file reference), is searchable by those, and filterable by who uploaded it. Missing-document tracking per case file. |
| **Invoices** | Automatic numbering, line items, discount and tax, print and PDF output, per-file and per-partner billing. |
| **Payments** | Part payments, seven payment methods, automatic invoice and file payment-status roll-up. |
| **Reports** | Twelve reports covering leads, conversion, sources, follow-up, files, countries, partners, invoices, dues, collections and staff — each exportable to CSV. |
| **Staff performance** | Leads handled, conversions, follow-ups completed, overdue items, meetings, files, approvals, rejections and revenue per team member. |
| **Notifications** | In-app alerts for due and overdue follow-up, meeting reminders, interview dates, payment dues and missing documents. Overdue items re-notify daily rather than once, escalate to managers after two days, show an unread count in the browser tab, and can pop desktop alerts. |
| **Client tracking** | A public page at `/track.html` where a client enters their passport number and name to see their own application status, key dates and outstanding documents — no login, rate limited, and carrying none of the internal record. |
| **Settings** | Company profile, invoice and file-reference numbering, nine editable dropdown lists (countries, services, lead sources, document categories, payment methods, meeting types, the default file checklist, plus custom lead and file statuses), users and roles, notification switches. |

## User roles

| Role | Access |
| --- | --- |
| **Admin** | Everything, including users and settings. Only an admin can delete a case file, an uploaded document or a customer. |
| **Manager** | Leads, customers, partners, files, follow-up, meetings, documents, invoices, payments and reports. |
| **Staff / Executive** | Leads, follow-up, meetings, customers, files, documents and notes. Their dashboard shows only their own work — company-wide figures are limited to admins and managers. |
| **Accounts / Finance** | Invoices, payments, due reports and financial summaries. Read access elsewhere; their dashboard is scoped to their own work. |
| **B2B Partner** | Limited login that only ever sees the files and invoices under its own partner account. |

---

## Deployment

The application is a single Node process with a file-backed database. Nothing else
is required — no separate database server, no build step.

```bash
# on the server
git clone <your-repo> dreamfly-crm && cd dreamfly-crm
npm ci --omit=dev
NODE_ENV=production PORT=3000 DATA_DIR=/var/lib/dreamfly node server/index.js
```

Keep it running with a process manager, for example systemd:

```ini
# /etc/systemd/system/dreamfly.service
[Unit]
Description=DreamFly CRM
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/dreamfly-crm
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATA_DIR=/var/lib/dreamfly
ExecStart=/usr/bin/node server/index.js
Restart=always
User=dreamfly

[Install]
WantedBy=multi-user.target
```

Then put Nginx (or Caddy) in front to terminate TLS and proxy to port 3000.
**Run behind HTTPS in production** — session cookies are only marked `Secure`
when `NODE_ENV=production`, and passwords should never travel in the clear.

### Running it day to day

| Task | Command |
| --- | --- |
| Health check | `npm run doctor` |
| Back up now | `npm run backup` |
| List backups | `npm run backup -- --list` |
| Roll back | `npm run restore -- --latest` |
| Update to the latest version | `npm run update` |
| Create an admin / reset a password | `npm run admin -- --email … --password '…'` |

`docs/OPERATIONS.md` covers all of this in detail (in Bengali), including the
cron entry for nightly backups and what to do when something breaks.

### Backups

Everything lives under `DATA_DIR` — `dreamfly.db` and `uploads/`. `npm run backup`
copies the database through SQLite's backup API (safe while the server is
running) and mirrors new uploads, keeping the last 14 sets. Schedule it nightly:

```
0 3 * * * cd /opt/dreamfly-crm && /usr/bin/npm run backup >> /var/log/dreamfly-backup.log 2>&1
```

Keep a copy off the server as well — a backup on the same disk does not survive
losing that disk.

---

## Project layout

```
server/
  index.js        Express app, security headers, error handling
  db.js           SQLite connection and schema
  auth.js         Password hashing (scrypt), sessions, role guards
  helpers.js      Query building, validation, activity log, notifications
  constants.js    Statuses, roles and the permission matrix
  reminders.js    Scheduled sweep that raises notifications
  seed.js         First-run setup and optional demo data
  routes/         One router per module
public/
  index.html      App shell
  css/app.css     Design system (light + dark)
  js/             ES modules — no build step
    api.js  store.js  ui.js  router.js  shell.js  login.js  app.js
    views/        One view per module
tools/evisa/      Standalone passport OCR helper (see below)
docs/USER_GUIDE.md
```

## Security notes

- Passwords are hashed with `scrypt` and a per-user salt; they are never stored or logged in the clear.
- Sessions are random 256-bit tokens in `HttpOnly`, `SameSite=Lax` cookies, expiring after 7 days.
- State-changing API calls require a custom request header, which blocks cross-site form posts.
- Uploads are restricted by MIME type and size, stored under generated names, and served only through an authenticated endpoint.
- Role checks are enforced on the server for every write, not only hidden in the UI.
- The last active administrator cannot be demoted or deactivated.

## Testing

A step-by-step run-and-test guide, written in Bengali, is in
[`docs/TESTING-CHECKLIST.md`](docs/TESTING-CHECKLIST.md) — it walks through
starting the system and ticking off every module against the requirement
document.

## Passport OCR helper

The original Thai e-Visa OCR tool is preserved at `/tools/evisa/` — open
<http://localhost:3000/tools/evisa/> to read passport MRZ details from an image
before typing them into a customer profile. It runs entirely in the browser.

## Future modules

The data model and API were built to extend: WhatsApp and SMS reminders, email
integration, a client portal, partner self-service login (the `partner` role and
its scoping already exist), automated invoice sending, payment gateways and a
mobile app can all be added without reshaping the database.
