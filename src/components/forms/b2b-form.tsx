"use client";

import { useEnquiryForm } from "./use-enquiry-form";
import { CheckboxGroup, Honeypot, TextAreaField, TextField } from "./fields";
import { FormError, FormSuccess } from "./form-result";
import { B2B_SERVICES } from "@/lib/validation/enquiry";
import { whatsappHref } from "@/lib/whatsapp";

/**
 * B2B partner application.
 *
 * Submissions go ONLY to the website's own Admin (brief §10). There is no CRM
 * integration in this release.
 */
export function B2bForm({ whatsappDigits }: { whatsappDigits: string }) {
  const { state, fieldErrors, submit, reset } = useEnquiryForm("b2b");

  if (state.status === "success") {
    return (
      <FormSuccess
        title="Application received."
        message="Thank you for your interest in partnering with DreamFly. Our B2B team will review your details and get in touch."
        whatsappHref={whatsappHref(whatsappDigits, { kind: "b2b" })}
        onReset={reset}
        resetLabel="Submit another application"
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Honeypot />
      <input type="hidden" name="type" value="b2b" />

      <TextField
        label="Company Name"
        name="companyName"
        className="sm:col-span-2"
        autoComplete="organization"
        error={fieldErrors.companyName}
      />

      <TextField label="Contact Person" name="name" autoComplete="name" error={fieldErrors.name} />
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

      <TextField
        label="Office Address"
        name="officeAddress"
        className="sm:col-span-2"
        optional
        error={fieldErrors.officeAddress}
      />

      <TextField
        label="Website"
        name="website"
        optional
        placeholder="https://"
        error={fieldErrors.website}
      />
      <TextField
        label="Facebook Page"
        name="facebookPage"
        optional
        placeholder="https://"
        error={fieldErrors.facebookPage}
      />

      <TextField
        label="Years in Business"
        name="yearsInBusiness"
        optional
        className="sm:col-span-2"
        error={fieldErrors.yearsInBusiness}
      />

      <div className="sm:col-span-2">
        <CheckboxGroup
          legend="Interested Services"
          name="interestedServices"
          options={B2B_SERVICES}
        />
      </div>

      <TextAreaField
        label="Message"
        name="message"
        optional
        className="sm:col-span-2"
        rows={4}
        placeholder="Tell us about your agency and the volume you handle."
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
          {state.status === "submitting" ? "Sending…" : "Become a DreamFly B2B Partner"}
        </button>
      </div>
    </form>
  );
}
