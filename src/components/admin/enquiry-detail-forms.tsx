"use client";

import { useActionState } from "react";
import {
  addEnquiryNoteAction,
  updateEnquiryStatusAction,
} from "@/app/admin/(dashboard)/enquiries/actions";
import { FormMessage, SubmitButton } from "./form-controls";
import { IDLE_STATE } from "./action-state";
import { ENQUIRY_STATUSES } from "@/lib/validation/enquiry";

export function EnquiryStatusForm({ enquiryId, status }: { enquiryId: string; status: string }) {
  const [state, action] = useActionState(updateEnquiryStatusAction, IDLE_STATE);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={enquiryId} />
      <div>
        <label htmlFor="enquiry-status" className="field-label">
          Current status
        </label>
        <select id="enquiry-status" name="status" defaultValue={status} className="input">
          {ENQUIRY_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="field-hint">Choosing “Archived” also removes it from the active inbox.</p>
      </div>
      <FormMessage status={state.status} message={state.message} />
      <SubmitButton className="btn btn-primary btn-block">Update status</SubmitButton>
    </form>
  );
}

export function EnquiryNoteForm({ enquiryId }: { enquiryId: string }) {
  const [state, action] = useActionState(addEnquiryNoteAction, IDLE_STATE);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="enquiryId" value={enquiryId} />
      <div>
        <label htmlFor="note-body" className="sr-only">
          Note
        </label>
        <textarea
          id="note-body"
          name="body"
          rows={3}
          required
          maxLength={2000}
          className="input"
          placeholder="What happened on this enquiry? e.g. Called, sent fee breakdown, waiting on documents."
        />
      </div>
      <FormMessage status={state.status} message={state.message} />
      <div>
        <SubmitButton className="btn btn-outline btn-sm">Add note</SubmitButton>
      </div>
    </form>
  );
}
