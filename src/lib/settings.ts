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
 */
export const getSettings = cache(loadSettings);

async function loadSettings() {
  const row = await db.globalSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
    include: {
      logoLight: true,
      logoDark: true,
      favicon: true,
      defaultSocialImg: true,
    },
  });

  const addressLines = [
    row.addressLine1,
    row.addressLine2,
    [row.city, row.country].filter(Boolean).join(", "),
  ]
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    ...row,
    /** Full postal address as a single string. */
    addressText: addressLines.join(", "),
    addressLines,
    /** Digits-only WhatsApp number, safe to place in a wa.me link. */
    whatsappDigits: row.whatsappNumber.replace(/\D/g, ""),
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
