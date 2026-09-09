import { z } from "zod";

/** Shared field builders so admin schemas stay consistent. */
const text = (max = 300) => z.string().trim().max(max).optional().default("");
const longText = (max = 8000) => z.string().trim().max(max).optional().default("");
const required = (label: string, max = 300) =>
  z.string().trim().min(1, `${label} is required.`).max(max);
const url = (label: string) =>
  z
    .union([z.literal(""), z.url(`${label} must be a full URL starting with https://`)])
    .optional()
    .default("");
const bool = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((value) => value === "on" || value === "true");
const list = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => (Array.isArray(value) ? value : value ? [value] : []));
const slug = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.");
const optionalId = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));
const order = z.coerce.number().int().min(0).max(9999).optional().default(0);

export const globalSettingsSchema = z.object({
  companyName: required("Company name", 120),
  tagline: text(160),
  // Phone numbers and email addresses are repeatable rows (ContactNumber /
  // ContactEmail), not columns here — see contactNumberSchema below.
  addressLine1: text(200),
  addressLine2: text(200),
  city: text(120),
  country: text(120),
  googleMapsUrl: url("Google Maps URL"),
  googleMapsEmbed: url("Google Maps embed URL"),
  facebookUrl: url("Facebook URL"),
  instagramUrl: url("Instagram URL"),
  tiktokUrl: url("TikTok URL"),
  youtubeUrl: url("YouTube URL"),
  linkedinUrl: url("LinkedIn URL"),
  officeHours: text(200),
  footerText: longText(600),
  googleSiteVerification: text(200),
  bingSiteVerification: text(200),
  gaMeasurementId: text(40),
  gtmContainerId: text(40),
  metaPixelId: text(40),
  defaultSeoTitle: text(200),
  defaultSeoDescription: longText(400),
  siteUrl: url("Site URL"),
  allowIndexing: bool,
  logoLightId: optionalId,
  logoDarkId: optionalId,
  faviconId: optionalId,
  defaultSocialImageId: optionalId,
});

export const homeSectionSchema = z.object({
  key: required("Key", 40),
  enabled: bool,
  sortOrder: order,
  heading: text(200),
  subheading: longText(400),
  ctaLabel: text(80),
  ctaHref: text(200),
});

export const heroSchema = z.object({
  eyebrow: text(120),
  headline: text(200),
  headlineAccent: text(120),
  description: longText(600),
  brandLine: text(120),
  badge: text(120),
  videoUrl: text(400),
  primaryCtaLabel: text(60),
  primaryCtaHref: text(200),
  secondaryCtaLabel: text(60),
  secondaryCtaHref: text(200),
  desktopImageId: optionalId,
  mobileImageId: optionalId,
});

export const homeServiceSchema = z.object({
  id: text(40),
  title: required("Title", 120),
  description: longText(400),
  icon: text(40),
  href: text(200),
  enabled: bool,
  sortOrder: order,
});

export const homeWhySchema = z.object({
  id: text(40),
  title: required("Title", 120),
  description: longText(400),
  icon: text(40),
  enabled: bool,
  sortOrder: order,
});

export const visaSchema = z.object({
  countryName: required("Country name", 120),
  slug,
  // Either empty, or exactly two letters. A single stray letter used to pass
  // and then silently produced no flag.
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === "" || /^[A-Z]{2}$/.test(value), {
      message: "Use a two-letter country code, e.g. JP for Japan. Leave empty for no flag.",
    })
    .default(""),
  intro: longText(4000),
  categories: list,
  visaFormats: list,
  entryTypes: list,
  processingTime: text(160),
  serviceCharge: text(200),
  embassyFee: text(200),
  otherCharges: text(200),
  feeNote: longText(600),
  eligibility: longText(4000),
  applicationProcess: longText(4000),
  importantNotes: longText(4000),
  whatsappMessage: longText(400),
  featured: bool,
  featuredOrder: order,
  status: z.enum(["draft", "published", "archived"]),
  isPlaceholder: bool,
  seoTitle: text(200),
  seoDescription: longText(400),
  ogTitle: text(200),
  ogDescription: longText(400),
  canonicalUrl: url("Canonical URL"),
  noindex: bool,
  coverImageId: optionalId,
  flagImageId: optionalId,
  ogImageId: optionalId,
  documents: longText(8000),
  faqs: longText(20000),
});

