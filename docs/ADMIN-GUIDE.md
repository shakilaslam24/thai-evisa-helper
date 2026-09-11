# Managing the DreamFly website

A short guide for the DreamFly team. Sign in at **`/admin/login`**.

---

## Start here: Global Settings

Everything about the business lives in **Global Settings** — phone numbers,
WhatsApp, email, address, office hours, social links, analytics and SEO
defaults. Change something here and it updates on **every page** at once.

### Phone numbers — add as many as you need

Phone numbers are a **list**, not two fixed boxes. Press **+ Add number** for
each line you want on the site.

For every number you choose:

| Setting | What it does |
|---|---|
| **Label** | Main Office, WhatsApp, Hotline, B2B, Support, or your own wording |
| **This number is on WhatsApp** | Makes it usable for WhatsApp buttons |
| **WhatsApp number** | Full international form, digits only — `8801335374437`. Leave empty to reuse the number itself |
| **Show on** | Header, footer, contact page, mobile call bar — tick any combination |
| **Main phone number** | Used wherever the site shows a single number |
| **Main WhatsApp number** | Used by every WhatsApp button |

Use ↑ ↓ to reorder. **Every WhatsApp button stays hidden until one number has
WhatsApp switched on** — the panel warns you if none does.

**Email addresses** and **office hours** work the same way: add as many rows as
you need and choose where each appears.

### Two other fields that matter

- **Google Maps embed URL** — the map on the Contact page appears once this is
  set. In Google Maps: *Share → Embed a map*, then copy only the `src="…"` URL.
- **Site URL** — your real address. Used for every canonical link, the sitemap
  and social previews.

---

## Publishing rules

Every visa destination, tour package and testimonial has a **status**:

| Status | Meaning |
|---|---|
| **Draft** | Invisible to visitors. Use it while gathering fees and requirements. |
| **Published** | Live at its own URL, in the sitemap, indexable by Google. |
| **Archived** | Taken down, but kept for reference. |

There is one more control: **"This is sample content."**

The site ships with example destinations so you can see how a country page is
built. They are all marked as sample. **A record marked as sample will never
appear on the public website, even if you publish it.** That is deliberate — it
means demo text can never go out as real business information.

**To make a sample record real:** open it, replace the placeholder text with
DreamFly's actual information, untick *"This is sample content"*, set the status
to Published, and save.

---

## Visa destinations

`/admin/visa`

Every country page comes from the same template — there is no separate design to
maintain per country. Add a destination, fill in what you know, and publish.

- **Country code** (`JP`, `CN`, `TH`) draws the flag beside the country name.
- **Fees** are free-text, because fee structures differ by country. Leave a fee
  empty and its row is hidden.
- **Who can apply** and **Application process** take one point per line.
- **Required documents** and **FAQs** are repeatable rows — add, reorder or
  remove them freely.
- **Featured** puts the country on the homepage. **Featured order** decides the
  sequence (lower numbers first). The homepage countries are not fixed in code —
  whatever you feature is what appears.

Change the processing time here and the public page changes. Nobody needs to
touch the code.

### Please don't promise approvals

Never write *guaranteed visa*, *100% approval* or *confirmed visa*. The decision
belongs to the embassy, and every visa page already carries a line saying so.

---

## Tour packages

`/admin/tours`

Cards on the website stay deliberately simple — a photograph, a destination, a
name, a duration. Everything else belongs on the package page.

**Highlights**, **Includes** and **Excludes** take one item per line. The
**itinerary** is repeatable rows; a row can cover one day or several
("Days 3–4").

---

## Campaigns, offers and announcements

`/admin/campaigns`

One place for anything time-limited: a Canton Fair push, a seasonal offer, a new
visa update, a holiday notice, an office update.

**Where it appears** is up to you:

| Place | Looks like |
|---|---|
| **Homepage section** | A full navy band in the middle of the homepage |
| **Announcement bar** | A thin strip above the header, on every page — best for a short notice |
| **Visa listing page** | A compact strip above the country list |
| **Tour listing page** | The same, above the packages |
| **B2B page** | The same, for agency-facing offers |

