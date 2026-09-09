"use client";

import { useId, type ReactNode } from "react";

/**
 * Form primitives.
 *
 * Every control is wired to a real <label>, exposes its error through
 * aria-describedby + aria-invalid, and inherits the `.input` token styling —
 * so accessibility and visual consistency come for free at every call site.
 */

type BaseProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
};

function FieldShell({
  label,
  error,
  hint,
  optional,
  className = "",
  children,
  id,
}: BaseProps & { children: (ids: { id: string; describedBy?: string }) => ReactNode; id: string }) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional ? <span className="optional"> (optional)</span> : null}
      </label>
      {children({ id, describedBy })}
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  type = "text",
  placeholder,
  defaultValue,
  autoComplete,
  inputMode,
  min,
  max,
  ...base
}: BaseProps & {
  type?: string;
  placeholder?: string;
  defaultValue?: string | number;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <FieldShell {...base} id={id}>
      {({ id: fieldId, describedBy }) => (
        <input
          id={fieldId}
          name={base.name}
          type={type}
          className="input"
          placeholder={placeholder}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          inputMode={inputMode}
          min={min}
          max={max}
          aria-invalid={base.error ? "true" : undefined}
          aria-describedby={describedBy}
        />
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  placeholder,
  rows = 4,
  defaultValue,
  ...base
}: BaseProps & { placeholder?: string; rows?: number; defaultValue?: string }) {
  const id = useId();
  return (
    <FieldShell {...base} id={id}>
      {({ id: fieldId, describedBy }) => (
        <textarea
          id={fieldId}
          name={base.name}
          rows={rows}
          className="input"
          placeholder={placeholder}
          defaultValue={defaultValue}
          aria-invalid={base.error ? "true" : undefined}
          aria-describedby={describedBy}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  options,
  defaultValue,
  onChange,
  ...base
}: BaseProps & {
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const id = useId();
  return (
    <FieldShell {...base} id={id}>
      {({ id: fieldId, describedBy }) => (
        <select
          id={fieldId}
          name={base.name}
          className="input"
          defaultValue={defaultValue}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          aria-invalid={base.error ? "true" : undefined}
          aria-describedby={describedBy}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

export function CheckboxGroup({
  legend,
  name,
  options,
}: {
  legend: string;
  name: string;
  options: readonly string[];
}) {
  return (
    <fieldset>
      <legend className="field-label">{legend}</legend>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-2.5 rounded-sm border border-line px-3 py-2.5 text-[0.875rem] transition-colors hover:border-line-gold has-checked:border-gold-400 has-checked:bg-gold-50"
          >
            <input
              type="checkbox"
              name={name}
              value={option}
              data-group="true"
              className="h-4 w-4 shrink-0 accent-[#101f40]"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Hidden from people, visible to bots. Paired with a submit-timing check on the
 * server so no CAPTCHA (and no third-party script) is needed.
 */
export function Honeypot() {
  return (
    <div className="honeypot" aria-hidden="true">
      <label htmlFor="company_website">Company website — leave this empty</label>
      <input
        id="company_website"
        name="company_website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
