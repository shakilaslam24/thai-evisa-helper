/** Small, dependency-free formatting helpers shared by public and admin UI. */

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE_FORMAT.format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME_FORMAT.format(date);
}

/** Splits admin-entered multi-line text into paragraphs for rendering. */
export function paragraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

/** Splits admin-entered text into single lines (used for note lists). */
export function lines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

/**
 * Regional-indicator flag from an ISO 3166-1 alpha-2 code.
 * Returns null for anything else so the UI can fall back gracefully.
 */
export function flagEmoji(countryCode: string | null | undefined): string | null {
  const code = countryCode?.trim().toUpperCase();
  if (!code || !/^[A-Z]{2}$/.test(code)) return null;
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Only allow same-origin or explicit http(s) links from CMS fields. */
export function safeHref(href: string | null | undefined, fallback = "#"): string {
  const value = href?.trim();
  if (!value) return fallback;
  if (value.startsWith("/") || value.startsWith("#")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(tel:|mailto:)/i.test(value)) return value;
  return fallback;
}
