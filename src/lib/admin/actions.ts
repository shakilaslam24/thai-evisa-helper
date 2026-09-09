import "server-only";
import { revalidatePath } from "next/cache";
import type { z } from "zod";

/** The shape every admin Server Action returns, so forms can render uniformly. */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /**
   * What the editor actually submitted.
   *
   * A Server Action re-renders the form, and every field is populated from
   * `defaultValue` — which still holds the last SAVED values. Without this, a
   * single validation error silently discards a long form the editor had just
   * filled in. Forms read these back so nothing typed is ever lost.
   */
  values?: Record<string, string>;
};

export const IDLE: ActionState = { status: "idle" };

export function ok(message: string): ActionState {
  return { status: "success", message };
}

export function fail(
  message: string,
  fieldErrors?: Record<string, string>,
  values?: Record<string, string>,
): ActionState {
  return { status: "error", message, fieldErrors, values };
}

/** Flattens FormData into plain strings, so a failed submit can be replayed. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && key !== "password") values[key] = value;
  }
  return values;
}

/** Runs a Zod schema over FormData and maps issues to field-level messages. */
export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { success: true; data: z.infer<T> } | { success: false; state: ActionState } {
  const raw: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    const values = formData
      .getAll(key)
      .filter((value): value is string => typeof value === "string");
    raw[key] = values.length > 1 ? values : values[0];
  }

  const result = schema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return {
    success: false,
    state: fail("Please check the highlighted fields.", fieldErrors, formValues(formData)),
  };
}

/**
 * Public pages are served from the ISR cache. After a content change we purge
 * the affected routes so an edit is visible immediately rather than in five
 * minutes.
 */
export function revalidatePublic(...paths: string[]): void {
  const targets = new Set(["/", "/sitemap.xml", ...paths]);
  for (const path of targets) {
    try {
      revalidatePath(path);
    } catch (error) {
      console.error("[revalidate] failed for", path, error);
    }
  }
}

/** Checkbox values arrive as "on" | undefined. */
export function checkbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "on" || formData.get(name) === "true";
}
