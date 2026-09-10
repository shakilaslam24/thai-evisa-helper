# DreamFly Consultancy — Website

The official website for **DreamFly Consultancy** — *Fly Beyond Your Dreams*.

A standalone Next.js application with its own lightweight CMS, its own database
and its own admin panel. Visa destinations, tour packages, campaigns, contact
details and SEO are all edited from the admin panel — no code changes required.

> **CRM boundary.** This application is completely separate from the DreamFly
> CRM. It does not read from it, write to it, share authentication with it, or
> import any of its code. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Quick start

```bash
npm install                   # also generates the Prisma client
cp .env.example .env          # then fill in SESSION_SECRET and NEXT_PUBLIC_SITE_URL
npx prisma migrate deploy     # create the database
npm run db:seed               # settings, homepage structure, sample content
npm run admin:create          # create your first admin user
npm run dev                   # http://localhost:3000
```

> The Prisma client is generated code and is not committed. `npm install` runs
> `prisma generate` for you, so a fresh clone is ready to seed straight away.

Sign in at `/admin/login`.

### Generate a session secret

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm install` | Install dependencies and generate the Prisma client |
| `npm run dev` | Development server |
| `npm run build` | Generate the client, apply migrations, build for production |
| `npm start` | Run the production build |
| `npm test` | Unit tests — auth, validation, parsing, rate limiting, CRM isolation |
| `npm run test:e2e` | Public flows against a running server |
| `npm run test:admin` | Every admin module: create, edit, publish, delete |
| `npm run test:security` | Access control, headers, injection, rate limiting |
| `npm run test:a11y` | Accessibility plus admin responsiveness |
| `npm run test:audit` | Every page at 8 widths, 320px → 1920px |
| `npm run demo:load` / `demo:list` / `demo:clear` | Demo content for design review |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:migrate` | Create and apply a migration in development |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:seed` | Seed settings, homepage structure and sample content |
| `npm run db:studio` | Browse the database |
| `npm run admin:create` | Create or update an admin user |
| `npm run backup` | Consistent snapshot of the database plus uploads |

---

## Documentation

| Document | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, data model, routes, design system, the CRM boundary |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Server setup, environment, PostgreSQL migration, backups |
| [docs/ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md) | How the DreamFly team manages the site day to day |
| [docs/PRE-LAUNCH.md](docs/PRE-LAUNCH.md) | Checklist to work through before going live |
| [docs/SECURITY.md](docs/SECURITY.md) | Security model and checklist |

---

## Two rules worth knowing before you edit content

**1. Sample content is never published.** Seeded example rows carry an
`isPlaceholder` flag. Public queries exclude them regardless of their status, so
demo copy can never be mistaken for real business information. Clear the flag in
the editor once the record holds real data.

**2. Nothing about DreamFly is hard-coded.** Phone numbers, WhatsApp, address,
social links, analytics IDs and SEO defaults all come from **Global Settings**.
Change them there and every page updates.

Phone numbers, email addresses and office hours are **repeatable rows**, not
fixed fields — adding a hotline or a B2B line is an admin task, never a code
change. Each number carries its own label, its own WhatsApp switch, and its own
choice of where it appears.

---

## Repository layout

```
prisma/          schema, migrations, seed
public/brand/    official DreamFly logo assets and generated icons
data/            SQLite database + uploaded media (gitignored — back this up)
scripts/         admin creation, backup
src/app/(site)/  public website
src/app/admin/   admin panel
src/app/api/     public enquiry endpoint
src/components/  ui / site / forms / home / admin
src/lib/         auth, db, settings, seo, validation, enquiries
tests/           unit tests
legacy/          an unrelated earlier prototype, kept for reference only
```
