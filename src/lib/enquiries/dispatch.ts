import "server-only";
import { db } from "@/lib/db";
import type { EnquirySubmission } from "@/lib/validation/enquiry";

/**
 * The enquiry service layer.
 *
 * IMPORTANT — CRM boundary (brief §0 and §32):
 * This website is standalone. It does not read from, write to, authenticate
 * against, or import anything from the DreamFly CRM.
 *
 * `dispatchEnquiry` is the single seam where a future, opt-in CRM handoff would
 * live. Adding it later means implementing one function here and reading the
 * reserved `external*` columns on Enquiry — no page, form or component changes.
 * Nothing dispatches today.
 */

type CommonFields = {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  service: string;
  destination: string;
  message: string;
};

/**
 * Projects a validated submission onto the common enquiry columns plus a
 * type-specific JSON payload.
 */
function project(input: EnquirySubmission): CommonFields & { payload: Record<string, unknown> } {
  const shared = {
    name: input.name,
    phone: input.phone,
    whatsapp: input.whatsapp ?? "",
    email: input.email ?? "",
    message: input.message ?? "",
  };

  switch (input.type) {
    case "air_ticket":
      return {
        ...shared,
        service: "Air Ticket",
        destination: `${input.from} → ${input.to}`,
        payload: {
          tripType: input.tripType,
          from: input.from,
          to: input.to,
          departureDate: input.departureDate,
          returnDate: input.returnDate,
          adults: input.adults,
          children: input.children,
          infants: input.infants,
          cabinClass: input.cabinClass,
        },
      };
    case "hotel":
      return {
        ...shared,
        service: "Hotel Booking",
        destination: input.destination,
        payload: {
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          guests: input.guests,
          rooms: input.rooms,
          hotelPreference: input.hotelPreference,
          budget: input.budget,
        },
      };
    case "b2b":
      return {
        ...shared,
        service: "B2B Partnership",
        destination: "",
        payload: {
          companyName: input.companyName,
          officeAddress: input.officeAddress,
          website: input.website,
          facebookPage: input.facebookPage,
          yearsInBusiness: input.yearsInBusiness,
          interestedServices: input.interestedServices,
        },
      };
    case "tour":
      return {
        ...shared,
        service: input.service || "Tour Package",
        destination: input.destination ?? "",
        payload: {
          travelDates: input.travelDates,
          travellers: input.travellers,
          budget: input.budget,
        },
      };
    case "visa":
      return {
        ...shared,
        service: input.service || "Visa Service",
        destination: input.destination ?? "",
        payload: {},
      };
    case "general":
    default:
      return {
        ...shared,
        service: input.service ?? "",
        destination: input.destination ?? "",
        payload: {},
      };
  }
}

export async function createEnquiry(input: EnquirySubmission): Promise<{ id: string }> {
  const { payload, ...common } = project(input);

  const enquiry = await db.enquiry.create({
    data: {
      type: input.type,
      ...common,
      payloadJson: JSON.stringify(payload),
      sourcePage: input.sourcePage ?? "",
      referrer: input.referrer ?? "",
      utmSource: input.utmSource ?? "",
      utmMedium: input.utmMedium ?? "",
      utmCampaign: input.utmCampaign ?? "",
      utmContent: input.utmContent ?? "",
      utmTerm: input.utmTerm ?? "",
    },
    select: { id: true },
  });

  await dispatchEnquiry(enquiry.id);
  return enquiry;
}

/**
 * Reserved integration point. Intentionally a no-op.
 *
 * A future implementation would POST the enquiry to a signed CRM webhook and
 * record the result in `externalId` / `externalState` / `externalSyncedAt`.
 * Failures must never block the visitor's submission, so this is called after
 * the row is committed and swallows its own errors.
 */
export async function dispatchEnquiry(_enquiryId: string): Promise<void> {
  // No CRM integration in this release — see docs/ARCHITECTURE.md § CRM boundary.
  return;
}

/** Parses the stored payload defensively; corrupt JSON must not break admin. */
export function readPayload(payloadJson: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(payloadJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
