import { z } from "zod";

/**
 * Shared validation for every public form. The same schema runs in the browser
 * (instant feedback) and on the server (the authority). Never trust the client.
 */

const name = z.string().trim().min(2, "Please enter your name.").max(120);
const phone = z
  .string()
  .trim()
  .min(6, "Please enter a valid phone number.")
  .max(32)
  .regex(/^[0-9+()\-\s]+$/, "Phone numbers may only contain digits and + ( ) -");
const optionalPhone = z
  .string()
  .trim()
  .max(32)
  .regex(/^[0-9+()\-\s]*$/, "Phone numbers may only contain digits and + ( ) -")
  .optional()
  .default("");
const optionalEmail = z
  .union([z.literal(""), z.email("Please enter a valid email address.")])
  .optional()
  .default("");
const shortText = z.string().trim().max(160).optional().default("");
const message = z.string().trim().max(2000).optional().default("");

/** Attribution captured from the landing visit. Never user-facing. */
export const attributionSchema = z.object({
  sourcePage: z.string().trim().max(300).optional().default(""),
  referrer: z.string().trim().max(300).optional().default(""),
  utmSource: z.string().trim().max(120).optional().default(""),
  utmMedium: z.string().trim().max(120).optional().default(""),
  utmCampaign: z.string().trim().max(180).optional().default(""),
  utmContent: z.string().trim().max(180).optional().default(""),
  utmTerm: z.string().trim().max(180).optional().default(""),
});

/**
 * Anti-spam. `company_website` is a honeypot: it is visually hidden and
 * off the tab order, so only a bot fills it. `startedAt` catches instant
 * submissions.
 */
export const antiSpamSchema = z.object({
  // Accepted by the schema on purpose: the route decides what to do with it,
  // so a bot gets an ordinary success response rather than a validation error
  // that would tell it which control caught it.
  company_website: z.string().max(200).optional().default(""),
  startedAt: z.coerce.number().int().nonnegative().optional().default(0),
});

const base = z.object({ name, phone, whatsapp: optionalPhone, email: optionalEmail, message });

export const generalEnquirySchema = base.extend({
  type: z.literal("general"),
  service: shortText,
  destination: shortText,
});

export const visaEnquirySchema = base.extend({
  type: z.literal("visa"),
  destination: shortText,
  service: shortText,
});

export const tourEnquirySchema = base.extend({
  type: z.literal("tour"),
  destination: shortText,
  service: shortText,
  travelDates: shortText,
  travellers: shortText,
  budget: shortText,
});

export const airTicketEnquirySchema = base.extend({
  type: z.literal("air_ticket"),
  tripType: z.enum(["one_way", "round_trip", "multi_city"]),
  from: z.string().trim().min(2, "Please enter a departure city.").max(120),
  to: z.string().trim().min(2, "Please enter a destination city.").max(120),
  departureDate: shortText,
  returnDate: shortText,
  adults: z.coerce.number().int().min(1).max(20).default(1),
  children: z.coerce.number().int().min(0).max(20).default(0),
  infants: z.coerce.number().int().min(0).max(20).default(0),
  cabinClass: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
});

export const hotelEnquirySchema = base.extend({
  type: z.literal("hotel"),
  destination: z.string().trim().min(2, "Please enter a destination.").max(120),
  checkIn: shortText,
  checkOut: shortText,
  guests: z.coerce.number().int().min(1).max(50).default(1),
  rooms: z.coerce.number().int().min(1).max(20).default(1),
  hotelPreference: shortText,
  budget: shortText,
});

export const b2bEnquirySchema = z.object({
  type: z.literal("b2b"),
  companyName: z.string().trim().min(2, "Please enter your company name.").max(180),
  name,
  phone,
  whatsapp: optionalPhone,
  email: optionalEmail,
  officeAddress: z.string().trim().max(300).optional().default(""),
  website: z.string().trim().max(200).optional().default(""),
  facebookPage: z.string().trim().max(200).optional().default(""),
  yearsInBusiness: shortText,
  interestedServices: z.array(z.string().trim().max(80)).max(10).optional().default([]),
  message,
});

export const enquirySchema = z.discriminatedUnion("type", [
  generalEnquirySchema,
  visaEnquirySchema,
  tourEnquirySchema,
  airTicketEnquirySchema,
  hotelEnquirySchema,
  b2bEnquirySchema,
]);

export const enquirySubmissionSchema = z.intersection(
  enquirySchema,
  attributionSchema.and(antiSpamSchema),
);

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type EnquirySubmission = z.infer<typeof enquirySubmissionSchema>;

export const ENQUIRY_TYPES = [
  { value: "visa", label: "Visa" },
  { value: "tour", label: "Tour" },
  { value: "air_ticket", label: "Air Ticket" },
  { value: "hotel", label: "Hotel" },
  { value: "b2b", label: "B2B" },
  { value: "general", label: "General" },
] as const;

export const ENQUIRY_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow-up" },
  { value: "converted", label: "Converted" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
] as const;

export const TRIP_TYPES = [
  { value: "one_way", label: "One Way" },
  { value: "round_trip", label: "Round Trip" },
  { value: "multi_city", label: "Multi-City" },
] as const;

export const CABIN_CLASSES = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
] as const;

export const B2B_SERVICES = [
  "B2B Visa Processing",
  "Air Ticket Support",
  "Hotel Assistance",
  "Tour Package Support",
  "Custom Travel Solutions",
] as const;
