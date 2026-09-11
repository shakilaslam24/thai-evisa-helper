"use client";

import { useActionState, useState } from "react";
import {
  deleteContactEmailAction,
  deleteContactNumberAction,
  deleteOfficeHourAction,
  moveContactNumberAction,
  saveContactEmailAction,
  saveContactNumberAction,
  saveOfficeHourAction,
} from "@/app/admin/(dashboard)/settings/contact-actions";
import {
  ActionButton,
  FieldGrid,
  FormMessage,
  FullWidth,
  Input,
  Select,
  SubmitButton,
  Toggle,
} from "./form-controls";
import { Panel, StatusBadge } from "./ui";
import { IDLE_STATE } from "./action-state";
import { PHONE_LABELS } from "./contact-constants";

export type NumberRow = {
  id: string;
  label: string;
  customLabel: string;
  number: string;
  whatsappNumber: string;
  whatsappEnabled: boolean;
  isPrimary: boolean;
  isPrimaryWhatsapp: boolean;
  showInHeader: boolean;
  showInFooter: boolean;
  showOnContact: boolean;
  showInMobileBar: boolean;
  sortOrder: number;
};

export type EmailRow = {
  id: string;
  label: string;
  address: string;
  isPrimary: boolean;
  showInFooter: boolean;
  showOnContact: boolean;
  sortOrder: number;
};

export type HourRow = {
  id: string;
  label: string;
  value: string;
  note: string;
  published: boolean;
  sortOrder: number;
};

/**
 * Contact channels.
 *
 * Phone numbers, emails and opening hours are rows rather than fixed fields, so
 * adding a hotline or a B2B line is an admin task, never a code change.
 */
export function ContactChannels({
  numbers,
  emails,
  hours,
}: {
  numbers: NumberRow[];
  emails: EmailRow[];
  hours: HourRow[];
}) {
  return (
    <div className="grid gap-6" id="contact">
      <NumbersPanel numbers={numbers} />
      <EmailsPanel emails={emails} />
      <HoursPanel hours={hours} />
    </div>
  );
}

/* ------------------------------------------------------------------ phones */

const BLANK_NUMBER: NumberRow = {
  id: "",
  label: "Main Office",
  customLabel: "",
  number: "",
  whatsappNumber: "",
  whatsappEnabled: false,
  isPrimary: false,
  isPrimaryWhatsapp: false,
  showInHeader: false,
  showInFooter: true,
  showOnContact: true,
  showInMobileBar: false,
  sortOrder: 0,
};

