/**
 * CRM isolation guarantees.
 *
 * DreamFly runs a separate CRM. This website must stay completely standalone —
 * the two are deployed on different hosts (main domain and a subdomain) and
 * must never share a database, a session, a cookie, or browser storage.
 *
 * These are structural assertions over the source itself, so a future change
 * that quietly couples the two systems fails the test suite rather than
 * shipping.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { assertContainedDatabaseUrl } from "../src/lib/db-url.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const rel = path.join(dir, entry);
    const full = path.join(ROOT, rel);
    if (statSync(full).isDirectory()) {
      if (entry === "generated" || entry === "node_modules") continue;
      sourceFiles(rel, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(rel);
    }
  }
  return acc;
}

const FILES = [...sourceFiles("src"), ...sourceFiles("prisma"), ...sourceFiles("scripts")];
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

/** Strips comments, so documentation mentioning the CRM doesn't fail the test. */
function code(file: string): string {
  return read(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*\*.*$/gm, "");
}

describe("CRM isolation", () => {
  const fetchedUrls = (file: string) =>
    [...code(file).matchAll(/fetch\(\s*([`"'])([^`"']*)\1/g)].map((m) => m[2] ?? "");

  it("makes no network request to anywhere but its own API", () => {
    // The application itself. No exceptions: every call must be a relative
    // path served by this site.
    const offenders: string[] = [];
    for (const file of [...sourceFiles("src"), ...sourceFiles("prisma")]) {
      for (const url of fetchedUrls(file)) {
        if (!url.startsWith("/")) offenders.push(`${file}: fetch("${url}")`);
      }
    }
    assert.deepEqual(offenders, [], `Unexpected outbound fetch:\n${offenders.join("\n")}`);
  });

  it("keeps the command-line scripts on this machine", () => {
    // Scripts are local tools, not shipped code, and one of them — the setup
    // doctor — asks this site's own port for robots.txt to tell "already
    // running" from "another application took the port". Loopback is therefore
    // allowed here and nothing else is: a script must never reach a remote
    // service, and must never be given an address it did not derive itself.
    const offenders: string[] = [];
    for (const file of sourceFiles("scripts")) {
      for (const url of fetchedUrls(file)) {
        const local = url.startsWith("/") || /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url);
        if (!local) offenders.push(`${file}: fetch("${url}")`);
      }
    }
    assert.deepEqual(offenders, [], `Script reaches off this machine:\n${offenders.join("\n")}`);
  });

  it("opens exactly one database, and only via DATABASE_URL", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const body = code(file);
      if (!body.includes("PrismaClient(") && !body.includes("PrismaBetterSqlite3(")) continue;
      // Every connection must derive from the environment — either directly, or
      // through the validated `env` module, which itself reads DATABASE_URL.
      const fromEnvironment = body.includes("DATABASE_URL") || body.includes("env.databaseUrl");
      if (!fromEnvironment) offenders.push(`${file}: connects without DATABASE_URL`);
    }
    assert.deepEqual(offenders, [], offenders.join("\n"));
  });

  it("uses one consistent fallback database path everywhere", () => {
    const paths = new Set<string>();
    for (const file of FILES.concat(["prisma.config.ts"])) {
      for (const match of read(file).matchAll(/["'](file:[^"']+)["']/g)) {
        paths.add(match[1] ?? "");
      }
    }
    assert.equal(
      paths.size,
      1,
      `Migrations and the running app must agree on one file. Found: ${[...paths].join(", ")}`,
    );
  });

  it("refuses a database path that climbs out of the project", () => {
    // The CRM lives in the folder beside this project, so a relative path with
    // ".." in it is not a cosmetic mistake: it is how this site would end up
    // running migrations against the CRM's database.
    for (const url of ["file:../data/dreamfly-website.db", "file:./../db.sqlite", "file:../../x.db"]) {
      assert.throws(() => assertContainedDatabaseUrl(url), /points outside the project/, url);
    }
  });

  it("accepts the paths a real deployment uses", () => {
    for (const url of [
      "file:./data/dreamfly-website.db",
      "file:data/dreamfly-website.db",
      "file:/var/lib/dreamfly/dreamfly-website.db",
      "postgresql://user:pw@host:5432/dreamfly",
    ]) {
      assert.equal(assertContainedDatabaseUrl(url), url);
    }
  });

  it("never scopes the session cookie to a parent domain", () => {
    const session = code("src/lib/auth/session.ts");
    assert.ok(
      !/domain\s*:/.test(session),
      "The session cookie must stay host-only so it never reaches the CRM's subdomain.",
    );
  });

  it("namespaces the cookie and storage keys to this website", () => {
    assert.ok(
      read("src/lib/auth/session.ts").includes('"dreamfly_web_admin_session"'),
      "Cookie name must identify the website, so a CRM cookie cannot collide with it.",
    );
    assert.ok(
      read("src/lib/attribution.ts").includes('"dreamfly_web_attribution"'),
      "Storage key must identify the website.",
    );
  });

  it("imports nothing from outside this project", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const match of code(file).matchAll(/from\s+["'](\.\.[^"']*)["']/g)) {
        const spec = match[1] ?? "";
        const resolved = path.resolve(ROOT, path.dirname(file), spec);
        if (!resolved.startsWith(ROOT)) offenders.push(`${file}: imports ${spec}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `Import reaching outside the project:\n${offenders.join("\n")}`,
    );
  });

  it("keeps dispatchEnquiry a no-op — no CRM integration in this release", () => {
    const dispatch = code("src/lib/enquiries/dispatch.ts");
    const body = dispatch.slice(dispatch.indexOf("export async function dispatchEnquiry"));
    assert.ok(!/fetch\(|axios|http/.test(body), "dispatchEnquiry must not call out anywhere yet.");
  });
});
