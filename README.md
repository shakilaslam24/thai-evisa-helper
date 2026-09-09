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
npm install
cp .env.example .env          # then fill in SESSION_SECRET and NEXT_PUBLIC_SITE_URL
npx prisma migrate deploy     # create the database
npm run db:seed               # settings, homepage structure, sample content
npm run admin:create          # create your first admin user
npm run dev                   # http://localhost:3000
```

Sign in at `/admin/login`.

### Generate a session secret

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Generate the client, apply migrations, build for production |
| `npm start` | Run the production build |
| `npm test` | Unit tests (39 assertions over auth, validation, parsing, rate limiting) |
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

---

## Repository layout

```
prisma/          schema, migrations, seed
public/brand/    official DreamFly logo assets and generated icons
public/uploads/  admin-uploaded media (gitignored — back this up)
scripts/         admin creation, backup
src/app/(site)/  public website
src/app/admin/   admin panel
src/app/api/     public enquiry endpoint
src/components/  ui / site / forms / home / admin
src/lib/         auth, db, settings, seo, validation, enquiries
tests/           unit tests
legacy/          an unrelated earlier prototype, kept for reference only
```
