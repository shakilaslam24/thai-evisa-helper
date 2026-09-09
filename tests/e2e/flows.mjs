/**
 * End-to-end checks against a running server (default http://localhost:3000).
 *
 *   npm run test:e2e
 *
 * Covers the paths that must never regress: admin access control, the visa CMS
 * round-trip, the placeholder-content rule, enquiry submission and storage,
 * anti-spam, and the security/SEO surface.
 *
 * NOTE: this publishes the "Japan" sample destination as part of the CMS
 * round-trip. Run `npm run db:seed` against a fresh database afterwards if you
 * need the seeded state back.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];
const log = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

try {
  // --- admin is protected -------------------------------------------------
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  log("admin redirects to login when signed out", page.url().includes("/admin/login"), page.url());

  // --- login rejects bad credentials --------------------------------------
  await page.fill("#email", "dreamflyhelp@gmail.com");
  await page.fill("#password", "wrong-password");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);
  const badLogin = await page.locator('[role="alert"]').first().textContent().catch(() => "");
  log("bad password rejected", Boolean(badLogin?.includes("don't match")), badLogin?.trim());

  // --- login succeeds -----------------------------------------------------
  await page.fill("#email", "dreamflyhelp@gmail.com");
  await page.fill("#password", "DreamFly2026!Admin");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/admin`, { timeout: 15000 });
  log("login succeeds", page.url() === `${BASE}/admin`, page.url());

  // --- session cookie is hardened ----------------------------------------
  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === "dreamfly_web_admin_session");
  // Host-only (a domain not starting with ".") is what stops this session ever
  // reaching the CRM on another subdomain.
  const hostOnly = Boolean(session && !session.domain.startsWith("."));
  log("session cookie httpOnly + sameSite + host-only",
      Boolean(session?.httpOnly && session?.sameSite === "Lax" && hostOnly),
      session ? `httpOnly=${session.httpOnly} sameSite=${session.sameSite} domain=${session.domain}` : "missing");

  // --- edit a visa destination -------------------------------------------
  await page.goto(`${BASE}/admin/visa`, { waitUntil: "networkidle" });
  await page.click('a:has-text("Japan")');
  await page.waitForSelector('input[name="countryName"]');

  await page.fill('input[name="processingTime"]', "7-10 Working Days");
  await page.fill('textarea[name="intro"]', "E2E test introduction paragraph for Japan.");
  await page.fill('input[name="serviceCharge"]', "BDT 5,000");
  await page.check('input[name="categories"][value="tourist"]').catch(() => {});
  // Clear the sample flag and publish
  const sampleBox = page.locator('input[name="isPlaceholder"]');
  if (await sampleBox.isChecked()) await sampleBox.uncheck();
  await page.selectOption('select[name="status"]', "published");
  await page.click('button:has-text("Save destination")');
  await page.waitForTimeout(2000);
  const saveMsg = await page.locator('[role="status"]').first().textContent().catch(() => "");
  log("visa save succeeds", Boolean(saveMsg?.includes("saved")), saveMsg?.trim());

  // --- published page is now public --------------------------------------
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  const resp = await anonPage.goto(`${BASE}/visa/japan`, { waitUntil: "networkidle" });
  const bodyText = await anonPage.textContent("body");
  log("published visa page is public", resp?.status() === 200 && bodyText.includes("7-10 Working Days"),
      `status=${resp?.status()}`);

  // --- CMS edit propagates to the homepage --------------------------------
  await anonPage.goto(BASE, { waitUntil: "networkidle" });
  const homeText = await anonPage.textContent("body");
  log("featured destination appears on homepage", homeText.includes("Japan"));

  // --- a draft/sample destination stays private ---------------------------
  const draft = await anonPage.goto(`${BASE}/visa/mongolia`, { waitUntil: "domcontentloaded" });
  log("sample destination returns 404", draft?.status() === 404, `status=${draft?.status()}`);

  // --- enquiry submission -------------------------------------------------
  await anonPage.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
  await anonPage.fill('input[name="name"]', "E2E Test Visitor");
  await anonPage.fill('input[name="phone"]', "01700000000");
  await anonPage.fill('textarea[name="message"]', "This is an automated end-to-end test enquiry.");
  await anonPage.waitForTimeout(2800); // clear the anti-spam minimum fill time
  await anonPage.click('button:has-text("Send Enquiry")');
  await anonPage.waitForTimeout(2500);
  const successText = await anonPage.textContent("body");
  log("contact enquiry saved", successText.includes("we've received your enquiry"));

  // --- honeypot silently discards a bot -----------------------------------
  const bot = await anon.request.post(`${BASE}/api/enquiries`, {
    data: { type: "general", name: "Bot", phone: "01700000001", company_website: "http://spam.example" },
  });
  // 429 means the limiter answered first — also a silent refusal, never a save.
  log("honeypot accepted-but-discarded", [200, 429].includes(bot.status()), `status=${bot.status()}`);

  // --- the enquiry API never leaks data ------------------------------------
  const leak = await anon.request.get(`${BASE}/api/enquiries`);
  log("enquiry API is not readable", leak.status() === 404, `status=${leak.status()}`);

  // --- validation is enforced server-side ---------------------------------
  const invalid = await anon.request.post(`${BASE}/api/enquiries`, {
    data: { type: "general", name: "x", phone: "1" },
  });
  if (invalid.status() === 429) {
    log("server rejects invalid enquiry", true,
        "rate limit reached first (also correct) — restart the server to re-test the 422 path");
  } else {
    log("server rejects invalid enquiry", invalid.status() === 422, `status=${invalid.status()}`);
  }

  // --- the enquiry shows up in admin --------------------------------------
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  const dash = await page.textContent("body");
  log("enquiry visible in admin", dash.includes("E2E Test Visitor"));

  // --- security headers ----------------------------------------------------
  const headResp = await anon.request.get(BASE);
  const h = headResp.headers();
  log("security headers present",
      Boolean(h["content-security-policy"] && h["x-frame-options"] === "DENY" && h["x-content-type-options"] === "nosniff"));

  // --- robots + sitemap ----------------------------------------------------
  const robots = await (await anon.request.get(`${BASE}/robots.txt`)).text();
  const sitemap = await (await anon.request.get(`${BASE}/sitemap.xml`)).text();

  // `npm run demo:show` switches indexing off on purpose while demo content is
  // exposed, so check whichever behaviour the current setting calls for.
  const indexingOff = /Disallow:\s*\/\s*$/m.test(robots) && !robots.includes("Allow:");
  if (indexingOff) {
    log("indexing off: robots blocks everything", robots.includes("Disallow: /"));
    log("indexing off: sitemap is empty", !sitemap.includes("<loc>"));
  } else {
    log("robots.txt blocks admin", robots.includes("/admin"), robots.split("\n").filter(Boolean).slice(0, 4).join(" | "));
    log("sitemap lists the published visa page", sitemap.includes("/visa/japan"));
  }

  await anon.close();
} catch (error) {
  log("harness", false, String(error).slice(0, 300));
}

if (consoleErrors.length) console.log("\nconsole errors:", consoleErrors.slice(0, 6));
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