function NumbersPanel({ numbers }: { numbers: NumberRow[] }) {
  const [editing, setEditing] = useState<NumberRow | null>(null);
  const [adding, setAdding] = useState(false);
  const current = editing ?? { ...BLANK_NUMBER, sortOrder: numbers.length };
  const noPrimary = numbers.length > 0 && !numbers.some((n) => n.isPrimary);
  const noWhatsapp = numbers.length > 0 && !numbers.some((n) => n.whatsappEnabled);

  return (
    <Panel
      title="Phone numbers"
      description="Add as many as you need. Choose where each one appears and which is the main WhatsApp line."
    >
      {noPrimary || noWhatsapp ? (
        <p className="mb-4 rounded-sm border border-line-gold bg-gold-50 px-4 py-3 text-[0.8125rem] text-ink-muted">
          {noPrimary
            ? "No number is marked as the main one — the first in the list will be used. "
            : ""}
          {noWhatsapp
            ? "No number has WhatsApp switched on, so every WhatsApp button on the site is hidden."
            : ""}
        </p>
      ) : null}

      {numbers.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line-strong px-4 py-6 text-center text-[0.875rem] text-ink-muted">
          No numbers yet. Add your main office line below.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {numbers.map((entry, index) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[1rem] font-semibold text-ink">
                    {entry.number}
                  </span>
                  {entry.isPrimary ? <StatusBadge value="new" label="Main" /> : null}
                  {entry.isPrimaryWhatsapp ? (
                    <StatusBadge value="published" label="Main WhatsApp" />
                  ) : null}
                </p>
                <p className="mt-0.5 text-[0.75rem] text-ink-subtle">
                  {entry.label === "Other" && entry.customLabel ? entry.customLabel : entry.label}
                  {" · shows on "}
                  {[
                    entry.showInHeader && "header",
                    entry.showInFooter && "footer",
                    entry.showOnContact && "contact",
                    entry.showInMobileBar && "mobile bar",
                  ]
                    .filter(Boolean)
                    .join(", ") || "nowhere"}
                </p>
              </div>

              <div className="flex shrink-0 gap-1">
                <form action={moveContactNumberAction}>
                  <input type="hidden" name="id" value={entry.id} />
                  <input type="hidden" name="direction" value="up" />
                  <ActionButton className="btn btn-ghost btn-sm disabled:opacity-30">
                    ↑
                  </ActionButton>
                </form>
                <form action={moveContactNumberAction}>
                  <input type="hidden" name="id" value={entry.id} />
                  <input type="hidden" name="direction" value="down" />
                  <ActionButton className="btn btn-ghost btn-sm disabled:opacity-30">
                    ↓
                  </ActionButton>
                </form>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(entry);
                    setAdding(false);
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Edit
                </button>
                <form action={deleteContactNumberAction}>
                  <input type="hidden" name="id" value={entry.id} />
                  <ActionButton
                    className="btn btn-ghost btn-sm text-[#8c1d18]"
                    confirm={`Remove ${entry.number}? It will disappear from the website.`}
                  >
                    Remove
                  </ActionButton>
                </form>
              </div>
              <span className="sr-only">Position {index + 1}</span>
            </li>
          ))}
        </ul>
      )}

      {editing || adding || numbers.length === 0 ? (
        <NumberForm
          key={current.id || "new"}
          entry={current}
          isNew={!editing}
          onDone={() => {
            setEditing(null);
            setAdding(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="btn btn-outline btn-sm mt-5"
        >
          + Add number
        </button>
      )}
    </Panel>
  );
}

function NumberForm({
  entry,
  isNew,
  onDone,
}: {
  entry: NumberRow;
  isNew: boolean;
  onDone: () => void;
}) {
  const [state, action] = useActionState(saveContactNumberAction, IDLE_STATE);
  const [label, setLabel] = useState(entry.label);
  const [whatsapp, setWhatsapp] = useState(entry.whatsappEnabled);
  const error = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={action} className="mt-5 grid gap-4 border-t border-line pt-5">
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="sortOrder" value={entry.sortOrder} />

      <FieldGrid>
        <Select
          label="Label"
          name="label"
          options={PHONE_LABELS}
          defaultValue={entry.label}
          onChange={setLabel}
          error={error("label")}
        />
        {label === "Other" ? (
          <Input
            label="Custom label"
            name="customLabel"
            defaultValue={entry.customLabel}
            required
            error={error("customLabel")}
          />
        ) : (
          <input type="hidden" name="customLabel" value={entry.customLabel} />
        )}
        <Input
          label="Phone number"
          name="number"
          defaultValue={entry.number}
          required
          hint="As you want it shown, e.g. 01335374437"
          error={error("number")}
        />
      </FieldGrid>

      <FullWidth>
        <Toggle
          label="This number is on WhatsApp"
          name="whatsappEnabled"
          defaultChecked={entry.whatsappEnabled}
          hint="Switch on to use it for WhatsApp buttons."
        />
      </FullWidth>

      {whatsapp || entry.whatsappEnabled ? (
        <Input
          label="WhatsApp number"
          name="whatsappNumber"
          defaultValue={entry.whatsappNumber}
          hint="Full international format, digits only — e.g. 8801335374437. Leave empty to reuse the number above."
          error={error("whatsappNumber")}
        />
      ) : (
        <input type="hidden" name="whatsappNumber" value={entry.whatsappNumber} />
      )}

      <fieldset className="rounded-sm border border-line bg-surface-alt p-4">
        <legend className="field-label">Show this number on</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Header" name="showInHeader" defaultChecked={entry.showInHeader} />
          <Toggle label="Footer" name="showInFooter" defaultChecked={entry.showInFooter} />
          <Toggle label="Contact page" name="showOnContact" defaultChecked={entry.showOnContact} />
          <Toggle
            label="Mobile call bar"
            name="showInMobileBar"
            defaultChecked={entry.showInMobileBar}
          />
        </div>
      </fieldset>

      <FieldGrid>
        <Toggle
          label="Main phone number"
          name="isPrimary"
          defaultChecked={entry.isPrimary}
          hint="Used wherever the site shows a single number."
        />
        <Toggle
          label="Main WhatsApp number"
          name="isPrimaryWhatsapp"
          defaultChecked={entry.isPrimaryWhatsapp}
          hint="Used by every WhatsApp button."
        />
      </FieldGrid>

      <FormMessage status={state.status} message={state.message} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton>{isNew ? "Add number" : "Save number"}</SubmitButton>
        <button type="button" onClick={onDone} className="btn btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ emails */

function EmailsPanel({ emails }: { emails: EmailRow[] }) {
  const [editing, setEditing] = useState<EmailRow | null>(null);
  const blank: EmailRow = {
    id: "",
    label: "General",
    address: "",
    isPrimary: emails.length === 0,
    showInFooter: true,
    showOnContact: true,
    sortOrder: emails.length,
  };
  const current = editing ?? blank;
  const [state, action] = useActionState(saveContactEmailAction, IDLE_STATE);

  return (
    <Panel
      title="Email addresses"
      description="Add a separate address for B2B or support if you need one."
    >
      {emails.length > 0 ? (
        <ul className="mb-5 divide-y divide-line">
          {emails.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="break-all font-medium text-ink">{entry.address}</span>
                  {entry.isPrimary ? <StatusBadge value="new" label="Main" /> : null}
                </p>
                <p className="text-[0.75rem] text-ink-subtle">{entry.label}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(entry)}
                  className="btn btn-outline btn-sm"
                >
                  Edit
                </button>
                <form action={deleteContactEmailAction}>
                  <input type="hidden" name="id" value={entry.id} />
                  <ActionButton
                    className="btn btn-ghost btn-sm text-[#8c1d18]"
                    confirm={`Remove ${entry.address}?`}
                  >
                    Remove
                  </ActionButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        action={action}
        key={current.id || "new"}
        className="grid gap-4 border-t border-line pt-5"
      >
        <input type="hidden" name="id" value={current.id} />
        <input type="hidden" name="sortOrder" value={current.sortOrder} />
        <FieldGrid>
          <Input
            label="Label"
            name="label"
            defaultValue={current.label}
            placeholder="General / B2B / Support"
          />
          <Input
            label="Email address"
            name="address"
            type="email"
            defaultValue={current.address}
            required
          />
        </FieldGrid>
        <FieldGrid>
          <Toggle label="Main email" name="isPrimary" defaultChecked={current.isPrimary} />
          <div className="grid gap-3">
            <Toggle
              label="Show in footer"
              name="showInFooter"
              defaultChecked={current.showInFooter}
            />
            <Toggle
              label="Show on contact page"
              name="showOnContact"
              defaultChecked={current.showOnContact}
            />
          </div>
        </FieldGrid>
        <FormMessage status={state.status} message={state.message} />
        <div className="flex gap-2">
          <SubmitButton>{editing ? "Save email" : "Add email"}</SubmitButton>
          {editing ? (
            <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost">
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}

/* ------------------------------------------------------------------- hours */

function HoursPanel({ hours }: { hours: HourRow[] }) {
  const [state, action] = useActionState(saveOfficeHourAction, IDLE_STATE);

  return (
    <Panel
      title="Office hours"
      description="One row per group of days. Shown in the footer and on the contact page."
    >
      {hours.length > 0 ? (
        <ul className="mb-5 divide-y divide-line">
          {hours.map((hour) => (
            <li key={hour.id} className="flex items-center justify-between gap-3 py-3">
              <p className="text-[0.9375rem] text-ink">
                <span className="font-medium">{hour.label}</span>
                <span className="text-ink-muted"> — {hour.value}</span>
                {hour.published ? "" : <span className="text-ink-subtle"> (hidden)</span>}
              </p>
              <form action={deleteOfficeHourAction}>
                <input type="hidden" name="id" value={hour.id} />
                <ActionButton className="btn btn-ghost btn-sm text-[#8c1d18]">Remove</ActionButton>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={action} className="grid gap-4 border-t border-line pt-5">
        <input type="hidden" name="id" value="" />
        <input type="hidden" name="sortOrder" value={hours.length} />
        <FieldGrid>
          <Input label="Days" name="label" placeholder="Saturday – Thursday" required />
          <Input label="Hours" name="value" placeholder="10:00 AM – 7:00 PM" required />
        </FieldGrid>
        <Input label="Note" name="note" placeholder="Closed on public holidays" />
        <Toggle label="Show on the website" name="published" defaultChecked />
        <FormMessage status={state.status} message={state.message} />
        <div>
          <SubmitButton>Add hours</SubmitButton>
        </div>
      </form>
    </Panel>
  );
}
