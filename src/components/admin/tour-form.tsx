"use client";

import { useActionState } from "react";
import { saveTourAction } from "@/app/admin/(dashboard)/tours/actions";
import {
  ActionButton,
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
import { AVAILABILITY, CONTENT_STATUS, PACKAGE_TYPES } from "@/lib/list";

type TourFormData = {
  id: string;
  name: string;
  slug: string;
  destination: string;
  country: string;
  shortDescription: string;
  duration: string;
  travelDates: string;
  packageType: string;
  startingPrice: string;
  currency: string;
  hotelDetails: string;
  importantNotes: string;
  availability: string;
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
  ogImageId: string | null;
  highlights: string;
  includes: string;
  excludes: string;
  itinerary: RepeatableRow[];
};

export function TourForm({
  tour,
  media,
  canDelete,
  deleteAction,
}: {
  tour: TourFormData;
  media: MediaOption[];
  canDelete: boolean;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [state, action] = useActionState(saveTourAction, IDLE_STATE);
  const error = (field: string) => state.fieldErrors?.[field];

  return (
    <>
      {tour.isPlaceholder ? (
        <div className="mb-6 max-w-4xl rounded-md border border-line-gold bg-gold-50 px-5 py-4">
          <p className="text-[0.875rem] leading-relaxed text-ink-muted">
            <strong className="font-semibold text-ink">This is sample content.</strong> It will
            never appear on the public site. Replace it with a real package, then clear the sample
            flag below.
          </p>
        </div>
      ) : null}

      <form action={action} className="grid max-w-4xl gap-6">
        <input type="hidden" name="id" value={tour.id} />

        <Panel title="Package">
          <FieldGrid>
            <Input
              label="Package name"
              name="name"
              defaultValue={tour.name}
              required
              error={error("name")}
            />
            <Input
              label="URL slug"
              name="slug"
              defaultValue={tour.slug}
              required
              hint="/tours/your-slug"
              error={error("slug")}
            />
            <Input
              label="Destination"
              name="destination"
              defaultValue={tour.destination}
              placeholder="e.g. Bangkok & Phuket"
              error={error("destination")}
            />
            <Input
              label="Country"
              name="country"
              defaultValue={tour.country}
              placeholder="e.g. Thailand"
              error={error("country")}
            />
            <FullWidth>
              <Textarea
                label="Short description"
                name="shortDescription"
                rows={3}
                defaultValue={tour.shortDescription}
                hint="One or two sentences. Shown on the card and under the page title."
                error={error("shortDescription")}
              />
            </FullWidth>
          </FieldGrid>
        </Panel>

        <Panel title="Trip details">
          <FieldGrid>
            <Input
              label="Duration"
              name="duration"
              defaultValue={tour.duration}
              placeholder="e.g. 5 days / 4 nights"
              error={error("duration")}
            />
            <Input
              label="Travel dates"
              name="travelDates"
              defaultValue={tour.travelDates}
              placeholder="e.g. 12–16 March 2026"
              error={error("travelDates")}
            />
            <Select
              label="Package type"
              name="packageType"
              options={PACKAGE_TYPES}
              defaultValue={tour.packageType}
              error={error("packageType")}
            />
            <Select
              label="Availability"
              name="availability"
              options={AVAILABILITY}
              defaultValue={tour.availability}
              error={error("availability")}
            />
            <Input
              label="Starting price"
              name="startingPrice"
              defaultValue={tour.startingPrice}
              placeholder="e.g. 65,000"
              hint="Numbers only — the currency is set separately."
              error={error("startingPrice")}
            />
            <Input
              label="Currency"
              name="currency"
              defaultValue={tour.currency}
              placeholder="BDT"
              error={error("currency")}
            />
          </FieldGrid>
        </Panel>

        <Panel title="What's in the package">
          <div className="grid gap-5">
            <Textarea
              label="Highlights"
              name="highlights"
              rows={5}
              defaultValue={tour.highlights}
              hint="One highlight per line."
              error={error("highlights")}
            />
            <Textarea
              label="Hotel details"
              name="hotelDetails"
              rows={4}
              defaultValue={tour.hotelDetails}
              error={error("hotelDetails")}
            />
            <FieldGrid>
              <Textarea
                label="Includes"
                name="includes"
                rows={6}
                defaultValue={tour.includes}
                hint="One item per line."
                error={error("includes")}
              />
              <Textarea
                label="Excludes"
                name="excludes"
                rows={6}
                defaultValue={tour.excludes}
                hint="One item per line."
                error={error("excludes")}
              />
            </FieldGrid>
            <Textarea
              label="Important notes"
              name="importantNotes"
              rows={4}
              defaultValue={tour.importantNotes}
              hint="One note per line. Shown in a highlighted box."
              error={error("importantNotes")}
            />
          </div>
        </Panel>

        <Panel title="Itinerary">
          <Repeatable
            name="itinerary"
            legend="Days"
            description="Add one row per day, or group days together (e.g. 'Days 3–4')."
            addLabel="Add day"
            emptyLabel="No itinerary yet."
            initial={tour.itinerary}
            fields={[
              { key: "dayLabel", label: "Day", placeholder: "Day 1", width: "half" },
              { key: "title", label: "Title", placeholder: "Arrival in Bangkok", width: "half" },
              { key: "body", label: "Description", multiline: true },
            ]}
          />
        </Panel>

        <Panel title="Images">
          <FieldGrid>
            <MediaPicker
              label="Cover image"
              name="coverImageId"
              options={media}
              defaultValue={tour.coverImageId}
            />
            <MediaPicker
              label="Social share image"
              name="ogImageId"
              options={media}
              defaultValue={tour.ogImageId}
            />
          </FieldGrid>
        </Panel>

        <Panel title="WhatsApp">
          <Textarea
            label="Custom WhatsApp message"
            name="whatsappMessage"
            rows={2}
            defaultValue={tour.whatsappMessage}
            hint={`Leave empty to use the default: "Hello DreamFly, I'm interested in ${tour.name}."`}
            error={error("whatsappMessage")}
          />
        </Panel>

        <Panel title="Search & sharing">
          <FieldGrid>
            <FullWidth>
              <Input
                label="SEO title"
                name="seoTitle"
                defaultValue={tour.seoTitle}
                error={error("seoTitle")}
              />
            </FullWidth>
            <FullWidth>
              <Textarea
                label="SEO description"
                name="seoDescription"
                rows={3}
                defaultValue={tour.seoDescription}
                error={error("seoDescription")}
              />
            </FullWidth>
            <Input
              label="Canonical URL"
              name="canonicalUrl"
              defaultValue={tour.canonicalUrl}
              error={error("canonicalUrl")}
            />
            <Toggle
              label="Hide from search engines (noindex)"
              name="noindex"
              defaultChecked={tour.noindex}
            />
          </FieldGrid>
        </Panel>

        <Panel title="Publishing">
          <FieldGrid>
            <Select
              label="Status"
              name="status"
              options={CONTENT_STATUS}
              defaultValue={tour.status}
              error={error("status")}
            />
            <Input
              label="Featured order"
              name="featuredOrder"
              type="number"
              defaultValue={tour.featuredOrder}
              hint="Lower numbers appear first."
              error={error("featuredOrder")}
            />
            <FullWidth>
              <Toggle
                label="Feature on the homepage"
                name="featured"
                defaultChecked={tour.featured}
              />
            </FullWidth>
            <FullWidth>
              <Toggle
                label="This is sample content"
                name="isPlaceholder"
                defaultChecked={tour.isPlaceholder}
                hint="While ticked, this package can never appear on the public site."
              />
            </FullWidth>
          </FieldGrid>
        </Panel>

        <div className="sticky bottom-0 -mx-5 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton>Save package</SubmitButton>
            <div className="min-w-0 flex-1">
              <FormMessage status={state.status} message={state.message} />
            </div>
          </div>
        </div>
      </form>

      {canDelete ? (
        <form action={deleteAction} className="mt-8 max-w-4xl border-t border-line pt-6">
          <input type="hidden" name="id" value={tour.id} />
          <ActionButton
            className="btn btn-outline btn-sm text-[#8c1d18]"
            confirm={`Delete "${tour.name}" permanently? This cannot be undone.`}
          >
            Delete package
          </ActionButton>
        </form>
      ) : null}
    </>
  );
}
