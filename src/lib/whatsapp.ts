/**
 * The single source of truth for WhatsApp links.
 *
 * The number always comes from Global Settings — it is never written into a
 * component. Message text is contextual: a visa page pre-fills the country, a
 * tour page pre-fills the package name (brief §17).
 */

export type WhatsAppContext =
  | { kind: "general" }
  | { kind: "visa"; country: string; custom?: string }
  | { kind: "tour"; packageName: string; custom?: string }
  | { kind: "air_ticket" }
  | { kind: "hotel" }
  | { kind: "b2b" }
  | { kind: "custom_tour" }
  | { kind: "raw"; message: string };

export function whatsappMessage(context: WhatsAppContext): string {
  switch (context.kind) {
    case "visa":
      return (
        context.custom?.trim() ||
        `Hello DreamFly, I would like to know more about your ${context.country} visa service.`
      );
    case "tour":
      return context.custom?.trim() || `Hello DreamFly, I'm interested in ${context.packageName}.`;
    case "air_ticket":
      return "Hello DreamFly, I would like an airfare quotation.";
    case "hotel":
      return "Hello DreamFly, I would like help with a hotel booking.";
    case "b2b":
      return "Hello DreamFly, I'm interested in becoming a B2B partner.";
    case "custom_tour":
      return "Hello DreamFly, I would like to plan a custom tour package.";
    case "raw":
      return context.message;
    case "general":
    default:
      return "Hello DreamFly, I would like to know more about your services.";
  }
}

/**
 * Builds a wa.me link. Returns null when no number is configured, so callers
 * can hide the control rather than render a broken link.
 */
export function whatsappHref(
  numberDigits: string,
  context: WhatsAppContext = { kind: "general" },
): string | null {
  const digits = numberDigits.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(whatsappMessage(context))}`;
}

/** Structured enquiry summary used after a quotation form is submitted. */
export function structuredWhatsAppMessage(
  title: string,
  lines: Array<[label: string, value: string | undefined | null]>,
): string {
  const body = lines
    .filter((entry): entry is [string, string] => Boolean(entry[1] && String(entry[1]).trim()))
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
  return `Hello DreamFly,\n${title}\n\n${body}`;
}
