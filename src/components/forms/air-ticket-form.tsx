"use client";

import { useState } from "react";
import { useEnquiryForm } from "./use-enquiry-form";
import { Honeypot, SelectField, TextAreaField, TextField } from "./fields";
import { FormError, FormSuccess } from "./form-result";
import { CABIN_CLASSES, TRIP_TYPES } from "@/lib/validation/enquiry";
import { structuredWhatsAppMessage, whatsappHref } from "@/lib/whatsapp";
import { labelFor } from "@/lib/list";

/**
 * Assisted airfare quotation.
 *
 * Deliberately NOT a booking engine: DreamFly quotes fares by hand, so showing
 * fabricated live availability would be dishonest (brief §8). The form captures
 * exactly what a consultant needs to price the trip.
 */
export function AirTicketForm({ whatsappDigits }: { whatsappDigits: string }) {
  const { state, fieldErrors, submit, reset } = useEnquiryForm("air_ticket");
  const [tripType, setTripType] = useState<string>("round_trip");

  if (state.status === "success") {
    const v = state.values as Record<string, string>;
    return (
      <FormSuccess
        title="Request received — we're on it."
        message="One of our consultants will come back to you with fare options. Continue on WhatsApp to speed things up."
        whatsappHref={whatsappHref(whatsappDigits, {
          kind: "raw",
          message: structuredWhatsAppMessage("I would like an airfare quotation.", [
            ["Route", `${v.from} → ${v.to}`],
            ["Trip", labelFor(TRIP_TYPES, v.tripType ?? "")],
            ["Departure", v.departureDate],
            ["Return", v.returnDate],
            ["Passengers", `${v.adults} adult(s), ${v.children} child, ${v.infants} infant`],
            ["Cabin", labelFor(CABIN_CLASSES, v.cabinClass ?? "")],
            ["Name", v.name],
          ]),
        })}
        onReset={reset}
        resetLabel="Request another quotation"
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Honeypot />
      <input type="hidden" name="type" value="air_ticket" />

      <SelectField
        label="Trip Type"
        name="tripType"
        options={TRIP_TYPES}
        defaultValue="round_trip"
        onChange={setTripType}
        error={fieldErrors.tripType}
        className="sm:col-span-2"
      />

      <TextField label="From" name="from" placeholder="e.g. Dhaka" error={fieldErrors.from} />
      <TextField label="To" name="to" placeholder="e.g. Bangkok" error={fieldErrors.to} />

      <TextField
        label="Departure Date"
        name="departureDate"
        type="date"
        error={fieldErrors.departureDate}
      />
      <TextField
        label="Return Date"
        name="returnDate"
        type="date"
        optional
        hint="Not needed for a one-way trip."
        error={fieldErrors.returnDate}
      />

      <div className="grid grid-cols-3 gap-3 sm:col-span-2">
        <TextField
          label="Adults"
          name="adults"
          type="number"
          min={1}
          max={20}
          defaultValue={1}
          error={fieldErrors.adults}
        />
        <TextField
          label="Children"
          name="children"
          type="number"
          min={0}
          max={20}
          defaultValue={0}
          error={fieldErrors.children}
        />
        <TextField
          label="Infants"
          name="infants"
          type="number"
          min={0}
          max={20}
          defaultValue={0}
          error={fieldErrors.infants}
        />
      </div>

      <SelectField
        label="Cabin Class"
        name="cabinClass"
        options={CABIN_CLASSES}
        defaultValue="economy"
        error={fieldErrors.cabinClass}
        className="sm:col-span-2"
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
        label="Note"
        name="message"
        optional
        className="sm:col-span-2"
        rows={3}
        placeholder="Preferred airline, flexible dates, baggage needs…"
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
          {state.status === "submitting" ? "Sending…" : "Request Airfare"}
        </button>
      </div>
    </form>
  );
}