export const tourSchema = z.object({
  name: required("Package name", 180),
  slug,
  destination: text(120),
  country: text(120),
  shortDescription: longText(600),
  duration: text(80),
  travelDates: text(160),
  packageType: z.enum(["group", "private", "custom"]),
  startingPrice: text(60),
  currency: text(10),
  hotelDetails: longText(4000),
  importantNotes: longText(4000),
  availability: z.enum(["available", "upcoming", "sold_out"]),
  whatsappMessage: longText(400),
  featured: bool,
  featuredOrder: order,
  status: z.enum(["draft", "published", "archived"]),
  isPlaceholder: bool,
  seoTitle: text(200),
  seoDescription: longText(400),
  ogTitle: text(200),
  ogDescription: longText(400),
  canonicalUrl: url("Canonical URL"),
  noindex: bool,
  coverImageId: optionalId,
  ogImageId: optionalId,
  highlights: longText(4000),
  includes: longText(4000),
  excludes: longText(4000),
  itinerary: longText(20000),
});

export const campaignSchema = z.object({
  name: required("Campaign name", 160),
  headline: text(200),
  description: longText(600),
  ctaLabel: text(80),
  ctaHref: text(200),
  startsAt: text(40),
  endsAt: text(40),
  active: bool,
  featured: bool,
  displayLocation: z.enum(["homepage", "announcement_bar", "visa", "tours", "b2b"]),
  sortOrder: order,
  isPlaceholder: bool,
  desktopImageId: optionalId,
  mobileImageId: optionalId,
});

export const testimonialSchema = z.object({
  authorName: required("Author name", 120),
  authorTitle: text(160),
  quote: required("Quote", 1200),
  serviceType: text(120),
  destination: text(120),
  reviewDate: text(40),
  rating: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(5)])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : Number(value))),
  published: bool,
  sortOrder: order,
  isPlaceholder: bool,
  avatarId: optionalId,
});

export const aboutSchema = z.object({
  heroHeading: text(200),
  heroSubheading: longText(400),
  whoWeAre: longText(6000),
  mission: longText(3000),
  vision: longText(3000),
  approach: longText(3000),
  galleryHeading: text(160),
  teamHeading: text(160),
});

export const pageSeoSchema = z.object({
  pageKey: required("Page", 60),
  title: text(200),
  description: longText(400),
  ogTitle: text(200),
  ogDescription: longText(400),
  canonicalUrl: url("Canonical URL"),
  noindex: bool,
  ogImageId: optionalId,
});

export const enquiryUpdateSchema = z.object({
  id: required("Enquiry", 40),
  status: z.enum(["new", "contacted", "follow_up", "converted", "closed", "archived"]),
});

export const enquiryNoteSchema = z.object({
  enquiryId: required("Enquiry", 40),
  body: required("Note", 2000),
});

export const mediaUpdateSchema = z.object({
  id: required("Media", 40),
  altText: text(300),
  title: text(200),
  caption: text(400),
});

/** A single contact number row (brief §4). */
export const contactNumberSchema = z.object({
  id: text(40),
  label: z.enum(["Main Office", "WhatsApp", "Hotline", "B2B", "Support", "Other"]),
  customLabel: text(60),
  number: required("Phone number", 32).regex(/^[0-9+()\-\s]+$/, "Use digits and + ( ) - only."),
  whatsappNumber: z
    .string()
    .trim()
    .max(24)
    .regex(/^[0-9]*$/, "Digits only, in full international form — e.g. 8801335374437.")
    .optional()
    .default(""),
  whatsappEnabled: bool,
  isPrimary: bool,
  isPrimaryWhatsapp: bool,
  showInHeader: bool,
  showInFooter: bool,
  showOnContact: bool,
  showInMobileBar: bool,
  sortOrder: order,
});

export const contactEmailSchema = z.object({
  id: text(40),
  label: text(60),
  address: z.email("Enter a valid email address."),
  isPrimary: bool,
  showInFooter: bool,
  showOnContact: bool,
  sortOrder: order,
});

export const officeHourSchema = z.object({
  id: text(40),
  label: required("Days", 80),
  value: required("Hours", 80),
  note: text(160),
  published: bool,
  sortOrder: order,
});
