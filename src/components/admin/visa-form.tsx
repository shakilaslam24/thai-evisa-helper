"use client";

import { useActionState } from "react";
import { saveVisaAction } from "@/app/admin/(dashboard)/visa/actions";
import {
  ActionButton,
  CheckboxSet,
  FieldGrid,
  FormMessage,
  FullWidth,
  Input,
  Select,
  SubmitButton,
  Textarea,
  Toggle,
} from "./form-controls";
import { MediaPicker, type MediaOption } from "./media-picker";
import { Panel } from "./ui";
import { Repeatable, type RepeatableRow } from "./repeatable";
import { IDLE_STATE } from "./action-state";
import { CONTENT_STATUS, ENTRY_TYPES, VISA_CATEGORIES, VISA_FORMATS } from "@/lib/list";

type VisaFormData = {
  id: string;
  countryName: string;
  slug: string;
  countryCode: string;
  intro: string;
  categories: string[];
  visaFormats: string[];
  entryTypes: string[];
  processingTime: string;
  serviceCharge: string;
  embassyFee: string;
  otherCharges: string;
  feeNote: string;
  eligibility: string;
  applicationProcess: string;
  importantNotes: string;
  whatsappMessage: string;
  featured: boolean;
  featuredOrder: number;
  status: string;
  isPlaceholder: boolean;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  noindex: boolean;
  coverImageId: string | null;
  flagImageId: string | null;
  ogImageId: string | null;
  documents: RepeatableRow[];
  faqs: RepeatableRow[];
};

