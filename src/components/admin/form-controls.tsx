"use client";

import { useFormStatus } from "react-dom";
import { useId, type ReactNode } from "react";

/**
 * Admin form controls.
 *
 * Deliberately plain: labels, real inputs, real validation messages. Content
 * editing should feel like filling in a form, not driving an app.
 */

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
};

function Wrapper({
  label,
  error,
  hint,
  required,
  className = "",
  id,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {required ? <span className="text-gold-500"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="field-hint">{hint}</p> : null}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  type = "text",
  defaultValue,
  placeholder,
  ...field
}: FieldProps & { type?: string; defaultValue?: string | number | null; placeholder?: string }) {
  const id = useId();
  return (
    <Wrapper {...field} id={id}>
      <input
        id={id}
        name={field.name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={field.required}
        className="input"
        aria-invalid={field.error ? "true" : undefined}
      />
    </Wrapper>
  );
}

export function Textarea({
  defaultValue,
  rows = 4,
  placeholder,
  ...field
}: FieldProps & { defaultValue?: string | null; rows?: number; placeholder?: string }) {
  const id = useId();
  return (
    <Wrapper {...field} id={id}>
      <textarea
        id={id}
        name={field.name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={field.required}
        className="input"
        aria-invalid={field.error ? "true" : undefined}
      />
    </Wrapper>
  );
}

export function Select({
  options,
  defaultValue,
  onChange,
  ...field
}: FieldProps & {
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string | null;
  /** Optional, for the few forms whose layout depends on the choice. */
  onChange?: (value: string) => void;
}) {
  const id = useId();
  return (
    <Wrapper {...field} id={id}>
      <select
        id={id}
        name={field.name}
        defaultValue={defaultValue ?? ""}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="input"
        aria-invalid={field.error ? "true" : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

export function Toggle({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#101f40]"
      />
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-[0.875rem] font-medium text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-[0.8125rem] text-ink-muted">{hint}</span> : null}
      </label>
    </div>
  );
}

export function CheckboxSet({
  legend,
  name,
  options,
  selected,
  hint,
}: {
  legend: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: string[];
  hint?: string;
}) {
  return (
    <fieldset>
      <legend className="field-label">{legend}</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded-sm border border-line px-3 py-2 text-[0.875rem] transition-colors hover:border-line-gold has-checked:border-gold-400 has-checked:bg-gold-50"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.includes(option.value)}
              className="h-4 w-4 accent-[#101f40]"
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint ? <p className="field-hint">{hint}</p> : null}
    </fieldset>
  );
}

export function SubmitButton({
  children = "Save changes",
  className = "btn btn-primary",
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export function ActionButton({
  children,
  className = "btn btn-outline btn-sm",
  confirm,
}: {
  children: ReactNode;
  className?: string;
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={
        confirm
          ? (event) => {
              if (!window.confirm(confirm)) event.preventDefault();
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

export function FormMessage({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message?: string;
}) {
  if (status === "idle" || !message) return null;
  const isError = status === "error";
  return (
    <p
      role="status"
      aria-live="polite"
      className={`rounded-sm border px-4 py-3 text-[0.875rem] ${
        isError
          ? "border-[#b3261e]/30 bg-[#b3261e]/[0.06] text-[#8c1d18]"
          : "border-[#0f6b3f]/25 bg-[#0f6b3f]/[0.06] text-[#0b5230]"
      }`}
    >
      {message}
    </p>
  );
}

/** A two-column grid used consistently across every admin form. */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

export function FullWidth({ children }: { children: ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}
