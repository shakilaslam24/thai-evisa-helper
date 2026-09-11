# Deployment

## What this application needs

- **Node.js 20 or later** (developed and tested on 22)
- **A persistent writable disk** for the SQLite database and uploaded media
- **A reverse proxy** terminating TLS (nginx, Caddy, Cloudflare)

> **Important:** with the default SQLite + local-disk setup, this application
> needs a server with a persistent filesystem — a VPS, a container with a
> mounted volume, or similar. It will _not_ work correctly on a serverless
> platform with an ephemeral filesystem, because uploads and the database would
> be discarded between invocations. To deploy serverless, first move to
> PostgreSQL and object storage (both covered below).

---

## Choosing a Hostinger plan

Hostinger sells two very different things. Only one of them runs this site.

| Hostinger product                                                         | Runs this site? | Why                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web Hosting (Premium / Business / Cloud — the cPanel/hPanel shared plans) | **No**          | Shared plans run PHP behind Apache/LiteSpeed. There is no long-running Node.js process to serve a Next.js app, no way to bind port 3000, and no shell service manager. Their "Node.js app" tool, where offered, restarts the process on its own schedule and gives no guarantee that the `data/` directory survives. |
| **VPS (KVM 1 or larger)**                                                 | **Yes**         | A full Ubuntu server: root shell, a persistent disk, systemd, and your own nginx. This is what the rest of this document assumes.                                                                                                                                                                                    |

**KVM 1** (1 vCPU, 4 GB RAM, 50 GB NVMe) is enough: the site serves static and
ISR-cached HTML, the database is SQLite, and there are no third-party requests.
`next build` is the heaviest moment; 4 GB covers it comfortably. Move up only if
you later add PostgreSQL on the same box.

Choose **Ubuntu 24.04** as the VPS template (plain, not the "with cPanel" or
"with CyberPanel" images — a control panel would fight nginx for port 80).
Pick the datacentre nearest your visitors; for Bangladesh that is Singapore or
Mumbai.

### VPS first-boot

```bash
# as root on the fresh VPS
adduser dreamfly && usermod -aG sudo dreamfly
apt update && apt upgrade -y
apt install -y nginx git curl

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# firewall: SSH + web only
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
```

Then continue with **First deploy** below, as the `dreamfly` user, followed by
**Keeping it running**, **Reverse proxy** and **TLS certificate**.

> Hostinger's VPS firewall (in hPanel) sits _in front of_ `ufw`. If the site is
> unreachable after certbot, open 80 and 443 there too.

### What Hostinger does _not_ do for you

- **Backups.** The hPanel snapshot is a whole-disk image, not a database backup,
  and on the cheapest plans it is weekly. Keep `npm run backup` on its cron
  schedule (see **Backups**) and copy the output off the server.
- **Node upgrades / security patches.** Enable `unattended-upgrades`.
- **DNS.** If the domain is registered elsewhere, either point its nameservers
  at Hostinger or add the A records at the current registrar — see **DNS**.

---

## Full local rehearsal before going live

Run this on your own machine, in a clean clone, and everything the server will
do is exercised first. Roughly ten minutes.

```bash
# 1. clean checkout of what will be deployed
git clone <repository> dreamfly-rehearsal
cd dreamfly-rehearsal
npm ci

# 2. environment (a throwaway secret is fine locally)
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# paste it into SESSION_SECRET, and set NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# 3. database, exactly as the server creates it
npx prisma migrate deploy
npm run db:seed
npm run admin:create

# 4. production build — not `npm run dev`
npm run build
npm start          # leave running; open a second terminal for step 5
```

In the second terminal:

```bash
npm run typecheck        # types
npm test                 # 46 unit + CRM-isolation assertions
npm run test:e2e         # public pages and the enquiry flow
npm run test:admin       # every admin module: create, edit, publish, delete
npm run test:security    # auth, rate limiting, upload validation, headers
npm run test:a11y        # keyboard, labels, contrast, focus order
npm run test:audit       # 14 pages × 8 widths, 320px → 1920px
```

All seven must pass before you deploy. `test:e2e` and below need `npm start`
running; they drive a real Chromium against `http://localhost:3000` (override
with `BASE_URL=`).

Finally, check by hand what a script cannot judge:

