"use client";

import { useId, useState } from "react";
import { IconClose } from "@/components/ui/icons";

/**
 * Repeatable field groups (required documents, FAQs, itinerary days).
 *
 * Rows are held in React state and serialised into one hidden JSON input, so
 * the surrounding Server Action receives them as a single field and the whole
 * record still saves in one transaction.
 */

export type RepeatableField = {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  width?: "full" | "half";
};

export type RepeatableRow = Record<string, string>;

export function Repeatable({
  name,
  legend,
  description,
  fields,
  initial,
  addLabel = "Add row",
  emptyLabel = "No rows yet.",
}: {
  name: string;
  legend: string;
  description?: string;
  fields: RepeatableField[];
  initial: RepeatableRow[];
  addLabel?: string;
  emptyLabel?: string;
}) {
  const baseId = useId();
  const [rows, setRows] = useState<RepeatableRow[]>(initial.length > 0 ? initial : []);

  const blank = (): RepeatableRow =>
    Object.fromEntries(fields.map((field) => [field.key, ""])) as RepeatableRow;

  const update = (index: number, key: string, value: string) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  const move = (index: number, delta: number) =>
    setRows((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      const a = next[index];
      const b = next[target];
      if (!a || !b) return current;
      next[index] = b;
      next[target] = a;
      return next;
    });

  return (
    <fieldset>
      <legend className="field-label">{legend}</legend>
      {description ? <p className="field-hint mb-3">{description}</p> : null}

      {/* One hidden input carries the whole list to the server. */}
      <input type="hidden" name={name} value={JSON.stringify(rows)} />

      {rows.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line-strong px-4 py-6 text-center text-[0.8125rem] text-ink-muted">
          {emptyLabel}
        </p>
      ) : (
        <ol className="space-y-3">
          {rows.map((row, index) => (
            <li key={index} className="rounded-sm border border-line bg-surface-alt p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                  {index + 1}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="btn btn-ghost btn-sm disabled:opacity-30"
                    aria-label={`Move ${legend} row ${index + 1} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === rows.length - 1}
                    className="btn btn-ghost btn-sm disabled:opacity-30"
                    aria-label={`Move ${legend} row ${index + 1} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                    className="btn btn-ghost btn-sm text-[#8c1d18]"
                    aria-label={`Remove ${legend} row ${index + 1}`}
                  >
                    <IconClose width={15} height={15} />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((field) => {
                  const fieldId = `${baseId}-${index}-${field.key}`;
                  const span = field.width === "half" ? "" : "sm:col-span-2";
                  return (
                    <div key={field.key} className={span}>
                      <label
                        htmlFor={fieldId}
                        className="mb-1 block text-[0.75rem] font-medium text-ink-muted"
                      >
                        {field.label}
                      </label>
                      {field.multiline ? (
                        <textarea
                          id={fieldId}
                          rows={3}
                          className="input"
                          placeholder={field.placeholder}
                          value={row[field.key] ?? ""}
                          onChange={(event) => update(index, field.key, event.target.value)}
                        />
                      ) : (
                        <input
                          id={fieldId}
                          type="text"
                          className="input"
                          placeholder={field.placeholder}
                          value={row[field.key] ?? ""}
                          onChange={(event) => update(index, field.key, event.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        onClick={() => setRows((current) => [...current, blank()])}
        className="btn btn-outline btn-sm mt-3"
      >
        {addLabel}
      </button>
    </fieldset>
  );
}