export function VisaForm({
  visa,
  media,
  canDelete,
  deleteAction,
}: {
  visa: VisaFormData;
  media: MediaOption[];
  canDelete: boolean;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [state, action] = useActionState(saveVisaAction, IDLE_STATE);
  const error = (field: string) => state.fieldErrors?.[field];

  return (
    <>
      {visa.isPlaceholder ? (
        <div className="mb-6 max-w-4xl rounded-md border border-line-gold bg-gold-50 px-5 py-4">
          <p className="text-[0.875rem] leading-relaxed text-ink-muted">
            <strong className="font-semibold text-ink">This is sample content.</strong> It will
            never appear on the public site, even if published. Replace the placeholder text with
            DreamFly's real information, then clear the sample flag at the bottom of this page.
          </p>
        </div>
      ) : null}

      <form action={action} className="grid max-w-4xl gap-6">
        <input type="hidden" name="id" value={visa.id} />

        <Panel title="Destination">
          <FieldGrid>
            <Input
              label="Country name"
              name="countryName"
              defaultValue={visa.countryName}
              required
              error={error("countryName")}
            />
            <Input
              label="URL slug"
              name="slug"
              defaultValue={visa.slug}
              required
              hint="Appears in the address: /visa/your-slug"
              error={error("slug")}
            />
            <Input
              label="Country code"
              name="countryCode"
              defaultValue={visa.countryCode}
              placeholder="JP"
              hint="Two letters (ISO). Draws the flag next to the country name."
              error={error("countryCode")}
            />
            <Input
              label="Processing time"
              name="processingTime"
              defaultValue={visa.processingTime}
              placeholder="e.g. 7–10 working days"
              hint="Enter exactly what DreamFly quotes. Shown on the card and the detail page."
              error={error("processingTime")}
            />
            <FullWidth>
              <Textarea
                label="Introduction"
                name="intro"
                rows={5}
                defaultValue={visa.intro}
                hint="The first paragraph appears under the page title; any further paragraphs become the Overview section."
                error={error("intro")}
              />
            </FullWidth>
          </FieldGrid>
        </Panel>

        <Panel title="Visa options">
          <div className="grid gap-5">
            <CheckboxSet
              legend="Visa categories"
              name="categories"
              options={VISA_CATEGORIES}
              selected={visa.categories}
            />
            <CheckboxSet
              legend="Visa format"
              name="visaFormats"
              options={VISA_FORMATS}
              selected={visa.visaFormats}
            />
            <CheckboxSet
              legend="Entry type"
              name="entryTypes"
              options={ENTRY_TYPES}
              selected={visa.entryTypes}
            />
          </div>
        </Panel>

        <Panel
          title="Fees"
          description="Free-text fields, because fee structures differ by country. Leave anything you don't publish empty — empty rows are hidden."
        >
          <FieldGrid>
            <Input
              label="DreamFly service charge"
              name="serviceCharge"
              defaultValue={visa.serviceCharge}
              error={error("serviceCharge")}
            />
            <Input
              label="Embassy / government fee"
              name="embassyFee"
              defaultValue={visa.embassyFee}
              error={error("embassyFee")}
            />
            <Input
              label="Other charges"
              name="otherCharges"
              defaultValue={visa.otherCharges}
              error={error("otherCharges")}
            />
            <FullWidth>
              <Textarea
                label="Fee note"
                name="feeNote"
                rows={2}
                defaultValue={visa.feeNote}
                hint="Shown under the fee table. Leave empty to use the standard note about authority-set fees."
                error={error("feeNote")}
              />
            </FullWidth>
          </FieldGrid>
        </Panel>

        <Panel title="Required documents">
          <Repeatable
            name="documents"
            legend="Documents"
            description="Each row becomes one item in the Required Documents checklist."
            addLabel="Add document"
            emptyLabel="No documents listed yet."
            initial={visa.documents}
            fields={[
              {
                key: "label",
                label: "Document",
                placeholder: "Passport valid for at least 6 months",
                width: "half",
              },
              {
                key: "note",
                label: "Note (optional)",
                placeholder: "Original plus one photocopy",
                width: "half",
              },
            ]}
          />
        </Panel>

        <Panel title="Guidance">
          <div className="grid gap-5">
            <Textarea
              label="Who can apply"
              name="eligibility"
              rows={5}
              defaultValue={visa.eligibility}
              hint="One point per line. Rendered as a checklist."
              error={error("eligibility")}
            />
            <Textarea
              label="Application process"
              name="applicationProcess"
              rows={6}
              defaultValue={visa.applicationProcess}
              hint="One step per line. Rendered as numbered steps."
              error={error("applicationProcess")}
            />
            <Textarea
              label="Important notes"
              name="importantNotes"
              rows={4}
              defaultValue={visa.importantNotes}
              hint="One note per line. Shown in a highlighted box. Never promise approval — the decision rests with the embassy."
              error={error("importantNotes")}
            />
          </div>
        </Panel>

        <Panel title="FAQs">
          <Repeatable
            name="faqs"
            legend="Questions"
            description="Real FAQs only. When present, they are also published as structured data so they can appear in search results."
            addLabel="Add question"
            emptyLabel="No questions yet."
            initial={visa.faqs}
            fields={[
              {
                key: "question",
                label: "Question",
                placeholder: "How long is the visa valid for?",
              },
              { key: "answer", label: "Answer", multiline: true },
            ]}
          />
        </Panel>

        <Panel title="Images">
          <FieldGrid>
            <MediaPicker
              label="Cover image"
              name="coverImageId"
              options={media}
              defaultValue={visa.coverImageId}
              hint="Used on the card and at the top of the page."
            />
            <MediaPicker
              label="Flag image"
              name="flagImageId"
              options={media}
              defaultValue={visa.flagImageId}
              hint="Optional. The country code already draws a flag."
            />
          </FieldGrid>
        </Panel>

        <Panel title="WhatsApp">
          <Textarea
            label="Custom WhatsApp message"
            name="whatsappMessage"
            rows={2}
            defaultValue={visa.whatsappMessage}
            hint={`Leave empty to use the default: "Hello DreamFly, I would like to know more about your ${visa.countryName} visa service."`}
            error={error("whatsappMessage")}
          />
        </Panel>

        <Panel title="Search & sharing">
          <FieldGrid>
            <FullWidth>
              <Input
                label="SEO title"
                name="seoTitle"
                defaultValue={visa.seoTitle}
                hint="Leave empty to use the country name."
                error={error("seoTitle")}
              />
            </FullWidth>
            <FullWidth>
              <Textarea
                label="SEO description"
                name="seoDescription"
                rows={3}
                defaultValue={visa.seoDescription}
                error={error("seoDescription")}
              />
            </FullWidth>
            <MediaPicker
              label="Social share image"
              name="ogImageId"
              options={media}
              defaultValue={visa.ogImageId}
            />
            <Input
              label="Canonical URL"
              name="canonicalUrl"
              defaultValue={visa.canonicalUrl}
              hint="Only if this page duplicates another."
              error={error("canonicalUrl")}
            />
            <FullWidth>
              <Toggle
                label="Hide from search engines (noindex)"
                name="noindex"
                defaultChecked={visa.noindex}
              />
            </FullWidth>
          </FieldGrid>
        </Panel>

        <Panel title="Publishing">
          <FieldGrid>
            <Select
              label="Status"
              name="status"
              options={CONTENT_STATUS}
              defaultValue={visa.status}
              error={error("status")}
            />
            <Input
              label="Featured order"
              name="featuredOrder"
              type="number"
              defaultValue={visa.featuredOrder}
              hint="Lower numbers appear first on the homepage."
              error={error("featuredOrder")}
            />
            <FullWidth>
              <Toggle
                label="Feature on the homepage"
                name="featured"
                defaultChecked={visa.featured}
                hint="The homepage shows featured destinations in the order set above."
              />
            </FullWidth>
            <FullWidth>
              <Toggle
                label="This is sample content"
                name="isPlaceholder"
                defaultChecked={visa.isPlaceholder}
                hint="While ticked, this destination can never appear on the public site. Untick once the information here is real."
              />
            </FullWidth>
          </FieldGrid>
        </Panel>

        <div className="sticky bottom-0 -mx-5 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton>Save destination</SubmitButton>
            <div className="min-w-0 flex-1">
              <FormMessage status={state.status} message={state.message} />
            </div>
          </div>
        </div>
      </form>

      {canDelete ? (
        <form action={deleteAction} className="mt-8 max-w-4xl border-t border-line pt-6">
          <input type="hidden" name="id" value={visa.id} />
          <ActionButton
            className="btn btn-outline btn-sm text-[#8c1d18]"
            confirm={`Delete "${visa.countryName}" permanently? This cannot be undone.`}
          >
            Delete destination
          </ActionButton>
          <p className="field-hint mt-2">
            Archiving is usually better than deleting — an archived page keeps its history.
          </p>
        </form>
      ) : null}
    </>
  );
}
