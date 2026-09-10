# Pre-launch checklist

Work top to bottom. Nothing here needs a developer.

---

## 1. Remove the demo content

The site ships with demo visa pages, tour packages, campaigns and reviews so the
designs can be reviewed with something in them. **None of it is real business
information.**

```bash
npm run demo:list     # see exactly what exists
npm run demo:clear    # remove all of it
```

Everything it created is flagged as sample content, which the public site
excludes unconditionally — so even if you forget, nothing fake can reach a
visitor. Clearing it simply keeps the admin panel tidy.

If you used `npm run demo:show` to preview the designs, **you must run
`npm run demo:hide`** (or `demo:clear`). `demo:show` deliberately switches
search-engine indexing off while demo copy is exposed.

Demo records to remove or replace:

| Where | What |
|---|---|
| Visa Destinations | China, Japan, Thailand, Malaysia (illustrative fees and processing times) and 5 empty drafts |
| Tour Packages | Thailand Escape, Malaysia City & Island, Japan Discovery, Sample Tour Package |
| Campaigns | Four records whose names begin `[DEMO]` |
| Testimonials | Three records named `[DEMO] Sample Reviewer …` |
| About page | Prose beginning `[DEMO]` |

---

## 2. Enter your real information

### Global Settings → Contact
- [ ] **Phone numbers.** Add each line, choose its label, and tick where it
      should appear (header, footer, contact page, mobile call bar).
- [ ] Mark one number **Main phone number**.
- [ ] Tick **This number is on WhatsApp** on the right line and mark it
      **Main WhatsApp number** — every WhatsApp button on the site is hidden
      until one exists.
- [ ] **Email addresses** — add a B2B or support address if you use one.
- [ ] **Office hours** — one row per group of days.

### Global Settings → the rest
- [ ] Address, Google Maps link, **Google Maps embed URL** (the Contact page map
      appears once this is set)
- [ ] Social profile links (leave any blank to hide it)
- [ ] **Site URL** — `https://dreamfly.bd`, no trailing slash
- [ ] Default SEO title and description
- [ ] **Allow search engines to index this site** — must be **ON**

### Content
- [ ] Visa destinations: real fees, processing times, documents, FAQs
- [ ] Tour packages: real itineraries and prices
- [ ] About page: your own words
- [ ] Testimonials: real client feedback only
- [ ] Media: upload your photography and write alt text

---

## 3. Google Search Console

1. Open [Search Console](https://search.google.com/search-console) and add
   `dreamfly.bd` as a property.
2. Choose the **HTML tag** method. Google shows
   `<meta name="google-site-verification" content="XYZ" />`.
3. Copy **only the `XYZ` part** into
   **Global Settings → Search Console verification** and save.
4. Deploy, then press **Verify** in Search Console.
5. In Search Console open **Sitemaps**, enter `sitemap.xml`, press Submit.

`/admin/seo` shows verification status, the sitemap URL, how many pages it
contains, and links to open all of it.

> There is deliberately no "request indexing" button. Google offers no honest
> way to do that from outside its own console, and a button that pretended to
> would be worse than none.

---

## 4. Final technical checks

```bash
npm run typecheck      # types
npm test               # 46 unit + CRM-isolation checks
npm run build          # production build
```

With the site running:

```bash
npm run test:e2e       # 16 public flows
npm run test:admin     # 39 admin module checks
npm run test:security  # 26 security checks
npm run test:a11y      # 66 accessibility + admin responsiveness checks
npm run test:audit     # 14 pages × 8 widths, 320px → 1920px
```

Start the server fresh before the security and flow suites — the rate limiter
counts in memory, so a second run inside the window answers 429 first.

---

## 5. On the day

- [ ] `SESSION_SECRET` set to a fresh random value on the server
- [ ] `NEXT_PUBLIC_SITE_URL` set to the real `https://` address
      (**production refuses to start without it**, so localhost can never leak
      into your canonical URLs or sitemap)
- [ ] `TRUST_PROXY=1` if behind nginx, Caddy or Cloudflare
- [ ] TLS working, HTTP redirects to HTTPS
- [ ] The `data/` directory (database **and** uploaded images) is on persistent
      storage — not a disk that is wiped on deploy
- [ ] Nightly backups scheduled **and copied off the server**
- [ ] A restore tested at least once
- [ ] Admin accounts created for each person who needs one — one account each
- [ ] The default admin password changed

---

## 6. After going live

- [ ] `https://dreamfly.bd/robots.txt` shows `Allow: /`
- [ ] `/sitemap.xml` lists your real pages
- [ ] Search Console verification passes
- [ ] Sitemap submitted
- [ ] Submit a test enquiry and confirm it reaches `/admin/enquiries`
- [ ] Tap Call and WhatsApp on a real phone
- [ ] Share a page on Facebook and check the preview image
- [ ] Delete the test enquiry
