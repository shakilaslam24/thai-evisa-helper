"use client";

import { IconCheck, IconWhatsApp } from "@/components/ui/icons";

/**
 * Post-submission panel.
 *
 * The enquiry is already saved in the website's own Admin at this point. The
 * WhatsApp handoff is offered as a convenience — it carries a structured
 * summary so the team sees the request in the same message.
 */
export function FormSuccess({
  title,
  message,
  whatsappHref,
  onReset,
  resetLabel = "Send another enquiry",
}: {
  title: string;
  message: string;
  whatsappHref: string | null;
  onReset: () => void;
  resetLabel?: string;
}) {
  return (
    <div
      className="rounded-md border border-line-gold bg-gold-50 p-7 text-center sm:p-9"
      role="status"
      aria-live="polite"
    >
      <span
        className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-white"
        aria-hidden="true"
      >
        <IconCheck width={20} height={20} />
      </span>

      <h3 className="mt-5 font-display text-h3 font-semibold">{title}</h3>
      <p className="mx-auto mt-2.5 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
        {message}
      </p>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary w-full sm:w-auto"
          >
            <IconWhatsApp width={17} height={17} />
            Continue on WhatsApp
          </a>
        ) : null}
        <button type="button" onClick={onReset} className="btn btn-outline w-full sm:w-auto">
          {resetLabel}
        </button>
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <p
      className="rounded-sm border border-[#b3261e]/30 bg-[#b3261e]/[0.06] px-4 py-3 text-[0.875rem] text-[#8c1d18]"
      role="alert"
    >
      {message}
    </p>
  );
}
