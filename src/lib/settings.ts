import "server-only";
import { cache } from "react";
import { db } from "./db";
import { env } from "./env";

export type SiteSettings = Awaited<ReturnType<typeof loadSettings>>;

const SETTINGS_ID = "global";

/**
 * Global settings, loaded once per request.
 *
 * Every component that needs a phone number, address, social link or SEO
 * default reads from here. Business information is never hard-coded in a
 * component (brief §13).
 *
 * Phone numbers, email addresses and office hours are repeatable rows rather
 * than fixed columns, so staff can add a hotline or a B2B line from the admin
 * panel without a code change (brief §4). Derived single values —
 * `primaryPhone`, `email`, `whatsappDigits` — are computed here so callers that
 * only need "the main number" stay simple.
 */
export const getSettings = cache(loadSettings);

async function loadSettings() {
  const [row, numbers, emails, hours] = await Promise.all([
    db.globalSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
      include: { logoLight: true, logoDark: true, favicon: true, defaultSocialImg: true },
    }),
    db.contactNumber.findMany({ where: { archived: false }, orderBy: { sortOrder: "asc" } }),
    db.contactEmail.findMany({ where: { archived: false }, orderBy: { sortOrder: "asc" } }),
    db.officeHour.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const addressLines = [
    row.addressLine1,
    row.addressLine2,
    [row.city, row.country].filter(Boolean).join(", "),
  ]
    .map((line) => line.trim())
    .filter(Boolean);

  // The primary number is the one flagged primary, else the first listed.
  const primary = numbers.find((n) => n.isPrimary) ?? numbers[0] ?? null;
  const primaryWhatsapp =
    numbers.find((n) => n.isPrimaryWhatsapp && n.whatsappEnabled) ??
    numbers.find((n) => n.whatsappEnabled) ??
    null;
  const primaryEmail = emails.find((e) => e.isPrimary) ?? emails[0] ?? null;

  return {
    ...row,

    /** Every visible contact number, in admin-chosen order. */
    phones: numbers,
    headerPhones: numbers.filter((n) => n.showInHeader),
    footerPhones: numbers.filter((n) => n.showInFooter),
    contactPhones: numbers.filter((n) => n.showOnContact),
    mobileBarPhones: numbers.filter((n) => n.showInMobileBar),

    emails,
    footerEmails: emails.filter((e) => e.showInFooter),
    contactEmails: emails.filter((e) => e.showOnContact),

    /** Structured opening hours; `officeHours` remains as a free-text fallback. */
    officeHourRows: hours,

    /** Derived single values, so simple callers don't have to pick from a list. */
    primaryPhone: primary?.number ?? "",
    email: primaryEmail?.address ?? "",
    /** Digits-only WhatsApp number, safe to place in a wa.me link. */
    whatsappDigits: (primaryWhatsapp?.whatsappNumber || primaryWhatsapp?.number || "").replace(
      /\D/g,
      "",
    ),

    /** Full postal address as a single string. */
    addressText: addressLines.join(", "),
    addressLines,

    /** Site origin: the saved value wins, then the environment. */
    origin: (row.siteUrl || env.siteUrl).replace(/\/+$/, ""),

    /** Logo sources fall back to the packaged official brand assets. */
    logoLightUrl: row.logoLight?.url ?? "/brand/logo-horizontal-navy.png",
    logoDarkUrl: row.logoDark?.url ?? "/brand/logo-horizontal-white.png",
    socialImageUrl: row.defaultSocialImg?.url ?? "/brand/og-default.png",
    hasAnalytics: Boolean(row.gaMeasurementId || row.gtmContainerId || row.metaPixelId),
  };
}

/** Formats a phone number for a `tel:` link. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** The label shown beside a number — "Other" defers to the custom label. */
export function numberLabel(entry: { label: string; customLabel: string }): string {
  return entry.label === "Other" && entry.customLabel.trim()
    ? entry.customLabel.trim()
    : entry.label;
}

export const PHONE_LABELS = [
  { value: "Main Office", label: "Main Office" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Hotline", label: "Hotline" },
  { value: "B2B", label: "B2B" },
  { value: "Support", label: "Support" },
  { value: "Other", label: "Other" },
] as const;

export const CAMPAIGN_LOCATIONS = [
  { value: "homepage", label: "Homepage section" },
  { value: "announcement_bar", label: "Announcement bar (site-wide)" },
  { value: "visa", label: "Visa listing page" },
  { value: "tours", label: "Tour listing page" },
  { value: "b2b", label: "B2B page" },
] as const;
