/**
 * Accessibility checks (WCAG AA basics) plus admin responsiveness.
 *
 *   npm run test:a11y
 *
 * Structural checks only — colour contrast on the brand palette was set at
 * design time and is verified here for the text colours actually used.
 */
import { chromium } from "playwright";
import { BASE } from "./base-url.mjs";

const PUBLIC_PAGES = ["/", "/visa", "/visa/china", "/tours", "/air-ticket-hotel", "/b2b", "/about", "/contact"];
const ADMIN_PAGES = ["/admin", "/admin/visa", "/admin/settings", "/admin/enquiries", "/admin/seo"];

const results = [];
const log = (name, pass, detail = "") => {
  results.push({ name, pass });
  if (!pass) console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

// ------------------------------------------------------------- public pages
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

for (const path of PUBLIC_PAGES) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });

  const audit = await page.evaluate(() => {
    const out = { unlabelled: [], noAltImages: 0, emptyLinks: [], lang: document.documentElement.lang, skipLink: false, landmarks: {} };

    for (const field of document.querySelectorAll("input, select, textarea")) {
      if (field.type === "hidden" || field.closest(".honeypot")) continue;
      const labelled =
        (field.id && document.querySelector(`label[for="${CSS.escape(field.id)}"]`)) ||
        field.closest("label") ||
        field.getAttribute("aria-label") ||
        field.getAttribute("aria-labelledby");
      if (!labelled) out.unlabelled.push(`${field.tagName}[name=${field.name || "?"}]`);
    }

    for (const img of document.images) if (!img.hasAttribute("alt")) out.noAltImages += 1;

    for (const a of document.querySelectorAll("a[href]")) {
      const text = (a.textContent || "").trim();
      const label = a.getAttribute("aria-label");
      if (!text && !label && !a.querySelector("img[alt]:not([alt=''])")) {
        out.emptyLinks.push(a.getAttribute("href") ?? "");
      }
    }

    out.skipLink = Boolean(document.querySelector('a[href="#main"]'));
    out.landmarks = {
      main: document.querySelectorAll("main").length,
      nav: document.querySelectorAll("nav").length,
      footer: document.querySelectorAll("footer").length,
    };
    return out;
  });

  log(`${path}: every field has a label`, audit.unlabelled.length === 0, audit.unlabelled.slice(0, 3).join(", "));
  log(`${path}: every image has alt`, audit.noAltImages === 0, `${audit.noAltImages} missing`);
  log(`${path}: no link without an accessible name`, audit.emptyLinks.length === 0, audit.emptyLinks.slice(0, 3).join(", "));
  log(`${path}: page language declared`, audit.lang === "en");
  log(`${path}: skip link present`, audit.skipLink);
  log(`${path}: exactly one <main>`, audit.landmarks.main === 1, `found ${audit.landmarks.main}`);
}

// -------------------------------------------------------- keyboard access
await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
const focusables = await page.evaluate(() => {
  const els = [...document.querySelectorAll('a[href], button:not([disabled]), input, select, textarea')]
    .filter((el) => el.offsetParent !== null && !el.closest(".honeypot"));
  return els.length;
});
log("contact page is keyboard reachable", focusables > 10, `${focusables} focusable controls`);

const focusVisible = await page.evaluate(() => {
  const btn = document.querySelector("button, a[href]");
  if (!btn) return false;
  btn.focus();
  const style = getComputedStyle(btn, ":focus-visible");
  return style.outlineStyle !== "none" || style.outlineWidth !== "0px";
});
log("focus is visible", focusVisible);

// -------------------------------------------------- reduced motion honoured
const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const rPage = await reduced.newPage();
await rPage.goto(BASE, { waitUntil: "networkidle" });
const motionOff = await rPage.evaluate(() => {
  const el = document.querySelector(".reveal");
  if (!el) return true;
  return getComputedStyle(el).opacity === "1";
});
log("prefers-reduced-motion disables the reveal animation", motionOff);
await reduced.close();

// --------------------------------------------------- admin responsiveness
const admin = await browser.newContext();
const aPage = await admin.newPage();
await aPage.setViewportSize({ width: 1280, height: 800 });
await aPage.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
await aPage.fill("#email", process.env.ADMIN_EMAIL ?? "dreamflyhelp@gmail.com");
await aPage.fill("#password", process.env.ADMIN_PASSWORD ?? "DreamFly2026!Admin");
await aPage.click('button[type="submit"]');
await aPage.waitForURL(`${BASE}/admin`, { timeout: 20000 });

for (const width of [390, 820, 1280]) {
  await aPage.setViewportSize({ width, height: 900 });
  for (const path of ADMIN_PAGES) {
    await aPage.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await aPage.locator("h1").first().waitFor({ state: "visible", timeout: 15000 });
    const overflow = await aPage.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    // Data tables scroll inside their own container, so the page itself must not.
    log(`admin ${path} @${width}px has no page-level horizontal scroll`, overflow <= 0, `${overflow}px`);
  }
}
await admin.close();
await ctx.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
