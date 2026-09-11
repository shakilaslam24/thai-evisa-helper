/**
 * Where the suites point.
 *
 * BASE_URL wins, so a suite can be run against the deployed site. Otherwise the
 * port comes from .env — npm does not load it, and `PORT` lives there because
 * DreamFly's CRM holds 3000. Two of these suites used to hardcode 3000 and
 * silently ignore BASE_URL, which made the documented
 * `BASE_URL=https://dreamfly.bd npm run test:audit` a no-op.
 */
try {
  process.loadEnvFile();
} catch {
  // .env is optional.
}

export const BASE = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
