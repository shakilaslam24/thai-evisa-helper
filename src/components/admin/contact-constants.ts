/** Client-safe copies of the contact option lists (the settings module is server-only). */
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
