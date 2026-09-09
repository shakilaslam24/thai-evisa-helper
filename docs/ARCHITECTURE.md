# Architecture

## The CRM boundary

DreamFly Consultancy already runs a separate custom CRM. **This website is a
completely standalone application.** It has:

- its own database (no shared tables, no cross-database foreign keys)
- its own authentication (no shared sessions, cookies or users)
- no CRM code, no CRM imports, no CRM migrations

Website enquiries are stored in, and managed from, this application's own admin
panel.

### How a future CRM integration would be added

The enquiry layer is deliberately modular so an integration can be added later
without rebuilding anything:

```
public form → /api/enquiries → createEnquiry() → Enquiry row
                                     └─→ dispatchEnquiry()   ← the seam
```

`src/lib/enquiries/dispatch.ts` contains `dispatchEnquiry()`, today a no-op. The
`Enquiry` model already carries `externalId`, `externalState` and
`externalSyncedAt` columns, unused. Adding a signed webhook push means
implementing that one function — no page, form or component changes.

`dispatchEnquiry()` is called **after** the row is committed and must swallow its
own errors, so an integration outage can never cost DreamFly a lead.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16, App Router, TypeScript | Static generation for SEO-critical pages, Server Actions for the admin, one deployable unit |
| Styling | Tailwind CSS v4 with CSS-variable design tokens | Tokens enforce the design system; the CMS edits content, never design |
| Database | SQLite via Prisma 7 (PostgreSQL-ready) | Zero operational overhead, backup is one file, no separate service to run |
| Auth | Node `crypto.scrypt` + database-backed sessions | No auth dependency, sessions are revocable, hashing parameters are stored per-hash so they can be raised later |
| Validation | Zod, shared client and server | One schema per form; the server is always the authority |
| Images | `next/image`, plus `sharp` at upload time | AVIF/WebP delivery, metadata stripped, size capped |

**Deliberately not used:** a component library, an animation library, a state
manager, a form library, a CAPTCHA service. Each would have added weight for
something the platform already does well.

### Why SQLite

The site is read-heavy, single-instance and low-write. SQLite removes an entire
service from the deployment, makes the backup a file copy, and is faster than a
networked database for this workload. The schema is written to be portable —
no native enums, arrays or JSON columns — so moving to PostgreSQL is a
`provider` change plus a fresh migration. See [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Rendering and caching

| Route type | Strategy |
|---|---|
| Marketing pages, visa and tour detail | Static with ISR (`revalidate = 300`) |
| `sitemap.xml`, `robots.txt`, manifest | Static, hourly revalidation |
| `/api/enquiries` | Dynamic |
| `/admin/**` | `force-dynamic`, never cached |

Admin mutations call `revalidatePath()` on the routes they affect, so a content
change is live immediately rather than after the revalidation window.

---

## Data model

```
AdminUser ──< AdminSession
     └─────< AuditLog

GlobalSettings (single row, id="global")   ← all business information
Media ──────────── referenced by everything, ON DELETE SET NULL

HomeSection    fixed set of section types: enabled + order + copy
HomeHero       single row
HomeService    the four service cards
HomeWhyItem    the "Why DreamFly" list

VisaDestination ──< VisaDocument
                ──< VisaFaq
                ──< VisaGalleryImage

TourPackage ──< TourHighlight
            ──< TourItineraryDay
            ──< TourListItem   (kind = "include" | "exclude")
            ──< TourGalleryImage

Campaign        scheduled homepage band
Testimonial     only real, published entries are ever rendered
AboutPage, AboutGalleryImage, TeamMember, Milestone
PageSeo         per-page overrides for the fixed marketing pages

Enquiry ──< EnquiryNote
```

### Two conventions worth knowing

**Delimited list columns.** `categories`, `visaFormats` and `entryTypes` store
comma-separated keys rather than a relation or a native array, so the same
schema runs unchanged on SQLite and PostgreSQL. `src/lib/list.ts` parses them.

**Type-specific enquiry data.** `Enquiry` holds the columns every enquiry
shares; the fields unique to a form (flight route, hotel dates, B2B company
profile) live in `payloadJson`. One table, one inbox, no schema churn when a
form gains a field.

### Placeholder content

Every content model carries `isPlaceholder`. Public queries in
`src/lib/content.ts` filter on `{ status: "published", isPlaceholder: false }`,
so seeded sample rows can never reach a visitor whatever their status. The admin
marks them clearly and blocks publishing until the flag is cleared.

---

## Routes

### Public

| Route | Rendering |
|---|---|
| `/` | Static (ISR) |
| `/visa` · `/visa/[slug]` | Static + `generateStaticParams` |
| `/tours` · `/tours/[slug]` | Static + `generateStaticParams` |
| `/air-ticket-hotel` | Static (ISR) |
| `/b2b` · `/about` · `/contact` | Static (ISR) |
| `/sitemap.xml` · `/robots.txt` · `/manifest.webmanifest` | Generated from Global Settings |

### Admin

`/admin/login`, then `/admin` (dashboard), `/admin/home`, `/admin/visa`,
`/admin/tours`, `/admin/campaigns`, `/admin/testimonials`, `/admin/about`,
`/admin/media`, `/admin/enquiries`, `/admin/seo`, `/admin/settings`,
`/admin/audit`.

Roles: `owner` > `admin` > `editor`. Editors manage content; admins additionally
manage settings, deletions and the export/activity log.

---

## Design system

Brand colours are taken from the official palette supplied with the logo:

| Token | Value | Use |
|---|---|---|
| `--color-navy-900` | `#101F40` | Primary |
| `--color-gold-400` | `#C19864` | Accent |
| `--color-gold-200` | `#E5CA9B` | Light accent |
| `--color-canvas` | `#FBFAF8` | Page background |

Roughly 80% white/off-white, 15% navy, 5% gold. Gold is reserved for eyebrows,
hairlines, active states and small accents — never large fills.

**Typography.** Plus Jakarta Sans for display (its geometric forms echo the logo
wordmark), Inter for UI and body copy. Both self-hosted by `next/font`, so there
is no render-blocking request to a font CDN.

All tokens live in `src/app/globals.css`. They are design-owned: the CMS changes
content, never these values.

### Photography, and the absence of it

Every image is a CMS field. Where none is set, `BrandPanel` renders a designed
navy field with a flight-path motif drawn from the logo's wing geometry. This
means the site looks finished before a single photograph is uploaded, and it
avoids shipping stock imagery that DreamFly does not own.

---

## Anti-spam

No CAPTCHA and no third-party script. Three layers instead:

1. **Honeypot** — a visually hidden `company_website` field. Only a bot fills it.
2. **Timing** — a submission under 2.5 seconds after render is treated as a bot.
3. **Rate limiting** — 5 submissions per IP per 10 minutes.

A caught submission receives an ordinary success response, so a bot gets no
signal about which control caught it.

---

## Campaign attribution

UTM parameters and the landing page are captured once per browser session into
`sessionStorage` (`src/lib/attribution.ts`) and attached to any enquiry
submitted in that session. No cookies, no third-party calls, no personal data,
and everything is discarded when the tab closes.

The result: each enquiry in the admin panel shows which Meta or Google campaign
produced it.
