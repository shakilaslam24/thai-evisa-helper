/**
 * Admin module tests: every section is exercised for real — create, edit,
 * publish, verify on the public site, then unpublish or delete.
 *
 *   npm run test:admin
 *
 * Run against a freshly started server: the rate limiter and session store live
 * in process memory.
 *
 * The campaign checks need demo content on the public site, so run
 * `npm run demo:load && npm run demo:show` first. Without it those checks
 * report as skipped rather than failing — protected demo content not appearing
 * publicly is correct behaviour, not a defect.
 */
import { chromium } from "playwright";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { BASE } from "./base-url.mjs";

const EMAIL = process.env.ADMIN_EMAIL ?? "dreamflyhelp@gmail.com";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "DreamFly2026!Admin";

const results = [];
const log = (name, pass, detail = "") => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// Confirmation dialogs are accepted throughout; each destructive step asserts
// its own outcome afterwards.
page.on("dialog", (d) => d.accept());
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

/** Navigates and waits for the admin shell to be interactive. */
async function goAdmin(path) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 20000 });
}

/** Reads the success/error banner a Server Action renders. */
async function banner() {
  const el = page.locator('[role="status"], [role="alert"]').first();
  try { return (await el.textContent({ timeout: 5000 })) ?? ""; } catch { return ""; }
}

/**
 * Deletes every record carrying this name, and reports how many there were.
 *
 * A run stopped half-way — Ctrl+C, a closed browser — leaves its fixture
 * behind. The next run then creates a second record with the same name, is
 * given the slug `...-2`, and every public check here quietly looks at the
 * wrong address. Clearing first, and looping rather than deleting one, makes
 * the suite recover from that by itself.
 */
async function removeAll(section, name, deleteLabel) {
  for (let removed = 0; ; removed += 1) {
    await goAdmin(section);
    const link = page.locator(`a:has-text("${name}")`).first();
    if (!(await link.count())) return removed;
    if (removed >= 5) return removed; // never loop forever on an unexpected page
    await link.click();
    await page.waitForURL(new RegExp(`${section}/[^/]+$`), { timeout: 20000 });
    await page.locator(`button:has-text("${deleteLabel}")`).waitFor({ state: "visible" });
    await page.click(`button:has-text("${deleteLabel}")`);
    await page.waitForURL(BASE + section, { timeout: 20000 });
  }
}

