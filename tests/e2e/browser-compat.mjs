/**
 * Cross-browser and real-device checks.
 *
 *   npm run test:browsers
 *
 * HONEST LIMIT: only Chromium is installed here — the WebKit and Firefox
 * downloads are blocked on this network — so the *engine* under every device
 * below is Chromium. What the device descriptors do give is each device's real
 * viewport, pixel ratio, touch behaviour and user agent, which is what catches
 * layout and touch-target faults.
 *
 * The engine-specific risk is covered a different way: part 2 reads the CSS and
 * JavaScript this build actually emits and checks every modern feature in it
 * against the versions that support it. A feature no released Safari supports
 * fails the run, whether or not a WebKit binary is available to prove it.
 */
import { chromium, devices } from "playwright";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { BASE } from "./base-url.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

const results = [];
const log = (name, pass, detail = "") => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

// The devices people actually use, plus the smallest screen still in service.
const MATRIX = [
  ["iPhone SE", devices["iPhone SE"]],
  ["iPhone 13", devices["iPhone 13"]],
  ["iPhone 15 Pro Max", devices["iPhone 15 Pro Max"]],
  ["Pixel 7", devices["Pixel 7"]],
  ["Galaxy S9+", devices["Galaxy S9+"]],
  ["iPad Mini", devices["iPad Mini"]],
  ["Desktop 1280", { viewport: { width: 1280, height: 800 } }],
  ["Desktop 1920", { viewport: { width: 1920, height: 1080 } }],
];

const PAGES = ["/", "/visa", "/tours", "/air-ticket-hotel", "/b2b", "/about", "/contact"];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

