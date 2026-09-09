import "server-only";

/**
 * Server-side environment. Read once, validated once.
 * Nothing here is ever sent to the browser — the only public value is
 * NEXT_PUBLIC_SITE_URL, which Next inlines at build time by name.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value.trim();
}

const isProduction = process.env.NODE_ENV === "production";

/** Dev-only fallback so `npm run dev` works before .env is written. */
const DEV_SESSION_SECRET = "dreamfly-development-secret-do-not-use-in-production";

export const env = {
  isProduction,
  databaseUrl: process.env.DATABASE_URL ?? "file:../data/dreamfly.db",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  sessionSecret: isProduction
    ? required("SESSION_SECRET", process.env.SESSION_SECRET)
    : process.env.SESSION_SECRET?.trim() || DEV_SESSION_SECRET,
  uploadDir: process.env.UPLOAD_DIR ?? "./public/uploads",
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 8 * 1024 * 1024),
  trustProxy: process.env.TRUST_PROXY === "1",
} as const;
