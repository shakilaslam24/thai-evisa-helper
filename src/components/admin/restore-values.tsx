"use client";

import { useEffect } from "react";
import type { ActionState } from "@/lib/admin/actions";

/**
 * Puts back what the editor typed after a failed save.
 *
 * React 19 resets an uncontrolled form once its action completes, and updating
 * `defaultValue` on an already-mounted input does nothing. So a single
 * validation error would wipe a long visa or tour form that had just been
 * filled in — the most expensive kind of admin bug there is.
 *
 * This writes the submitted values straight back into the form's own controls
 * after an error, leaving successful saves alone.
 */
export function RestoreValues({ state }: { state: ActionState }) {
  const values = state.status === "error" ? state.values : undefined;

  useEffect(() => {
    if (!values) return;
    // The effect runs after React has re-rendered and reset the form.
    const timer = window.setTimeout(() => {
      for (const [name, value] of Object.entries(values)) {
        const field = document.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`);
        if (!field) continue;

        if (field instanceof HTMLInputElement) {
          if (field.type === "checkbox" || field.type === "radio") continue;
          if (field.type === "hidden") continue;
          field.value = value;
        } else if (field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
          field.value = value;
        }
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [values]);

  return null;
}