try {
  // ---------------------------------------------------------------- sign in
  await goAdmin("/admin/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/admin`, { timeout: 20000 });
  log("admin sign-in", true);

  // ------------------------------------------------- every section responds
  for (const [path, heading] of [
    ["/admin", "Welcome back"],
    ["/admin/home", "Home"],
    ["/admin/visa", "Visa Destinations"],
    ["/admin/tours", "Tour Packages"],
    ["/admin/campaigns", "Campaigns"],
    ["/admin/testimonials", "Testimonials"],
    ["/admin/about", "About Page"],
    ["/admin/media", "Media"],
    ["/admin/enquiries", "Enquiries"],
    ["/admin/seo", "SEO"],
    ["/admin/settings", "Global Settings"],
    ["/admin/audit", "Activity Log"],
  ]) {
    const resp = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 20000 });
    const h1 = await page.locator("h1").first().textContent();
    log(`section loads: ${path}`, resp?.status() === 200 && (h1 ?? "").includes(heading), h1?.trim());
  }

  // --------------------------------------------- repeatable phone numbers
  await goAdmin("/admin/settings");
  const addBtn = page.locator('button:has-text("+ Add number")');
  if (await addBtn.count()) await addBtn.first().click();
  await page.fill('input[name="number"]', "01700000099");
  await page.selectOption('select[name="label"]', "Hotline");
  await page.click('button:has-text("Add number")');
  await page.waitForTimeout(2000);
  log("add a third phone number", (await banner()).includes("added"), await banner());

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("h1").first().waitFor({ state: "visible" });
  const bodyAfterAdd = await page.textContent("body");
  log("new number listed in admin", bodyAfterAdd.includes("01700000099"));

  // It should reach the public footer, since showInFooter defaults on.
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(BASE, { waitUntil: "networkidle" });
  log("new number appears in the public footer", (await anonPage.textContent("body")).includes("01700000099"));

  // ---------------------------------------------------- remove it again
  await goAdmin("/admin/settings");
  const row = page.locator("li", { hasText: "01700000099" }).first();
  await row.locator('button:has-text("Remove")').click();
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("h1").first().waitFor({ state: "visible" });
  log("remove the number", !(await page.textContent("body")).includes("01700000099"));

  // ------------------------------------------------------ visa CRUD cycle
  await removeAll("/admin/visa", "Test Destination", "Delete destination");
  await goAdmin("/admin/visa");
  await page.fill('input[name="countryName"]', "Test Destination");
  await page.click('button:has-text("Create draft")');
  await page.waitForURL(/\/admin\/visa\/[^/]+$/, { timeout: 20000 });
  log("create a visa destination", true, page.url().split("/").pop());

  // Invalid country code must be refused, not silently accepted.
  await page.fill('input[name="countryCode"]', "X");
  await page.fill('input[name="processingTime"]', "10–14 working days");
  await page.click('button:has-text("Save destination")');
  await page.waitForTimeout(2000);
  const codeError = await page.locator(".field-error").first().textContent().catch(() => "");
  log("invalid country code rejected", (codeError ?? "").includes("two-letter"), codeError?.trim());

  await page.fill('input[name="countryCode"]', "VN");
  await page.selectOption('select[name="status"]', "published");
  const sample = page.locator('input[name="isPlaceholder"]');
  if (await sample.isChecked()) await sample.uncheck();
  await page.click('button:has-text("Save destination")');
  await page.waitForTimeout(2500);
  log("visa saves with a valid code", (await banner()).includes("saved"), await banner());

  const visaResp = await anonPage.goto(`${BASE}/visa/test-destination?cb=${Date.now()}`, {
    waitUntil: "domcontentloaded",
  });
  const visaBody = await anonPage.textContent("body");
  log(
    "published visa page is live, with the values that were typed",
    visaResp?.status() === 200 && visaBody.includes("10–14 working days"),
    `status=${visaResp?.status()}`,
  );

  // Duplicate slug must be reported clearly, not crash.
  await goAdmin("/admin/visa");
  await page.click('a:has-text("China")');
  await page.waitForURL(/\/admin\/visa\/[^/]+$/, { timeout: 20000 });
  await page.locator('input[name="slug"]').waitFor({ state: "visible" });
  await page.fill('input[name="slug"]', "test-destination");
  await page.click('button:has-text("Save destination")');
  await page.waitForTimeout(2000);
  const slugError = await page.locator(".field-error").first().textContent().catch(() => "");
  log("duplicate slug is reported", (slugError ?? "").toLowerCase().includes("different slug"), slugError?.trim());

  // ----------------------------------------- tour publishing round-trip
  // This used to drive one of the demo packages, which made the result depend
  // on whether `demo:show` happened to be in effect: a demo row is flagged as
  // a sample, and the Publish control is correctly disabled on those. The test
  // now creates its own package, so it asserts the same behaviour from any
  // starting state.
  await removeAll("/admin/tours", "Test Package", "Delete package");
  await goAdmin("/admin/tours");
  await page.fill('input[name="name"]', "Test Package");
  await page.click('button:has-text("Create draft")');
  await page.waitForURL(/\/admin\/tours\/[^/]+$/, { timeout: 20000 });
  log("create a tour package", true, page.url().split("/").pop());

  await page.locator('input[name="slug"]').waitFor({ state: "visible" });
  await page.fill('input[name="duration"]', "5 days / 4 nights");
  await page.selectOption('select[name="status"]', "published");
  const tourSample = page.locator('input[name="isPlaceholder"]');
  if (await tourSample.isChecked()) await tourSample.uncheck();
  await page.click('button:has-text("Save package")');
  await page.waitForTimeout(2500);
  log("tour saves", (await banner()).includes("saved"), await banner());

  const tourLive = await anonPage.goto(`${BASE}/tours/test-package?cb=${Date.now()}`, {
    waitUntil: "domcontentloaded",
  });
  log(
    "published tour is live, with the values that were typed",
    tourLive?.status() === 200 && (await anonPage.textContent("body")).includes("5 days / 4 nights"),
    `status=${tourLive?.status()}`,
  );

  await goAdmin("/admin/tours");
  const tourRow = () => page.locator("tr", { hasText: "Test Package" }).first();
  await tourRow().locator('button:has-text("Unpublish")').click();
  await page.waitForTimeout(2000);
  const gone = await anonPage.goto(`${BASE}/tours/test-package`, { waitUntil: "domcontentloaded" });
  log("unpublishing a tour removes it publicly", gone?.status() === 404, `status=${gone?.status()}`);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("h1").first().waitFor({ state: "visible" });
  await tourRow().locator('button:has-text("Publish")').click();
  await page.waitForTimeout(2000);
  const back = await anonPage.goto(`${BASE}/tours/test-package`, { waitUntil: "domcontentloaded" });
  log("republishing restores it", back?.status() === 200, `status=${back?.status()}`);

  // ------------------------------------------------------------- campaigns
  await anonPage.goto(BASE, { waitUntil: "networkidle" });
  const homeText = await anonPage.textContent("body");
  const visaListText = await anonPage
    .goto(`${BASE}/visa`, { waitUntil: "networkidle" })
    .then(() => anonPage.textContent("body"));

  // Demo campaigns only render while `demo:show` has exposed them.
  const demoExposed = homeText.includes("China business visas");
  if (demoExposed) {
    log("active campaign shows on the homepage", true);
    log("announcement bar shows", homeText.includes("Gulshan office is open"));
    log("visa-page campaign renders in its own place", visaListText.includes("Planning ahead"));
  } else {
    console.log("SKIP  campaign placement checks — run `npm run demo:show` to exercise them");
  }
  // This one holds either way: an expired campaign must never render.
  log("expired campaign is hidden automatically", !homeText.includes("already ended"));

  // ------------------------------------------------------------ SEO panel
  await goAdmin("/admin/seo");
  const seoText = await page.textContent("body");
  log("SEO panel reports sitemap status", seoText.includes("Sitemap") && seoText.includes("sitemap.xml"));
  log("SEO panel reports verification state", seoText.includes("Google verification"));
  log("no fake index-request control", !/request\s+index/i.test(seoText));

  // ------------------------------------------- Google verification round-trip
  await goAdmin("/admin/settings");
  await page.fill('input[name="googleSiteVerification"]', "test-verification-token-123");
  await page.click('button:has-text("Save settings")');
  await page.waitForTimeout(2500);
  const verifyHtml = await (await anon.request.get(`${BASE}/?cb=${Date.now()}`)).text();
  log("verification meta tag is emitted", verifyHtml.includes("test-verification-token-123"));

  await goAdmin("/admin/settings");
  await page.fill('input[name="googleSiteVerification"]', "");
  await page.click('button:has-text("Save settings")');
  await page.waitForTimeout(2500);
  const cleanHtml = await (await anon.request.get(`${BASE}/?cb=${Date.now()}`)).text();
  log("tag disappears when the token is cleared", !cleanHtml.includes("test-verification-token-123"));

  // ----------------------------------------------------- media upload
  // A real upload through the real pipeline: magic-byte validation, sharp
  // re-encoding to WebP, EXIF stripping, and a public URL that actually serves.
  const dir = mkdtempSync(path.join(tmpdir(), "df-upload-"));
  // A valid 4×4 PNG in DreamFly navy, written byte-for-byte.
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d4948445200000004000000040802000000269309290000001449444154" +
      "789c63149077608001260624809b030016820077bcd3e8480000000049454e44ae426082",
    "hex",
  );
  const pngPath = path.join(dir, "upload-test.png");
  writeFileSync(pngPath, png);

  await goAdmin("/admin/media");
  await page.setInputFiles("#media-files", pngPath);
  await page.fill("#media-alt", "Automated upload test image");
  await page.click('button:has-text("Upload")');
  await page.waitForTimeout(3000);
  const uploadMsg = await banner();
  log("image uploads through the admin", uploadMsg.includes("Uploaded"), uploadMsg);

  await goAdmin("/admin/media");
  const uploadedSrc = await page
    .locator('img[src^="/uploads/"]')
    .first()
    .getAttribute("src")
    .catch(() => null);
  log("uploaded image is listed in the library", Boolean(uploadedSrc), uploadedSrc ?? "not found");

  if (uploadedSrc) {
    const served = await anon.request.get(`${BASE}${uploadedSrc}`);
    log(
      "uploaded image is served publicly, re-encoded to WebP",
      served.status() === 200 && uploadedSrc.endsWith(".webp"),
      `status=${served.status()} type=${served.headers()["content-type"]}`,
    );
  }

  // A file that is not an image must be refused on its bytes, not its name.
  const fakePath = path.join(dir, "not-really-an-image.png");
  writeFileSync(fakePath, "#!/bin/sh\necho this is not an image\n");
  await goAdmin("/admin/media");
  await page.setInputFiles("#media-files", fakePath);
  await page.click('button:has-text("Upload")');
  await page.waitForTimeout(2500);
  const rejectMsg = await banner();
  log("a non-image with an image name is refused", /isn.t a supported image/i.test(rejectMsg), rejectMsg);

  // ------------------------------------------------- renamed page redirects
  await goAdmin("/admin/visa");
  await page.click('a:has-text("Thailand")');
  await page.waitForURL(/\/admin\/visa\/[^/]+$/, { timeout: 20000 });
  await page.fill('input[name="slug"]', "thailand-renamed");
  await page.click('button:has-text("Save destination")');
  await page.waitForTimeout(2500);

  const redirected = await anonPage.goto(`${BASE}/visa/thailand`, { waitUntil: "domcontentloaded" });
  log(
    "the old address redirects to the new one",
    redirected?.status() === 200 && anonPage.url().endsWith("/visa/thailand-renamed"),
    anonPage.url(),
  );

  // Put it back.
  await goAdmin("/admin/visa");
  await page.click('a:has-text("Thailand")');
  await page.waitForURL(/\/admin\/visa\/[^/]+$/, { timeout: 20000 });
  await page.fill('input[name="slug"]', "thailand");
  await page.click('button:has-text("Save destination")');
  await page.waitForTimeout(2500);

  // ----------------------------------------------------------- enquiries
  await anonPage.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
  await anonPage.fill('input[name="name"]', "Module Test Visitor");
  await anonPage.fill('input[name="phone"]', "01710000001");
  await anonPage.fill('textarea[name="message"]', "Automated admin-module test enquiry.");
  await anonPage.waitForTimeout(2800);
  await anonPage.click('button:has-text("Send Enquiry")');
  await anonPage.waitForTimeout(2500);

  await goAdmin("/admin/enquiries");
  log("enquiry reaches the inbox", (await page.textContent("body")).includes("Module Test Visitor"));

  await page.click('a:has-text("Module Test Visitor")');
  await page.waitForSelector("#enquiry-status");
  await page.selectOption("#enquiry-status", "contacted");
  await page.click('button:has-text("Update status")');
  await page.waitForTimeout(2000);
  log("status change saves", (await banner()).includes("updated"), await banner());

  await page.fill("#note-body", "Internal note added by the automated test.");
  await page.click('button:has-text("Add note")');
  await page.waitForTimeout(2000);
  log("internal note saves", (await page.textContent("body")).includes("automated test"));

  // ------------------------------------------------------------ audit log
  await goAdmin("/admin/audit");
  const auditText = await page.textContent("body");
  log("activity log records changes", auditText.includes("Test Destination") || auditText.includes("settings"));
  log("activity log holds no secrets", !/password|passwordHash|SESSION_SECRET/i.test(auditText));

  // --------------------------------------------------------- tidy up again
  const visasRemoved = await removeAll("/admin/visa", "Test Destination", "Delete destination");
  // The list was re-read by removeAll before it returned 0, so this reads the
  // real state rather than whatever the redirect left in the DOM.
  log(
    "delete removes the destination",
    visasRemoved === 1 && !(await page.textContent("body")).includes("Test Destination"),
    `removed ${visasRemoved}`,
  );

  const toursRemoved = await removeAll("/admin/tours", "Test Package", "Delete package");
  log(
    "delete removes the package",
    toursRemoved === 1 && !(await page.textContent("body")).includes("Test Package"),
    `removed ${toursRemoved}`,
  );

  // Restore the China slug the duplicate test left alone (it was rejected).
  await anon.close();
} catch (error) {
  log("harness", false, String(error).slice(0, 300));
}

const noisy = consoleErrors.filter((e) => !e.includes("404"));
if (noisy.length) console.log("\nconsole errors:", noisy.slice(0, 5));

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
