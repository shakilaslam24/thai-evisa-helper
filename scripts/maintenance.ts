/**
 * Nightly housekeeping.
 *
 *   npm run maintenance
 *
 * Nothing here is urgent on any given day, which is exactly why it needs a
 * schedule: each of these grows quietly and is only noticed as a full disk or a
 * slow admin screen, months in.
 *
 * Safe to run while the site is serving. It deletes only expired rows and
 * checkpoints the write-ahead log; it never touches content, media or
 * enquiries.
 */
import { connect } from "./db-connection";

/**
 * Genuine admin history — who published what, who changed a setting — is worth
 * a year. Failed sign-ins are worth far less and arrive far faster: the login
 * rate limiter caps one address at 10 attempts per 15 minutes, but a scanner
 * spread across many addresses still writes a row for each one.
 */
const KEEP_DAYS = { auditLog: 365, failedLogins: 30 };

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  const db = connect();
  try {
    const [failed, older, sessions] = await Promise.all([
      db.auditLog.deleteMany({
        where: { action: "login_failed", createdAt: { lt: daysAgo(KEEP_DAYS.failedLogins) } },
      }),
      db.auditLog.deleteMany({ where: { createdAt: { lt: daysAgo(KEEP_DAYS.auditLog) } } }),
      db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    ]);

    // Folds the write-ahead log back into the database and truncates it.
    // SQLite checkpoints on its own, but a long-running read can defer that,
    // and the -wal file then sits there holding disk.
    await db.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");

    const remaining = await db.auditLog.count();
    console.log(
      `Removed ${failed.count} failed sign-in record(s) older than ${KEEP_DAYS.failedLogins} days,`,
    );
    console.log(`        ${older.count} audit entr(ies) older than ${KEEP_DAYS.auditLog} days,`);
    console.log(`        ${sessions.count} expired session(s).`);
    console.log(`Audit log now holds ${remaining} entries. Write-ahead log checkpointed.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Maintenance failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
