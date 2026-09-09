"use client";

import { useEnquiryForm } from "./use-enquiry-form";
import { Honeypot, TextAreaField, TextField } from "./fields";
import { FormError, FormSuccess } from "./form-result";
import { structuredWhatsAppMessage, whatsappHref } from "@/lib/whatsapp";

/**
 * Compact enquiry form used on visa and tour detail pages, where the visitor
 * has already chosen what they want — so the service and destination are fixed
 * and only the contact details are asked for.
 */
export function QuickEnquiryForm({
  type,
  service,
  destination,
  whatsappDigits,
  submitLabel,
  messagePlaceholder,
}: {
  type: "visa" | "tour";
  service: string;
  destination: string;
  whatsappDigits: string;
  submitLabel: string;
  messagePlaceholder?: string;
}) {
  const { state, fieldErrors, submit, reset } = useEnquiryForm(type);

  if (state.status === "success") {
    const v = state.values as Record<string, string>;
    return (
      <FormSuccess
        title="Enquiry received."
        message="Our team will contact you shortly with the next steps."
        whatsappHref={whatsappHref(whatsappDigits, {
          kind: "raw",
          message: structuredWhatsAppMessage("I've just submitted an enquiry on your website.", [
            ["Interested in", destination || service],
            ["Name", v.name],
            ["Phone", v.phone],
          ]),
        })}
        onReset={reset}
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <Honeypot />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="service" value={service} />
      <input type="hidden" name="destination" value={destination} />

      <TextField label="Your Name" name="name" autoComplete="name" error={fieldErrors.name} />
      <TextField
        label="Phone / WhatsApp"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        error={fieldErrors.phone}
      />
      <TextAreaField
        label="Message"
        name="message"
        optional
        rows={3}
        placeholder={messagePlaceholder}
        error={fieldErrors.message}
      />

      {state.status === "error" ? <FormError message={state.message} /> : null}

      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={state.status === "submitting"}
      >
        {state.status === "submitting" ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
