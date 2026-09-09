"use client";

import { useActionState, useState } from "react";
import { saveTestimonialAction } from "@/app/admin/(dashboard)/testimonials/actions";
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
import { EmptyState, Panel, StatusBadge } from "./ui";

export type TestimonialRow = {
  id: string;
  authorName: string;
  authorTitle: string;
  quote: string;
  serviceType: string;
  rating: number | null;
  published: boolean;
  sortOrder: number;
  isPlaceholder: boolean;
  avatarId: string | null;
};

const BLANK: TestimonialRow = {
  id: "",
  authorName: "",
  authorTitle: "",
  quote: "",
  serviceType: "",
  rating: null,
  published: false,
  sortOrder: 0,
  isPlaceholder: false,
  avatarId: null,
};

const RATINGS = [
  { value: "", label: "No rating" },
  { value: "5", label: "5 stars" },
  { value: "4", label: "4 stars" },
  { value: "3", label: "3 stars" },
  { value: "2", label: "2 stars" },
  { value: "1", label: "1 star" },
] as const;

export function TestimonialManager({
  testimonials,
  media,
  canDelete,
  toggleAction,
  deleteAction,
}: {
  testimonials: TestimonialRow[];
  media: MediaOption[];
  canDelete: boolean;
  toggleAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState<TestimonialRow | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
      <div className="space-y-4">
        {testimonials.length === 0 ? (
          <EmptyState
            title="No testimonials yet"
            description="Add feedback you have genuinely received. Never write one on a client's behalf."
          />
        ) : (
          testimonials.map((testimonial) => (
            <div key={testimonial.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-[1rem] font-semibold text-ink">
                    {testimonial.authorName}
                  </h3>
                  <p className="text-[0.8125rem] text-ink-subtle">
                    {[testimonial.authorTitle, testimonial.serviceType]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge value={testimonial.published ? "published" : "draft"} />
                  {testimonial.isPlaceholder ? <StatusBadge value="sample" label="Sample" /> : null}
                </div>
              </div>

              <blockquote className="mt-3 line-clamp-3 text-[0.875rem] leading-relaxed text-ink-muted">
                “{testimonial.quote}”
              </blockquote>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(testimonial)}
                  className="btn btn-outline btn-sm"
                >
                  Edit
                </button>
                <form action={toggleAction}>
                  <input type="hidden" name="id" value={testimonial.id} />
                  <ActionButton className="btn btn-ghost btn-sm">
                    {testimonial.published ? "Unpublish" : "Publish"}
                  </ActionButton>
                </form>
                {canDelete ? (
                  <form action={deleteAction} className="ml-auto">
                    <input type="hidden" name="id" value={testimonial.id} />
                    <ActionButton
                      className="btn btn-ghost btn-sm text-[#8c1d18]"
                      confirm={`Delete the testimonial from ${testimonial.authorName}?`}
                    >
                      Delete
                    </ActionButton>
                  </form>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <TestimonialForm
        key={editing?.id ?? "new"}
        testimonial={editing ?? BLANK}
        media={media}
        isNew={!editing}
        onDone={() => setEditing(null)}
      />
    </div>
  );
}

function TestimonialForm({
  testimonial,
  media,
  isNew,
  onDone,
}: {
  testimonial: TestimonialRow;
  media: MediaOption[];
  isNew: boolean;
  onDone: () => void;
}) {
  const [state, action] = useActionState(saveTestimonialAction, { status: "idle" as const });
  const error = (field: string) => state.fieldErrors?.[field];

  return (
    <Panel title={isNew ? "Add a testimonial" : `Editing: ${testimonial.authorName}`}>
      <form action={action} className="grid gap-5">
        <input type="hidden" name="id" value={testimonial.id} />

        <Input
          label="Client name"
          name="authorName"
          defaultValue={testimonial.authorName}
          required
          error={error("authorName")}
        />
        <FieldGrid>
          <Input
            label="Title / company"
            name="authorTitle"
            defaultValue={testimonial.authorTitle}
            error={error("authorTitle")}
          />
          <Input
            label="Service used"
            name="serviceType"
            defaultValue={testimonial.serviceType}
            placeholder="e.g. Japan Visa"
            error={error("serviceType")}
          />
        </FieldGrid>
        <Textarea
          label="Quote"
          name="quote"
          rows={5}
          defaultValue={testimonial.quote}
          required
          hint="Use the client's own words."
          error={error("quote")}
        />

        <FieldGrid>
          <Select
            label="Rating"
            name="rating"
            options={RATINGS}
            defaultValue={testimonial.rating ? String(testimonial.rating) : ""}
            error={error("rating")}
          />
          <Input
            label="Display order"
            name="sortOrder"
            type="number"
            defaultValue={testimonial.sortOrder}
            error={error("sortOrder")}
          />
        </FieldGrid>

        <MediaPicker
          label="Client photo"
          name="avatarId"
          options={media}
          defaultValue={testimonial.avatarId}
          hint="Optional — initials are shown otherwise."
        />

        <FullWidth>
          <Toggle
            label="Published"
            name="published"
            defaultChecked={testimonial.published}
            hint="Only published testimonials appear on the homepage."
          />
        </FullWidth>
        <FullWidth>
          <Toggle
            label="This is sample content"
            name="isPlaceholder"
            defaultChecked={testimonial.isPlaceholder}
          />
        </FullWidth>

        <FormMessage status={state.status} message={state.message} />

        <div className="flex flex-wrap gap-2">
          <SubmitButton>{isNew ? "Add testimonial" : "Save"}</SubmitButton>
          {!isNew ? (
            <button type="button" onClick={onDone} className="btn btn-ghost">
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}
