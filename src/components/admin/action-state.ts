import type { ActionState } from "@/lib/admin/actions";

/** Shared initial state for every `useActionState` call in the admin panel. */
export const IDLE_STATE: ActionState = { status: "idle" };
export type { ActionState };
