"use client";

import { useEffect, useRef } from "react";

/**
 * Warns before leaving a form with unsaved edits.
 *
 * Content editors work in long forms; losing a half-written visa page to a
 * stray back button is the kind of thing that erodes trust in an admin panel.
 *
 * Attaches to the nearest enclosing <form>, watches for real input, and clears
 * itself on submit. Browsers show their own wording for `beforeunload`, so no
 * custom message is passed.
 */
export function UnsavedGuard() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;

    let dirty = false;
    const markDirty = () => {
      dirty = true;
    };
    const clearDirty = () => {
      dirty = false;
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      // Required by older browsers to trigger the prompt at all.
      event.returnValue = "";
    };

    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    form.addEventListener("submit", clearDirty);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
      form.removeEventListener("submit", clearDirty);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  return <span ref={anchor} className="hidden" aria-hidden="true" />;
}