```bash
npm run demo:list        # confirm 0 demo records are publicly visible
curl -s localhost:3000/robots.txt
curl -s localhost:3000/sitemap.xml | head -20
```

Then stop the server (`Ctrl+C`) and delete the rehearsal clone. Nothing in it
transfers to production — the server builds its own copy.

---

## Environment variables

| Variable               | Required          | Purpose                                                                                                                                                                                                                                     |
| ---------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | yes               | `file:./data/dreamfly.db`, or a PostgreSQL URL. A relative SQLite path resolves against the working directory.                                                                                                                              |
| `NEXT_PUBLIC_SITE_URL` | **yes**           | Public origin, no trailing slash. Canonical URLs, sitemap, Open Graph, admin origin check. **Production refuses to start without it** — otherwise a missing value would silently publish `localhost` canonicals and sitemap URLs to Google. |
| `SESSION_SECRET`       | yes in production | Signs admin session cookies. The app refuses to start in production without it.                                                                                                                                                             |
| `UPLOAD_DIR`           | no                | Default `./data/uploads`. Must be persistent. Deliberately outside `public/` — see below.                                                                                                                                                   |
| `MAX_UPLOAD_BYTES`     | no                | Default `8388608` (8 MB).                                                                                                                                                                                                                   |
| `TRUST_PROXY`          | no                | Set to `1` behind a reverse proxy so the real client IP is used for rate limiting.                                                                                                                                                          |

Generate the session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Analytics IDs (GA4, Tag Manager, Meta Pixel) are **not** environment variables —
they are entered in Global Settings so marketing can change them without a
deploy.

---

## First deploy

```bash
git clone <repository> dreamfly-website
cd dreamfly-website
npm ci                        # also generates the Prisma client

cp .env.example .env
# edit .env: SESSION_SECRET, and change NEXT_PUBLIC_SITE_URL from the local
# default to https://dreamfly.bd — the template ships with a localhost value

npx prisma migrate deploy     # create the schema
npm run db:seed               # settings + homepage structure + sample content
npm run admin:create          # create the first admin (asks for a password)

npm run build
npm start                     # listens on :3000
```

Then sign in at `https://your-domain/admin/login` and work through the
"Finish setting up" checklist on the dashboard.

### Keeping it running

`systemd` unit:

```ini
[Unit]
Description=DreamFly Website
After=network.target

[Service]
Type=simple
User=dreamfly
WorkingDirectory=/srv/dreamfly-website
EnvironmentFile=/srv/dreamfly-website/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### DNS

Point the domain at the server's IP address:

| Type | Name  | Value                      |
| ---- | ----- | -------------------------- |
| A    | `@`   | your server's IPv4 address |
| A    | `www` | your server's IPv4 address |

Pick **one** canonical form and redirect the other. This project is configured
for the bare domain `https://dreamfly.bd`, with `www` redirecting to it. Serving
both without a redirect splits your search ranking across two addresses.

### Reverse proxy (nginx)

```nginx
# Redirect http -> https, and www -> bare domain.
server {
  listen 80;
  listen [::]:80;
  server_name dreamfly.bd www.dreamfly.bd;
  return 301 https://dreamfly.bd$request_uri;
}

server {
  listen 443 ssl;
  listen [::]:443 ssl;
  http2 on;
  server_name www.dreamfly.bd;

  ssl_certificate     /etc/letsencrypt/live/dreamfly.bd/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/dreamfly.bd/privkey.pem;

  return 301 https://dreamfly.bd$request_uri;
}

server {
  listen 443 ssl;
  listen [::]:443 ssl;
  http2 on;
  server_name dreamfly.bd;

  ssl_certificate     /etc/letsencrypt/live/dreamfly.bd/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/dreamfly.bd/privkey.pem;

  # Uploads can be larger than nginx's 1 MB default
  client_max_body_size 12M;

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
  }
}
```

### TLS certificate

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d dreamfly.bd -d www.dreamfly.bd
```

Certbot renews automatically. **HTTPS is not optional here:** the site sends
`Strict-Transport-Security` with a two-year lifetime, admin session cookies are
marked `secure` in production, and an `http://` canonical would tell Google the
insecure address is the real one.

