# Security

## Authentication

- Passwords are hashed with Node's built-in **scrypt** (N=32768, r=8, p=1,
  64-byte key, 16-byte random salt). Parameters are stored alongside each hash,
  so they can be raised later without invalidating existing passwords.
- A **minimum policy** is enforced on creation: 12+ characters, mixed case, a
  digit.
- Sessions are **database-backed**. The cookie carries a 256-bit random token;
  only its SHA-256 digest (salted with `SESSION_SECRET`) is stored, so a
  database leak does not yield usable session tokens.
- Cookies are `httpOnly`, `sameSite=lax`, `secure` in production, and expire
  after 8 hours with a sliding renewal.
- Changing a password **deletes every session** for that user.
- Sign-in failures are **deliberately vague** ("Those details don't match an
  active account") and run a hash verification even when no account exists, so
  neither the message nor the response time reveals whether an email is
  registered.

## Rate limiting

| Surface | Limit |
|---|---|
| Enquiry submission | 5 per IP per 10 minutes |
| Sign-in, per IP | 10 per 15 minutes |
| Sign-in, per account | 8 per 15 minutes |

The per-account limit means one account cannot be ground down from many
addresses. Counters are held in process memory — see
[DEPLOYMENT.md](DEPLOYMENT.md#moving-to-postgresql) before scaling out.

## Authorisation

Three roles, checked server-side on **every** admin page and action via
`requireAdmin(minimumRole)`:

| Role | Can |
|---|---|
| `editor` | Manage content |
| `admin` | Also: global settings, deletions, CSV export, activity log |
| `owner` | Everything |

Client-side hiding is presentation only; the server check is the control.

## Input and output

- Every public form and every admin action is validated with **Zod on the
  server**, regardless of what the browser did.
- React escapes all interpolated content. The only `dangerouslySetInnerHTML` in
  the codebase renders JSON-LD built from typed objects, with `<` escaped.
- CMS-supplied links pass through `safeHref()`, which permits only relative,
  `https:`, `http:`, `mailto:` and `tel:` URLs — `javascript:` and `data:` are
  rejected. Covered by a unit test.
- CSV export neutralises leading `=`, `+`, `-` and `@`, so a crafted enquiry
  cannot become a live formula in a spreadsheet.

## File uploads

1. Size is capped before the file is read into memory.
2. The type is decided by **magic bytes**, never by the filename or the
   browser-supplied Content-Type.
3. **SVG is refused** — it is a script container, and nothing here needs
   uploaded vector art.
4. Everything is re-encoded through `sharp`, which strips EXIF (including GPS
   coordinates) and guarantees the output is really the format claimed.
5. Filenames are random hex; the original name is kept only as a label.
6. Uploads are served with `X-Content-Type-Options: nosniff` and
   `Content-Disposition: inline`.

## Request forgery

- Admin mutations use **Server Actions**, which carry Next.js's own origin
  protection.
- The public enquiry endpoint additionally checks the `Origin` header against
  the request host.

## Headers

Set for every response in `next.config.ts`:

`Content-Security-Policy` · `Strict-Transport-Security` (2 years, preload) ·
`X-Frame-Options: DENY` · `X-Content-Type-Options: nosniff` ·
`Referrer-Policy: strict-origin-when-cross-origin` · `Permissions-Policy`
(camera, microphone, geolocation, FLoC all denied).

The CSP allows no third-party script origins beyond Google Tag Manager /
Analytics and the Meta Pixel — and those only load at all once an administrator
enters an ID. `'unsafe-eval'` is added **in development only**, for React's
debugging features.

## Data exposure

- `GET /api/enquiries` returns **404**. Enquiry data is never publicly readable.
- `/admin` and `/api` are disallowed in `robots.txt`; admin pages also send
  `noindex`.
- No secret is exposed to the browser. The only public environment value is
  `NEXT_PUBLIC_SITE_URL`.
- Server-only modules (`env`, `db`, sessions, settings, media) carry the
  `server-only` import guard, so importing one from client code is a build
  error rather than a leak.

## Audit logging

Sign-ins, failed sign-ins, sign-outs, content create/update/delete/publish,
settings changes, uploads, enquiry status changes and CSV exports are recorded
with actor, action, entity, summary, IP and timestamp. Viewable at
`/admin/audit` (admin role and above). Audit writes never throw — a logging
failure must not take down the operation it describes.

## Deployment checklist

- [ ] `SESSION_SECRET` set to a fresh 48-byte random value
- [ ] `NEXT_PUBLIC_SITE_URL` set to the real `https://` origin
- [ ] TLS terminated, HTTP redirected to HTTPS
- [ ] `TRUST_PROXY=1` if behind a reverse proxy
- [ ] `.env` not committed, readable only by the service user
- [ ] Database and `public/uploads` outside the web root or not directly served
- [ ] Nightly backups scheduled **and copied off the server**
- [ ] Admin accounts created only for people who need them; one account each
- [ ] Restore from a backup tested at least once
