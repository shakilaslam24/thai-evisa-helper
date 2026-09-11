/**
 * Checks a setup before it is trusted.
 *
 *   npm run doctor
 *
 * Every check here exists because the mistake it catches actually happened, and
 * took a screenshot and a round trip to diagnose: a stale DATABASE_URL pointing
 * at a database beside the project, a build that never completed so the server
 * refused to start, an https origin on a local http server that left Safari
 * rendering bare HTML, a port already held by the CRM.
 *
 * Read-only. It opens the database, reads files and looks at ports; it changes
 * nothing.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import Database from "better-sqlite3";

// Loaded here rather than relying on ./db-connection, which is imported later
// and dynamically: without this the environment checks below would read an
// unloaded .env and report every variable as missing.
try {
  process.loadEnvFile();
} catch {
  // .env is optional; its absence is reported as a finding below.
}

type Level = "ok" | "warn" | "fail";
const findings: { level: Level; title: string; detail: string; fix?: string }[] = [];

const ok = (title: string, detail = "") => findings.push({ level: "ok", title, detail });
const warn = (title: string, detail: string, fix?: string) =>
  findings.push({ level: "warn", title, detail, fix });
const fail = (title: string, detail: string, fix?: string) =>
  findings.push({ level: "fail", title, detail, fix });

const ROOT = process.cwd();
const rel = (p: string) => path.relative(ROOT, p) || ".";

/** file:./data/x.db -> absolute path, resolved the way Prisma resolves it. */
function databaseFile(url: string): string | null {
  if (!url.startsWith("file:")) return null;
  const target = url.slice("file:".length);
  return path.resolve(ROOT, target);
}

async function portIsFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

