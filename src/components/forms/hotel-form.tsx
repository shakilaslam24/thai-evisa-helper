"use client";

import { useEnquiryForm } from "./use-enquiry-form";
import { Honeypot, TextAreaField, TextField } from "./fields";
import { FormError, FormSuccess } from "./form-result";
import { structuredWhatsAppMessage, whatsappHref } from "@/lib/whatsapp";

export function HotelForm({ whatsappDigits }: { whatsappDigits: string }) {
  const { state, fieldErrors, submit, reset } = useEnquiryForm("hotel");

  if (state.status === "success") {
    const v = state.values as Record<string, string>;
    return (
      <FormSuccess
        title="Request received."
        message="We'll come back to you with hotel options that fit your dates and budget."
        whatsappHref={whatsappHref(whatsappDigits, {
          kind: "raw",
          message: structuredWhatsAppMessage("I would like help with a hotel booking.", [
            ["Destination", v.destination],
            ["Check-in", v.checkIn],
            ["Check-out", v.checkOut],
            ["Guests", v.guests],
            ["Rooms", v.rooms],
            ["Preference", v.hotelPreference],
            ["Budget", v.budget],
            ["Name", v.name],
          ]),
        })}
        onReset={reset}
        resetLabel="Request more options"
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Honeypot />
      <input type="hidden" name="type" value="hotel" />

      <TextField
        label="Destination"
        name="destination"
        placeholder="e.g. Bangkok"
        className="sm:col-span-2"
        error={fieldErrors.destination}
      />

      <TextField label="Check-in" name="checkIn" type="date" error={fieldErrors.checkIn} />
      <TextField label="Check-out" name="checkOut" type="date" error={fieldErrors.checkOut} />

      <div className="grid grid-cols-2 gap-3 sm:col-span-2">
        <TextField
          label="Guests"
          name="guests"
          type="number"
          min={1}
          max={50}
          defaultValue={2}
          error={fieldErrors.guests}
        />
        <TextField
          label="Rooms"
          name="rooms"
          type="number"
          min={1}
          max={20}
          defaultValue={1}
          error={fieldErrors.rooms}
        />
      </div>

      <TextField
        label="Hotel Preference"
        name="hotelPreference"
        optional
        placeholder="e.g. 4-star, near the city centre"
        error={fieldErrors.hotelPreference}
      />
      <TextField
        label="Approximate Budget"
        name="budget"
        optional
        placeholder="Per night, or for the whole stay"
        error={fieldErrors.budget}
      />

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
        className="sm:col-span-2"
        rows={3}
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
          {state.status === "submitting" ? "Sending…" : "Request Hotel Options"}
        </button>
      </div>
    </form>
  );
}
