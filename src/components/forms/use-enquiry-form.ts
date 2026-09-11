"use client";

import { useCallback, useRef, useState } from "react";
import { readAttribution } from "@/lib/attribution";

export type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; values: Record<string, unknown> }
  | { status: "error"; message: string };

type Options = {
  /** Called after a successful save, e.g. to fire an analytics event. */
  onSuccess?: (values: Record<string, unknown>) => void;
};

/**
 * Shared submit behaviour for every public form.
 *
 * Handles: attribution, the honeypot timestamp, JSON posting, field-level error
 * mapping, and the success state. Individual forms only describe their fields.
 */
export function useEnquiryForm(type: string, options: Options = {}) {
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const startedAt = useRef<number>(Date.now());

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (state.status === "submitting") return;

      const form = event.currentTarget;
      const formData = new FormData(form);

      const values: Record<string, unknown> = {};
      for (const [key, value] of formData.entries()) {
        if (typeof value !== "string") continue;
        // Repeated names (checkbox groups) collect into an array.
        const existing = values[key];
        if (existing === undefined) values[key] = value;
        else if (Array.isArray(existing)) existing.push(value);
        else values[key] = [existing, value];
      }

      // The form's own `type` is authoritative; a hidden input of the same
      // name must not turn it into an array.
      values.type = type;

      // Checkbox groups must stay arrays even with a single selection.
      for (const name of form.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"][data-group]',
      )) {
        const key = name.name;
        if (values[key] !== undefined && !Array.isArray(values[key])) values[key] = [values[key]];
        if (values[key] === undefined) values[key] = [];
      }

      const payload = { ...values, ...readAttribution(), startedAt: startedAt.current };

      setState({ status: "submitting" });
      setFieldErrors({});

      try {
        const response = await fetch("/api/enquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result: {
          ok: boolean;
          error?: string;
          fieldErrors?: Record<string, string>;
        } = await response.json();

        if (!response.ok || !result.ok) {
          setFieldErrors(result.fieldErrors ?? {});
          setState({
            status: "error",
            message: result.error ?? "Something went wrong. Please try again.",
          });
          return;
        }

        form.reset();
        startedAt.current = Date.now();
        setState({ status: "success", values });
        options.onSuccess?.(values);
      } catch {
        setState({
          status: "error",
          message:
            "We couldn't reach the server. Please check your connection, or contact us on WhatsApp.",
        });
      }
    },
    [options, state.status, type],
  );

  const reset = useCallback(() => {
    setState({ status: "idle" });
    setFieldErrors({});
    startedAt.current = Date.now();
  }, []);

  return { state, fieldErrors, submit, reset };
}
