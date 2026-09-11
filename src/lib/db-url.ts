/**
 * Guards the SQLite path in DATABASE_URL.
 *
 * A relative path is resolved against the working directory, so `..` in it
 * puts the database BESIDE the project rather than inside it — in a folder
 * holding whatever else happens to live there. On the machine this site is
 * developed on that is DreamFly's CRM, and `prisma migrate deploy` would then
 * be pointed at an unrelated application's database.
 *
 * An absolute path is a deliberate choice — a mounted volume on the server,
 * for instance — and is left alone. `..` is not; it is what a stale `.env`
 * copied from an older template looks like.
 *
 * Deliberately free of imports so both the Next app and the Prisma CLI (which
 * cannot load a "server-only" module) can use it.
 */
export function assertContainedDatabaseUrl(url: string): string {
  if (!url.startsWith("file:")) return url; // PostgreSQL and friends

  const target = url.slice("file:".length);
  const isAbsolute = target.startsWith("/");
  if (isAbsolute || !target.split("/").includes("..")) return url;

  throw new Error(
    `DATABASE_URL points outside the project: ${url}\n\n` +
      `A relative SQLite path is resolved against the project folder, so ".." ` +
      `puts the database next to the project, alongside unrelated ` +
      `applications — this site must never open one of those.\n\n` +
      `Use file:./data/dreamfly-website.db in .env, or an absolute path if the ` +
      `database genuinely lives elsewhere.`,
  );
}

/** The one default path. Migrations, the app and the scripts all use this. */
export const DEFAULT_DATABASE_URL = "file:./data/dreamfly-website.db";

/**
 * Reads DATABASE_URL, falling back to the default.
 *
 * An empty or blank value counts as unset — a `DATABASE_URL=` line left in
 * .env would otherwise be passed through as "" and open an unnamed database.
 */
export function resolveDatabaseUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  return assertContainedDatabaseUrl(value === "" ? DEFAULT_DATABASE_URL : value);
}
