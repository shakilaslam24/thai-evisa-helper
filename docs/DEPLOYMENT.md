# Deployment

## What this application needs

- **Node.js 20 or later** (developed and tested on 22)
- **A persistent writable disk** for the SQLite database and uploaded media
- **A reverse proxy** terminating TLS (nginx, Caddy, Cloudflare)

> **Important:** with the default SQLite + local-disk setup, this application
> needs a server with a persistent filesystem — a VPS, a container with a
> mounted volume, or similar. It will *not* work correctly on a serverless
> platform with an ephemeral filesystem, because uploads and the database would
> be discarded between invocations. To deploy serverless, first move to
> PostgreSQL and object storage (both covered below).

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | `file:./data/dreamfly.db`, or a PostgreSQL URL. A relative SQLite path resolves against the working directory. |
| `NEXT_PUBLIC_SITE_URL` | yes | Public origin, no trailing slash. Canonical URLs, sitemap, Open Graph, admin origin check. |
| `SESSION_SECRET` | yes in production | Signs admin session cookies. The app refuses to start in production without it. |
| `UPLOAD_DIR` | no | Default `./public/uploads`. Must be persistent. |
| `MAX_UPLOAD_BYTES` | no | Default `8388608` (8 MB). |
| `TRUST_PROXY` | no | Set to `1` behind a reverse proxy so the real client IP is used for rate limiting. |

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
# edit .env: DATABASE_URL, NEXT_PUBLIC_SITE_URL, SESSION_SECRET

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

### Reverse proxy (nginx)

```nginx
server {
  listen 443 ssl http2;
  server_name www.dreamflyconsultancy.com;

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

## Backups

```bash
npm run backup                 # writes ./backups/<timestamp>/
npm run backup -- --out /mnt/backups
```

Each snapshot contains:

- `dreamfly.db` — taken with SQLite `VACUUM INTO`, so it is consistent even
  while the site is serving traffic. A plain `cp` of a live database can capture
  a torn write; this does not.
- `uploads/` — every image referenced by the database

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
rsync -a /path/to/backup/uploads/  ./public/uploads/
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
  changes, because every consumer reads `Media.url`.

---

## Health checks

| Check | Expected |
|---|---|
| `GET /` | 200 |
| `GET /robots.txt` | 200, `Disallow: /admin` |
| `GET /sitemap.xml` | 200, lists published visa and tour pages |
| `GET /admin` signed out | 307 to `/admin/login` |
| `GET /api/enquiries` | 404 (enquiry data is never publicly readable) |

---

## Troubleshooting

**"Cannot find module '../src/generated/prisma/client'".** The Prisma client is
generated code and is deliberately not committed. Run `npm install` (which
generates it via `postinstall`), or `npx prisma generate` on its own.

**Images 404 after a deploy.** `public/uploads` is gitignored by design. Restore
it from a backup, or point `UPLOAD_DIR` at the persistent volume where it lives.

**"Missing required environment variable SESSION_SECRET".** Set it in `.env`.
Production refuses to start without one rather than falling back to a known
development value.

**Content edits don't appear.** Admin mutations purge the affected routes. If a
CDN sits in front of the site, purge its cache too, or lower its TTL for HTML.

**Enquiry submissions rejected with 429.** The rate limit is 5 per IP per 10
minutes. Behind a proxy without `TRUST_PROXY=1`, every visitor shares one IP —
set it.
