"use client";

import { useSearchParams } from "next/navigation";
import { useEnquiryForm } from "./use-enquiry-form";
import { Honeypot, SelectField, TextAreaField, TextField } from "./fields";
import { FormError, FormSuccess } from "./form-result";
import { whatsappHref, structuredWhatsAppMessage } from "@/lib/whatsapp";

const SERVICES = [
  { value: "", label: "Select a service" },
  { value: "Visa Service", label: "Visa Service" },
  { value: "Tour Package", label: "Tour Package" },
  { value: "Air Ticket", label: "Air Ticket" },
  { value: "Hotel Booking", label: "Hotel Booking" },
  { value: "B2B Partnership", label: "B2B Partnership" },
  { value: "Other", label: "Other" },
] as const;

export function ContactForm({ whatsappDigits }: { whatsappDigits: string }) {
  const params = useSearchParams();
  const { state, fieldErrors, submit, reset } = useEnquiryForm("general");

  if (state.status === "success") {
    const values = state.values as Record<string, string>;
    return (
      <FormSuccess
        title="Thank you — we've received your enquiry."
        message="Our team will contact you shortly. If it's urgent, continue on WhatsApp and we'll pick it up right away."
        whatsappHref={whatsappHref(whatsappDigits, {
          kind: "raw",
          message: structuredWhatsAppMessage("I've just submitted an enquiry on your website.", [
            ["Name", values.name],
            ["Service", values.service],
            ["Destination", values.destination],
          ]),
        })}
        onReset={reset}
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Honeypot />
      <input type="hidden" name="type" value="general" />

      <TextField label="Your Name" name="name" autoComplete="name" error={fieldErrors.name} />
      <TextField
        label="Phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        error={fieldErrors.phone}
      />
      <TextField
        label="WhatsApp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        optional
        hint="Leave blank if it's the same as your phone number."
        error={fieldErrors.whatsapp}
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        optional
        error={fieldErrors.email}
      />
      <SelectField
        label="Service"
        name="service"
        options={SERVICES}
        defaultValue={params.get("service") ?? ""}
        error={fieldErrors.service}
      />
      <TextField
        label="Destination"
        name="destination"
        optional
        placeholder="e.g. Japan"
        defaultValue={params.get("destination") ?? ""}
        error={fieldErrors.destination}
      />

      <TextAreaField
        label="Message"
        name="message"
        className="sm:col-span-2"
        rows={5}
        placeholder="Tell us what you need help with — travel dates, number of travellers, anything useful."
        error={fieldErrors.message}
      />

      {state.status === "error" ? (
        <div className="sm:col-span-2">
          <FormError message={state.message} />
        </div>
      ) : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={state.status === "submitting"}
        >
          {state.status === "submitting" ? "Sending…" : "Send Enquiry"}
        </button>
        <p className="field-hint mt-3">We use your details only to respond to this enquiry.</p>
      </div>
    </form>
  );
}
