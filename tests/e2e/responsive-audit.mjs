/**
 * Responsive and accessibility audit across every public page at mobile,
 * tablet and desktop widths.
 *
 *   npm run test:audit
 *
 * Fails a page when it has horizontal overflow, a wrong number of <h1>s, broken
 * or alt-less images, sub-24px touch targets, off-screen controls, a skipped
 * heading level, a console error, or missing title/description/canonical.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const PAGES = ["/", "/visa", "/visa/japan", "/tours", "/air-ticket-hotel", "/b2b", "/about", "/contact", "/does-not-exist"];
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const issues = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  for (const path of PAGES) {
    errors.length = 0;
    const resp = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 40000 });
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.85;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(350);

    const audit = await page.evaluate(() => {
      const doc = document.documentElement;
      const out = {
        overflow: doc.scrollWidth - doc.clientWidth,
        h1Count: document.querySelectorAll("main h1, h1").length,
        brokenImages: [],
        tinyTargets: [],
        offscreen: [],
        missingAlt: 0,
        headingJumps: [],
        title: document.title,
        metaDesc: document.querySelector('meta[name="description"]')?.getAttribute("content")?.length ?? 0,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
        jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length,
      };

      for (const img of document.images) {
        if (img.complete && img.naturalWidth === 0) out.brokenImages.push(img.currentSrc || img.src);
        if (!img.hasAttribute("alt")) out.missingAlt += 1;
      }

      // Interactive targets must be reachable and finger-sized
      for (const el of document.querySelectorAll("a[href], button:not([disabled]), input, select, textarea")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const styles = getComputedStyle(el);
        if (styles.visibility === "hidden" || styles.display === "none") continue;
        if (el.closest('[aria-hidden="true"], .honeypot')) continue;
        // A checkbox/radio inside a label: the label is the touch target.
        if ((el.type === "checkbox" || el.type === "radio") && el.closest("label")) continue;
        if (r.height < 24 || r.width < 24) {
          out.tinyTargets.push(`${el.tagName}.${el.className}`.slice(0, 90));
        }
        if (r.left < -2 || r.right > doc.clientWidth + 2) {
          out.offscreen.push(`${el.tagName}:${(el.textContent || "").trim().slice(0, 30)}`);
        }
      }

      // Heading order
      let last = 0;
      for (const h of document.querySelectorAll("h1,h2,h3,h4,h5,h6")) {
        const level = Number(h.tagName[1]);
        if (last && level > last + 1) out.headingJumps.push(`h${last} → h${level}: ${(h.textContent||"").trim().slice(0,40)}`);
        last = level;
      }
      return out;
    });

    const problems = [];
    if (resp && ![200, 404].includes(resp.status())) problems.push(`status ${resp.status()}`);
    if (audit.overflow > 0) problems.push(`horizontal overflow ${audit.overflow}px`);
    if (audit.h1Count !== 1) problems.push(`h1 count ${audit.h1Count}`);
    if (audit.brokenImages.length) problems.push(`broken images: ${audit.brokenImages.join(", ").slice(0, 120)}`);
    if (audit.missingAlt) problems.push(`${audit.missingAlt} img without alt`);
    if (audit.tinyTargets.length) problems.push(`small targets: ${audit.tinyTargets.slice(0,3).join(" | ")}`);
    if (audit.offscreen.length) problems.push(`offscreen: ${audit.offscreen.slice(0,3).join(" | ")}`);
    if (audit.headingJumps.length) problems.push(`heading jump: ${audit.headingJumps.slice(0,2).join(" | ")}`);
    // The 404 route legitimately answers 404; that is not a page error.
    const realErrors = errors.filter((e) => !(resp?.status() === 404 && e.includes("404")));
    if (realErrors.length) problems.push(`console: ${realErrors.slice(0,2).join(" | ").slice(0,160)}`);
    if (vp.name === "desktop" && resp?.status() === 200) {
      if (!audit.title) problems.push("missing <title>");
      if (audit.metaDesc < 40) problems.push(`meta description ${audit.metaDesc} chars`);
      if (!audit.canonical) problems.push("missing canonical");
    }

    if (problems.length) {
      issues.push({ vp: vp.name, path, problems });
      console.log(`ISSUE  ${vp.name.padEnd(7)} ${path}`);
      problems.forEach((p) => console.log(`         - ${p}`));
    } else {
      console.log(`ok     ${vp.name.padEnd(7)} ${path}`);
    }
  }
  await ctx.close();
}

console.log(`\n${issues.length} page/viewport combinations with issues`);
await browser.close();
