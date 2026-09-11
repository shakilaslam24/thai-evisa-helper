/**
 * Comma-separated list columns.
 *
 * The schema stores small tag lists as delimited strings so the same models run
 * on SQLite and PostgreSQL without native array types.
 */
export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serialiseList(values: readonly string[]): string {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).join(",");
}

export const VISA_CATEGORIES = [
  { value: "tourist", label: "Tourist" },
  { value: "business", label: "Business" },
  { value: "visit", label: "Visit" },
  { value: "other", label: "Other" },
] as const;

export const VISA_FORMATS = [
  { value: "sticker", label: "Sticker Visa" },
  { value: "evisa", label: "E-Visa" },
  { value: "other", label: "Other" },
] as const;

export const ENTRY_TYPES = [
  { value: "single", label: "Single Entry" },
  { value: "multiple", label: "Multiple Entry" },
  { value: "both", label: "Single & Multiple" },
] as const;

export const PACKAGE_TYPES = [
  { value: "group", label: "Group" },
  { value: "private", label: "Private" },
  { value: "custom", label: "Custom" },
] as const;

export const AVAILABILITY = [
  { value: "available", label: "Available" },
  { value: "upcoming", label: "Upcoming" },
  { value: "sold_out", label: "Sold Out" },
] as const;

export const CONTENT_STATUS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function labelsFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  csv: string | null | undefined,
): string[] {
  return parseList(csv).map((value) => labelFor(options, value));
}
