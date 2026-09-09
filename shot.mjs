import { chromium } from "playwright";
const [, , url, out, w, h, mode] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: "networkidle", timeout: 45000 });
await p.evaluate(async () => {
  const s = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += s) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); }
  window.scrollTo(0, 0);
});
await p.waitForLoadState("networkidle");
await p.evaluate(() => document.querySelectorAll(".reveal").forEach(n => (n.dataset.visible = "true")));
await p.waitForTimeout(500);
await p.screenshot({ path: out, fullPage: mode === "full" });
await b.close();
