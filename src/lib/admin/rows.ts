// No `server-only` guard: this module is pure parsing with a unit test.
import { z } from "zod";

/**
 * Decodes the JSON payload produced by the <Repeatable> control.
 * Always returns a clean array: bad input yields no rows rather than an error,
 * so a malformed field can never lose the rest of a record.
 */
export function parseRows<T extends z.ZodType>(raw: unknown, schema: T): Array<z.infer<T>> {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const rows: Array<z.infer<T>> = [];
  for (const entry of parsed.slice(0, 200)) {
    const result = schema.safeParse(entry);
    if (result.success) rows.push(result.data);
  }
  return rows;
}

const trimmed = (max: number) => z.string().trim().max(max).optional().default("");

export const documentRowSchema = z
  .object({ label: z.string().trim().min(1).max(300), note: trimmed(500) })
  .transform((row) => ({ label: row.label, note: row.note }));

export const faqRowSchema = z
  .object({
    question: z.string().trim().min(1).max(400),
    answer: z.string().trim().min(1).max(4000),
  })
  .transform((row) => ({ question: row.question, answer: row.answer }));

export const itineraryRowSchema = z
  .object({
    dayLabel: z.string().trim().min(1).max(60),
    title: z.string().trim().min(1).max(200),
    body: trimmed(2000),
  })
  .transform((row) => ({ dayLabel: row.dayLabel, title: row.title, body: row.body }));

/** Splits a one-item-per-line textarea into a clean list. */
export function parseLines(raw: unknown, max = 100): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, max);
}
