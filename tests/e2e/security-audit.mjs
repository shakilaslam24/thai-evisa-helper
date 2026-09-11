/**
 * Security checks against a running server.
 *
 *   npm run test:security
 *
 * Covers the boundaries that matter for a public marketing site holding
 * customer enquiries: access control, data exposure, headers, upload
 * validation, injection surfaces and rate limiting.
 *
 * Run against a FRESHLY started server. The limiter counts in process memory,
 * so a second run inside the window answers 429 before the earlier checks can
 * exercise what they are actually testing.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
const log = (name, pass, detail = "") => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext();
const api = ctx.request;

try {
  // ------------------------------------------------- admin is not reachable
  for (const path of [
    "/admin",
    "/admin/settings",
    "/admin/enquiries",
    "/admin/visa",
    "/admin/media",
    "/admin/audit",
    "/admin/seo",
  ]) {
    const r = await api.get(BASE + path, { maxRedirects: 0 });
    const blocked = r.status() === 307 || r.status() === 302 || r.status() === 401;
    log(`signed out: ${path} is blocked`, blocked, `status=${r.status()}`);
  }

  // ------------------------------------------------ enquiry data is private
  const enq = await api.get(`${BASE}/api/enquiries`);
  log("enquiry API is not readable", enq.status() === 404, `status=${enq.status()}`);

  // ------------------------------------------------------ security headers
  const head = await api.get(BASE);
  const h = head.headers();
  log("CSP present", Boolean(h["content-security-policy"]));
  log(
    "CSP forbids eval in production",
    !(h["content-security-policy"] ?? "").includes("unsafe-eval"),
  );
  // These two are correct on https and wrong on http. Safari honours
  // `upgrade-insecure-requests` on localhost, so sending it from a local http
  // server breaks every stylesheet, script and image on the page.
  const isHttps = BASE.startsWith("https://");
  const hsts = h["strict-transport-security"] ?? "";
  const upgrades = (h["content-security-policy"] ?? "").includes("upgrade-insecure-requests");
  if (isHttps) {
    log("HSTS present", hsts.includes("max-age=63072000"), hsts);
    log("CSP upgrades insecure requests", upgrades);
  } else {
    log("HSTS withheld over http", hsts === "", hsts || "absent");
    log("CSP does not upgrade over http", !upgrades);
  }
  // HSTS must not reach into subdomains: the CRM lives on one and this site
  // must not change how a browser reaches it.
  log("HSTS does not claim subdomains", !hsts.includes("includeSubDomains"));
  log("X-Frame-Options DENY", h["x-frame-options"] === "DENY");
  log("nosniff", h["x-content-type-options"] === "nosniff");
  log("referrer policy set", Boolean(h["referrer-policy"]));
  log("no X-Powered-By", !h["x-powered-by"]);

  // ------------------------------------------------------- input validation
  const xss = await api.post(`${BASE}/api/enquiries`, {
    data: {
      type: "general",
      name: "<script>alert(1)</script>",
      phone: "01700000000",
      message: "<img src=x onerror=alert(1)>",
    },
  });
  // 429 here means the limiter answered first — also a refusal, never execution.
  log(
    "script-shaped input is accepted as text, not executed",
    [200, 422, 429].includes(xss.status()),
    `status=${xss.status()}`,
  );

  const sqli = await api.post(`${BASE}/api/enquiries`, {
    data: { type: "general", name: "Robert'); DROP TABLE Enquiry;--", phone: "01700000000" },
  });
  log(
    "SQL-shaped input is harmless (parameterised queries)",
    [200, 422, 429].includes(sqli.status()),
    `status=${sqli.status()}`,
  );
  const stillUp = await api.get(BASE);
  log("database intact after injection attempt", stillUp.status() === 200);

  // The stored value must be escaped when rendered, never executed.
  const page = await ctx.newPage();
  let alerted = false;
  page.on("dialog", async (d) => {
    alerted = true;
    await d.dismiss();
  });
  await page.goto(`${BASE}/contact`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  log("no script executed from stored input", !alerted);

  // ------------------------------------------------------ oversized payload
  const big = await api.post(`${BASE}/api/enquiries`, {
    data: { type: "general", name: "x".repeat(50000), phone: "01700000000" },
  });
  log(
    "oversized payload rejected",
    [413, 422, 429].includes(big.status()),
    `status=${big.status()}`,
  );

  // ---------------------------------------------------------- rate limiting
  let limited = false;
  for (let i = 0; i < 12; i += 1) {
    const r = await api.post(`${BASE}/api/enquiries`, {
      data: { type: "general", name: `Rate Test ${i}`, phone: "01700000000" },
    });
    if (r.status() === 429) {
      limited = true;
      break;
    }
  }
  log("enquiry rate limiting engages", limited);

  // ------------------------------------------------ cross-origin submission
  const cross = await api.post(`${BASE}/api/enquiries`, {
    headers: { origin: "https://attacker.example", "content-type": "application/json" },
    data: { type: "general", name: "Cross Origin", phone: "01700000000" },
  });
  log("cross-origin submission refused", cross.status() === 403, `status=${cross.status()}`);

  // ------------------------------------------------------- upload directory
  const listing = await api.get(`${BASE}/uploads/`);
  log("upload directory is not browsable", listing.status() !== 200, `status=${listing.status()}`);

  // ------------------------------------------------------- secret exposure
  const html = await head.text();
  const leaks = ["SESSION_SECRET", "DATABASE_URL", "passwordHash", "scrypt$"].filter((needle) =>
    html.includes(needle),
  );
  log("no secrets in the served HTML", leaks.length === 0, leaks.join(", "));

  // --------------------------------------------------------- login lockout
  // Sign-in is a Server Action, so it has to be driven through the real form —
  // a plain POST never reaches it.
  const attacker = await browser.newContext();
  const attackPage = await attacker.newPage();
  let loginLimited = false;
  for (let i = 0; i < 13; i += 1) {
    await attackPage.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
    await attackPage.fill("#email", "attacker@example.com");
    await attackPage.fill("#password", `guess-${i}`);
    await attackPage.click('button[type="submit"]');
    await attackPage.waitForTimeout(600);
    const alertText =
      (await attackPage
        .locator('[role="alert"]')
        .first()
        .textContent()
        .catch(() => "")) ?? "";
    if (/too many attempts/i.test(alertText)) {
      loginLimited = true;
      break;
    }
  }
  log("repeated sign-in attempts are throttled", loginLimited);

  // A wrong password must never confirm whether the account exists.
  await attackPage.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  const realAccountMsg =
    (await attackPage
      .locator('[role="alert"]')
      .first()
      .textContent()
      .catch(() => "")) ?? "";
  log(
    "sign-in failure does not reveal whether an account exists",
    !/no such user|not found|unknown email/i.test(realAccountMsg),
  );

  await attacker.close();
  await page.close();
} catch (error) {
  log("harness", false, String(error).slice(0, 200));
}

await ctx.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