Set `TRUST_PROXY=1` when running behind a proxy, so rate limiting sees the real
client address rather than `127.0.0.1`.

---

## Updating

```bash
git pull
npm ci
npm run build        # runs prisma generate + migrate deploy, then builds
sudo systemctl restart dreamfly
```

Take a backup before any deploy that includes a migration.

---

## Where uploaded media lives

Uploads are written to `data/uploads/` and served by a route handler at
`/uploads/<filename>` — **not** from `public/`.

That is deliberate. Next.js indexes `public/` when the server boots, so an image
uploaded afterwards returns 404 until the next restart: an administrator would
add a photo, see it in the media library, place it on the homepage, and visitors
would get a broken image. Serving through a handler also keeps uploaded files
outside the web root, so nothing there is reachable except through code that
validates the request.

One practical benefit: the database and the media now live in the same `data/`
directory, so there is exactly one path to persist and back up.

## Backups

```bash
npm run backup                 # writes ./backups/<timestamp>/
npm run backup -- --out /mnt/backups
```

Each snapshot contains:

- `dreamfly.db` — taken with SQLite `VACUUM INTO`, so it is consistent even
  while the site is serving traffic. A plain `cp` of a live database can capture
  a torn write; this does not.
- `uploads/` — every image referenced by the database (from `data/uploads/`)

The 14 most recent snapshots are kept; older ones are removed.

**Schedule it.** Nightly, via cron:

```cron
30 2 * * * cd /srv/dreamfly-website && /usr/bin/npm run backup >> /var/log/dreamfly-backup.log 2>&1
```

Copy snapshots off the server — a backup on the same disk as the original is not
a backup. Any of rsync, rclone or `aws s3 sync` will do.

### Restoring

```bash
sudo systemctl stop dreamfly
cp /path/to/backup/dreamfly.db  ./data/dreamfly.db
rsync -a /path/to/backup/uploads/  ./data/uploads/
sudo systemctl start dreamfly
```

Verify by signing in and checking that recent enquiries are present.

---

## Moving to PostgreSQL

Worth doing when the site needs more than one application instance, or when
enquiry volume grows past the point where a single writer is comfortable.

1. `npm install @prisma/adapter-pg pg`
2. In `prisma/schema.prisma`, change the datasource provider to `postgresql`.
3. In `prisma.config.ts`, swap `PrismaBetterSqlite3` for `PrismaPg`.
4. Set `DATABASE_URL` to the PostgreSQL connection string.
5. Delete `prisma/migrations/` and run `npx prisma migrate dev --name init` to
   generate PostgreSQL migrations, then migrate existing data across.

The models need no changes — the schema deliberately avoids native enums, arrays
and JSON columns for exactly this reason.

**Also change when running more than one instance:**

- **Rate limiting** (`src/lib/rate-limit.ts`) holds counters in process memory,
  so each instance would enforce its own limit. Move it to Redis or the
  database.
- **Uploads** must move to shared object storage (S3, R2). Replace the write in
  `src/lib/media.ts` with an SDK upload and store the returned URL; nothing else
  changes, because every consumer reads `Media.url`. The route handler at
  `src/app/uploads/[...path]/route.ts` can then be deleted.

---

## HSTS and the CRM subdomain

The site sends `Strict-Transport-Security: max-age=63072000` — two years of
forced https for `dreamfly.bd` itself. It deliberately does **not** send
`includeSubDomains`, and does not send `preload`.

That is a decision about the CRM. `includeSubDomains` makes a browser refuse
plain http for _every_ subdomain of `dreamfly.bd`, the CRM's included, whether
or not that subdomain has a certificate — this site would then be able to break
a system it is supposed to stay out of. `preload` is worse: it ships the same
rule to browsers before they have ever visited the site, and removing it again
takes months.

Add `includeSubDomains` only once every subdomain, the CRM included, is served
over https with a valid certificate. It lives in `next.config.ts`, next to the
comment explaining this.

---

## Search Console and sitemap

Both `/robots.txt` and `/sitemap.xml` are generated on every request rather than
cached. They are crawled rarely, so caching bought nothing — and it carried a
real risk: a build run while "allow indexing" happened to be off would bake a
site-wide `Disallow: /` into robots.txt and keep serving it.