async function main() {
  // ---------------------------------------------------------------- project
  const pkgPath = path.join(ROOT, "package.json");
  if (!existsSync(pkgPath)) {
    fail(
      "This is not a Node project",
      `No package.json in ${ROOT}`,
      "cd into the website's folder. npm searches parent folders, so running from the wrong place silently uses another project.",
    );
  } else {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
    if (pkg.name === "dreamfly-website") ok("Right project", pkg.name);
    else
      fail(
        "Wrong project",
        `package.json says "${pkg.name}"`,
        "You are in another application's folder — possibly the CRM. cd to the website and check out its branch.",
      );
  }

  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 20) ok("Node version", process.version);
  else
    fail(
      "Node is too old",
      process.version,
      "Install Node 20 or later; 22 LTS is what this is tested on.",
    );

  // -------------------------------------------------------------------- env
  if (!existsSync(path.join(ROOT, ".env"))) {
    fail(
      "No .env file",
      "The site cannot start without one.",
      "cp .env.example .env, then fill in SESSION_SECRET.",
    );
  } else ok(".env is present");

  const secret = (process.env.SESSION_SECRET ?? "").trim();
  if (!secret)
    fail(
      "SESSION_SECRET is empty",
      "Production refuses to start, and admin sign-in cannot work.",
      "Generate one: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    );
  else if (secret.length < 32)
    warn(
      "SESSION_SECRET is short",
      `${secret.length} characters`,
      "Use at least 32; 64 is better.",
    );
  else ok("SESSION_SECRET is set", `${secret.length} characters`);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  const port = Number(process.env.PORT ?? 3000);
  if (!siteUrl) {
    warn(
      "NEXT_PUBLIC_SITE_URL is not set",
      "Falls back to http://localhost:3000 in development; production refuses to start.",
      "Set it to https://dreamfly.bd on the server, or http://localhost:" + port + " locally.",
    );
  } else if (siteUrl.endsWith("/")) {
    fail(
      "NEXT_PUBLIC_SITE_URL ends with a slash",
      siteUrl,
      "Remove the trailing slash — canonical URLs would double up.",
    );
  } else if (siteUrl.startsWith("https://") && /localhost|127\.0\.0\.1/.test(siteUrl)) {
    fail(
      "An https origin on localhost",
      siteUrl,
      "This turns on upgrade-insecure-requests. Safari applies it to localhost, so every stylesheet, script and image 404s and the page renders unstyled. Use http:// locally.",
    );
  } else if (siteUrl.startsWith("http://") && !/localhost|127\.0\.0\.1/.test(siteUrl)) {
    fail(
      "A public origin over http",
      siteUrl,
      "Use https:// — admin cookies are secure-only and sign-in would fail.",
    );
  } else {
    const declared = Number(new URL(siteUrl).port || (siteUrl.startsWith("https") ? 443 : 80));
    if (/localhost|127\.0\.0\.1/.test(siteUrl) && declared !== port)
      warn(
        "The origin names a different port",
        `${siteUrl} but PORT=${port}`,
        `Set NEXT_PUBLIC_SITE_URL to http://localhost:${port}.`,
      );
    else ok("NEXT_PUBLIC_SITE_URL", siteUrl);
  }

  // ------------------------------------------------------------------- port
  if (port === 3000)
    warn(
      "Port 3000",
      "DreamFly's CRM uses this port.",
      'Set PORT="3100" in .env so the two can run at the same time.',
    );
  else ok("Port", String(port));

  if (!(await portIsFree(port))) {
    // Something is there. Ask it for robots.txt: this site always answers with
    // its own admin rule, so "the site is already running" can be told apart
    // from "another application has taken the port".
    let mine = false;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
        signal: AbortSignal.timeout(2000),
      });
      mine = (await response.text()).includes("Disallow: /admin");
    } catch {
      mine = false;
    }
    if (mine) ok("The site is already running", `http://localhost:${port}`);
    else
      warn(
        `Another application is listening on ${port}`,
        "It did not answer as this site.",
        `Stop it, or choose another port. lsof -i :${port} names the process.`,
      );
  }

  // --------------------------------------------------------------- database
  // Imported here, not at the top: the module rejects a DATABASE_URL that
  // climbs out of the project, and that refusal should be reported as a
  // finding with its remedy rather than ending the run with a stack trace.
  let connection: typeof import("./db-connection") | null = null;
  try {
    connection = await import("./db-connection");
  } catch (error) {
    fail(
      "DATABASE_URL is not usable",
      error instanceof Error ? (error.message.split("\n")[0] ?? "") : String(error),
      'Set DATABASE_URL="file:./data/dreamfly.db" in .env. A path with ".." lands the database beside the project, where the CRM lives.',
    );
    report();
    return;
  }
  const { connect, databaseUrl } = connection;

  const dbFile = databaseFile(databaseUrl);
  if (!dbFile) {
    ok("Database", `${databaseUrl.split("://")[0]} (not SQLite)`);
  } else if (!existsSync(dbFile)) {
    fail(
      "The database file does not exist",
      rel(dbFile),
      "Run: npx prisma migrate deploy && npm run db:seed && npm run admin:create",
    );
  } else {
    const inside = !path.relative(ROOT, dbFile).startsWith("..");
    if (inside) ok("Database", rel(dbFile));
    else
      warn(
        "The database is outside the project",
        dbFile,
        "Deliberate on a server with a mounted volume. An accident otherwise — and the folder beside the project holds the CRM.",
      );

    try {
      const raw = new Database(dbFile, { readonly: true });
      const tables = raw.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[];
      const names = tables.map((t) => t.name);
      raw.close();

      if (!names.includes("AdminUser")) {
        fail(
          "The schema is not in this database",
          `${names.length} tables, no AdminUser`,
          names.length === 0
            ? "Run: npx prisma migrate deploy"
            : 'This file belongs to a different application. Check DATABASE_URL before touching it: sqlite3 <file> ".tables"',
        );
      } else {
        const db = connect();
        const [admins, visas, tours, settings] = await Promise.all([
          db.adminUser.count(),
          db.visaDestination.count({ where: { status: "published", isPlaceholder: false } }),
          db.tourPackage.count({ where: { status: "published", isPlaceholder: false } }),
          db.globalSettings.findUnique({ where: { id: "global" } }),
        ]);

        if (admins === 0)
          fail("No admin account", "Nobody can sign in.", "Run: npm run admin:create");
        else ok("Admin accounts", String(admins));

        const [demoVisas, demoTours] = await Promise.all([
          db.visaDestination.count({
            where: {
              isPlaceholder: false,
              slug: { in: ["china", "japan", "thailand", "malaysia"] },
            },
          }),
          db.tourPackage.count({
            where: { isPlaceholder: false, slug: { startsWith: "thailand-escape" } },
          }),
        ]);
        if (demoVisas + demoTours > 0)
          warn(
            "Demo content is live",
            `${demoVisas + demoTours} record(s) visible to visitors`,
            "Run `npm run demo:hide` before launch, or `npm run demo:clear` to remove it. `npm run demo:list` shows what is exposed.",
          );
        else ok("Demo content is protected");

        if (settings?.allowIndexing === false)
          warn(
            "Search engine indexing is off",
            "robots.txt is serving Disallow: /",
            "Turn it on in Global Settings before launch — `npm run demo:show` switches it off deliberately.",
          );
        else ok("Search engines are allowed");

        ok("Published content", `${visas} visa page(s), ${tours} tour package(s)`);
        await db.$disconnect();
      }
    } catch (error) {
      fail(
        "The database could not be read",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // ----------------------------------------------------------------- uploads
  const uploadDir = path.resolve(
    ROOT,
    (process.env.UPLOAD_DIR ?? "./data/uploads").replace(/^file:/, ""),
  );
  if (!existsSync(uploadDir))
    warn(
      "The upload folder does not exist yet",
      rel(uploadDir),
      "It is created on the first upload. On a server, make sure it is on persistent storage.",
    );
  else ok("Upload folder", rel(uploadDir));

  // ------------------------------------------------------------------ build
  const buildId = path.join(ROOT, ".next", "BUILD_ID");
  if (!existsSync(buildId)) {
    fail(
      "No production build",
      "`npm start` will refuse to start.",
      "Run: npm run build — and read its output. If a migration fails, the build never runs.",
    );
  } else {
    const built = statSync(buildId).mtimeMs;
    const newest = newestSourceTime(path.join(ROOT, "src"));
    if (newest > built)
      warn(
        "The build is older than the source",
        "Changes since the last build are not being served.",
        "Run: npm run build",
      );
    else ok("Production build", new Date(built).toISOString().slice(0, 16).replace("T", " "));
  }

  report();
}

function newestSourceTime(dir: string, newest = 0): number {
  if (!existsSync(dir)) return newest;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const s = statSync(full);
    newest = s.isDirectory() ? newestSourceTime(full, newest) : Math.max(newest, s.mtimeMs);
  }
  return newest;
}

function report() {
  const icon = { ok: "  ok  ", warn: " warn ", fail: " FAIL " } as const;
  console.log("\n=== DreamFly website — setup check ===\n");
  for (const f of findings) {
    console.log(`[${icon[f.level]}] ${f.title}${f.detail ? ` — ${f.detail}` : ""}`);
    if (f.fix) console.log(`            ${f.fix}`);
  }
  const fails = findings.filter((f) => f.level === "fail").length;
  const warns = findings.filter((f) => f.level === "warn").length;
  console.log(
    `\n${findings.length - fails - warns} ok, ${warns} warning(s), ${fails} problem(s)` +
      (fails === 0 && warns === 0 ? " — ready to run.\n" : "\n"),
  );
  process.exitCode = fails > 0 ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
