import type { ActionState } from "@/lib/admin/actions";

/**
 * Reads back what the editor submitted after a failed save.
 *
 * Server Actions re-render the form from `defaultValue`, which still holds the
 * last saved data — so without this a validation error wipes out everything
 * just typed. `field("slug", visa.slug)` returns the submitted value when there
 * is one, and the saved value otherwise.
 */
export function replayed(state: ActionState) {
  return function field<T extends string | number | boolean | null | undefined>(
    name: string,
    saved: T,
  ): T | string {
    const submitted = state.values?.[name];
    return submitted === undefined ? saved : submitted;
  };
}