Set **Starts** and **Ends** and it runs itself: it appears on the start date and
**disappears on its own** afterwards. Nothing to remember, nothing left stale.

If two campaigns share a place, tick **Priority** on the one that should win.

If nothing is active and in date, that section is removed entirely rather than
leaving an empty gap.

**Image sizes:** desktop 1600×700, mobile 1080×1350. Upload both if the artwork
has text in it, so nothing gets cropped awkwardly on a phone.

---

## Testimonials

`/admin/testimonials`

**Only add feedback you have genuinely received.** Use the client's own words.

If nothing is published, the reviews section disappears from the homepage
completely — an empty section looks worse than no section.

---

## The homepage

`/admin/home`

Three things here:

1. **Sections** — turn each one on or off and set its order. You can also edit
   its heading and supporting line.
2. **Hero** — the eyebrow, headline, gold accent, description, tagline, buttons
   and images. Leave the *secondary button link* empty and that button opens
   WhatsApp.
3. **Core services** and **Why DreamFly** — add, edit, reorder, remove.

You cannot break the layout from here. The section types are fixed by the
design; you control content and arrangement.

---

## Images

`/admin/media`

Upload once, use anywhere. Every upload is automatically converted to WebP,
resized to a sensible maximum, and stripped of camera metadata (including GPS
location).

**Always write alt text** — one short sentence describing what is in the
picture. Screen readers depend on it and Google reads it.

**If no image is set anywhere, nothing breaks.** The site falls back to designed
DreamFly artwork, so pages look finished while you gather photography.

---

## Enquiries

`/admin/enquiries`

Every form on the website lands here: contact, air ticket, hotel, B2B, and the
enquiry forms on visa and tour pages.

Filter by type and status, or search by name, phone, email or destination.
Open one to see the full request, reply on WhatsApp in one click, change its
status, and add internal notes.

| Status | Use it when |
|---|---|
| **New** | Nobody has contacted them yet |
| **Contacted** | First contact made |
| **Follow-up** | Waiting on the client or on documents |
| **Converted** | They booked |
| **Closed** | Finished, or not proceeding |
| **Archived** | Removed from the active inbox |

Internal notes are private to your team and never shown to the visitor.

**Where did this enquiry come from?** Each one records the landing page and any
Facebook or Google campaign parameters, so you can see which advert produced it.

---

## SEO and Google Search Console

`/admin/seo`

The top of this page is a live status panel: your site URL, whether indexing is
allowed, whether Google verification is set, the sitemap URL and how many pages
it contains, and buttons to open the sitemap, robots.txt and Search Console.

### Connecting Google Search Console

1. Open Search Console and add your site as a property.
2. Choose the **HTML tag** method.
3. Copy only the token — the `content="…"` part — into **Global Settings →
   Search Console verification**.
4. Save, deploy, then press Verify in Search Console.
5. In Search Console → **Sitemaps**, enter `sitemap.xml` and press Submit.

The sitemap updates itself. Publish a new visa page and it appears; unpublish
one and it disappears. You never need to touch it again.

> There is no "request indexing" button, and there deliberately never will be.
> Google provides no honest way to do that from outside its own console.

### Per-page SEO

`/admin/seo`

Per-page titles, descriptions and share images. Leave a field empty and it falls
back to the defaults in Global Settings.

- **Title**: around 50–60 characters. The company name is added automatically.
- **Description**: around 150–160 characters. Write it for a person, not a
  search engine.

Visa and tour pages have their own SEO fields inside each record.

There is a site-wide **"Allow search engines to index this site"** switch in
Global Settings. Turn it **off** on a staging copy, and make sure it is **on**
for the live site.

---

## Analytics

In Global Settings, enter your **GA4 Measurement ID**, **Google Tag Manager ID**
or **Meta Pixel ID**. Nothing loads in a visitor's browser until you do.

If you set a Tag Manager ID, GA4 is left to Tag Manager rather than loaded
twice.

---

## Everyday checklist

- [ ] New enquiries answered, statuses moved on
- [ ] Expired campaigns deactivated (they hide themselves, but tidy up)
- [ ] New visa fees or processing times updated on the destination pages
- [ ] Alt text written for newly uploaded images
- [ ] New testimonials added — real ones only