Google verification is a Global Settings field, not an environment variable, so
marketing can complete it without a deploy. See
[PRE-LAUNCH.md](PRE-LAUNCH.md#3-google-search-console).

### Search Console API (not implemented)

The brief raised an optional OAuth connection to the Search Console API, for
submitting the sitemap from inside the admin panel. It is deliberately **not**
built, for two reasons:

1. It replaces a one-minute, once-ever task (pasting `sitemap.xml` into Search
   Console) with a Google Cloud project, an OAuth client, a consent screen,
   refresh-token storage and a token-expiry failure mode to maintain.
2. It could not be verified end to end here — no Google credentials exist in
   this environment — and shipping unverified OAuth code to production is a
   poor trade.

If it is wanted later it needs: a Google Cloud project, an OAuth 2.0 client ID
and secret, `https://<your-domain>/api/google/callback` as the redirect URI, and
the `https://www.googleapis.com/auth/webmasters` scope. The client secret would
belong in an environment variable and the refresh token in the database. The
verification-tag route already covers the common case.

## Health checks

| Check                   | Expected                                      |
| ----------------------- | --------------------------------------------- |
| `GET /`                 | 200                                           |
| `GET /robots.txt`       | 200, `Disallow: /admin`                       |
| `GET /sitemap.xml`      | 200, lists published visa and tour pages      |
| `GET /admin` signed out | 307 to `/admin/login`                         |
| `GET /api/enquiries`    | 404 (enquiry data is never publicly readable) |

Or run the suites against the deployed site:

```bash
BASE_URL=https://dreamfly.bd npm run test:security
BASE_URL=https://dreamfly.bd npm run test:audit
```

---

## Troubleshooting

**"Cannot find module '../src/generated/prisma/client'".** The Prisma client is
generated code and is deliberately not committed. Run `npm install` (which
generates it via `postinstall`), or `npx prisma generate` on its own.

**Images 404 after a deploy.** The `data/` directory (database and uploads) is
gitignored by design. Restore it from a backup, or point `DATABASE_URL` and
`UPLOAD_DIR` at the persistent volume where it lives.

**"Missing required environment variable SESSION_SECRET".** Set it in `.env`.
Production refuses to start without one rather than falling back to a known
development value.

**"P3005: The database schema is not empty" from `prisma migrate deploy`.**
Prisma found a database with tables in it that it has no migration record for,
and refuses to touch it — nothing was written. Before anything else, check
where `DATABASE_URL` actually points: a relative path is resolved against the
project folder, so `file:../data/dreamfly.db` lands _beside_ the project rather
than inside it, on top of whatever lives there. The value should be
`file:./data/dreamfly.db`. A path containing `..` is now rejected outright with
a message saying so, rather than being opened.

Only if the file really is this site's database — and you know why it has no
migration history — baseline it as the Prisma docs describe. Never delete a
database file to clear this error until you know what is in it:
`sqlite3 <path> ".tables"` is a read-only way to look.

**"The table `main.AdminUser` does not exist".** The schema was never created
in the database being used. Run `npx prisma migrate deploy`, and if that
reports P3005, read the entry above — the URL is probably pointing somewhere
unexpected.

**The page loads but has no styling, and images are broken — in Safari.** The
CSP directive `upgrade-insecure-requests` rewrites every stylesheet, script and
image request to `https://`. Chrome exempts `localhost`; Safari does not, so on
a local `http://` server every one of those requests goes to
`https://localhost:3000`, where nothing is listening. Both that directive and
HSTS are now sent only when `NEXT_PUBLIC_SITE_URL` begins with `https://`, so a
local server is unaffected. If it reappears, check that value in `.env`.

**A header change did not take effect after editing `next.config.ts`.** Next.js
bakes `headers()` into the build. `next start` reads the baked copy, so the
value of `NEXT_PUBLIC_SITE_URL` **at build time** is what decides whether HSTS
and `upgrade-insecure-requests` are sent. Change the variable, then rebuild.

**Content edits don't appear.** Admin mutations purge the affected routes. If a
CDN sits in front of the site, purge its cache too, or lower its TTL for HTML.

**Enquiry submissions rejected with 429.** The rate limit is 5 per IP per 10
minutes. Behind a proxy without `TRUST_PROXY=1`, every visitor shares one IP —
set it.