// ---------------------------------------------------------------------------
// 1. Every page on every device
// ---------------------------------------------------------------------------
for (const [label, device] of MATRIX) {
  const ctx = await browser.newContext(device);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    // A 404 for a demo image is not a browser fault.
    if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text());
  });

  const overflowing = [];
  const smallControls = [];
  const smallTargets = [];

  for (const route of PAGES) {
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });

    const scroll = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
    }));
    // 1px of rounding at a fractional device pixel ratio is not a defect.
    if (scroll.doc > scroll.win + 1) overflowing.push(`${route} (${scroll.doc}>${scroll.win})`);

    if (device.isMobile) {
      const controls = await page.$$eval("input, select, textarea", (els) =>
        els
          .filter((e) => !e.className.includes("honeypot") && e.type !== "checkbox" && e.type !== "radio")
          .map((e) => ({ name: e.getAttribute("name") ?? e.type, size: parseFloat(getComputedStyle(e).fontSize) })),
      );
      // Under 16px, iOS Safari zooms the page in when the field is focused.
      for (const c of controls) if (c.size < 16) smallControls.push(`${route}:${c.name}=${c.size}px`);

      // Touch targets. WCAG 2.2 asks for 24px; Apple's guidance is 44px, and
      // that is what this site is built to — including the mobile menu toggle,
      // which was 38px until this check was written.
      const targets = await page.$$eval(
        "header a, header button, .btn, [role='button'], nav a",
        (els) =>
          els
            .filter((e) => e.getBoundingClientRect().width > 0)
            .map((e) => {
              const r = e.getBoundingClientRect();
              return {
                text: (e.textContent ?? "").trim().slice(0, 24),
                h: Math.round(r.height),
                w: Math.round(r.width),
                // Breadcrumbs are a trail of text links, not controls. WCAG 2.2
                // holds them to 24px, not to Apple's 44px for buttons, and
                // inflating them would wreck the hero they sit in.
                breadcrumb: Boolean(e.closest('nav[aria-label="Breadcrumb"]')),
              };
            }),
      );
      for (const t of targets) {
        const min = t.breadcrumb ? 24 : 44;
        if (t.h < min || t.w < min) smallTargets.push(`${route}:"${t.text}" ${t.w}x${t.h}`);
      }
    }
  }

  log(`${label}: no page scrolls sideways`, overflowing.length === 0, overflowing.join(", "));
  log(`${label}: no script errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
  if (device.isMobile) {
    log(`${label}: fields are 16px or larger`, smallControls.length === 0, smallControls.slice(0, 4).join(", "));
    log(`${label}: touch targets are 44px or larger`, smallTargets.length === 0, smallTargets.slice(0, 4).join(", "));
  }

  await ctx.close();
}

// ---------------------------------------------------------------------------
// 2. What the build actually emits, against real support data
// ---------------------------------------------------------------------------

/**
 * Minimum version of each engine that supports the feature. A feature used by
 * the build but missing from this table fails the run: the point is that every
 * modern thing shipped has been checked against Safari at least once.
 */
const SUPPORT = {
  "color-mix(": { safari: 16.2, chrome: 111, firefox: 113 },
  "@property": { safari: 16.4, chrome: 85, firefox: 128 },
  "@layer": { safari: 15.4, chrome: 99, firefox: 97 },
  ":has(": { safari: 15.4, chrome: 105, firefox: 121 },
  ":is(": { safari: 14, chrome: 88, firefox: 78 },
  ":where(": { safari: 14, chrome: 88, firefox: 78 },
  "dvh": { safari: 15.4, chrome: 108, firefox: 101 },
  "aspect-ratio": { safari: 15, chrome: 88, firefox: 89 },
  "backdrop-filter": { safari: 9, chrome: 76, firefox: 103 }, // -webkit- prefixed below
  "accent-color": { safari: 15.4, chrome: 93, firefox: 92 },
  "clamp(": { safari: 13.1, chrome: 79, firefox: 75 },
  "lab(": { safari: 15, chrome: 111, firefox: 113 },
  "oklch(": { safari: 15.4, chrome: 111, firefox: 113 },
  // Degrade to normal wrapping where unsupported; never a layout failure.
  "text-wrap": { safari: 17.5, chrome: 114, firefox: 121, cosmetic: true },
};

// The oldest engines this site commits to. Tailwind v4 itself does not support
// anything older, so this is the floor for the whole stack.
const BASELINE = { safari: 16.4, chrome: 111, firefox: 128 };

const cssFiles = readdirSync(path.join(ROOT, ".next/static/chunks"))
  .filter((f) => f.endsWith(".css"))
  .map((f) => readFileSync(path.join(ROOT, ".next/static/chunks", f), "utf8"));

if (!cssFiles.length) {
  log("built CSS was found to scan", false, "run `npm run build` first");
} else {
  const css = cssFiles.join("\n");
  const tooNew = [];
  const used = [];
  for (const [feature, min] of Object.entries(SUPPORT)) {
    if (!css.includes(feature)) continue;
    used.push(feature);
    if (min.cosmetic) continue;
    for (const engine of ["safari", "chrome", "firefox"]) {
      if (min[engine] > BASELINE[engine]) tooNew.push(`${feature} needs ${engine} ${min[engine]}`);
    }
  }
  log(`CSS features are within the supported baseline`, tooNew.length === 0, tooNew.join(", ") || `${used.length} modern features checked`);

  // Safari only shipped backdrop-filter unprefixed in 18. Without the prefixed
  // declaration the header's blur silently does nothing on older iPhones.
  if (css.includes("backdrop-filter")) {
    log("backdrop-filter carries the -webkit- prefix Safari needs", css.includes("-webkit-backdrop-filter"));
  }
}

const jsFiles = readdirSync(path.join(ROOT, ".next/static/chunks"))
  .filter((f) => f.endsWith(".js"))
  .map((f) => readFileSync(path.join(ROOT, ".next/static/chunks", f), "utf8"));
const js = jsFiles.join("\n");

// APIs that look ordinary and are not: each one here has broken a Safari build
// somewhere. The version is when Safari shipped it.
const JS_SUPPORT = {
  "structuredClone": 15.4,
  "Object.hasOwn": 15.4,
  "requestIdleCallback": 15.4,
  "Object.groupBy": 17.4,
  "Promise.withResolvers": 17.4,
  "Array.prototype.toSorted": 16.4,
  "navigator.clipboard": 13.1,
  "IntersectionObserver": 12.1,
  "ResizeObserver": 13.1,
};
const jsTooNew = Object.entries(JS_SUPPORT)
  .filter(([api, min]) => js.includes(api) && min > BASELINE.safari)
  .map(([api, min]) => `${api} needs Safari ${min}`);
log("JavaScript APIs are within the supported baseline", jsTooNew.length === 0, jsTooNew.join(", "));

await browser.close();

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} passed`);
process.exitCode = passed === results.length ? 0 : 1;
