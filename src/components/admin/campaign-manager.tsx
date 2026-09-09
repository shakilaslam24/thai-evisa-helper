"use client";

import { useActionState, useState } from "react";
import { saveCampaignAction } from "@/app/admin/(dashboard)/campaigns/actions";
import {
  ActionButton,
  FieldGrid,
  FormMessage,
  FullWidth,
  Input,
  SubmitButton,
  Textarea,
  Toggle,
} from "./form-controls";
import { MediaPicker, type MediaOption } from "./media-picker";
import { EmptyState, Panel, StatusBadge } from "./ui";

export type CampaignRow = {
  id: string;
  name: string;
  headline: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  sortOrder: number;
  isPlaceholder: boolean;
  desktopImageId: string | null;
  mobileImageId: string | null;
  live: boolean;
  expired: boolean;
};

const BLANK: CampaignRow = {
  id: "",
  name: "",
  headline: "",
  description: "",
  ctaLabel: "",
  ctaHref: "",
  startsAt: "",
  endsAt: "",
  active: false,
  sortOrder: 0,
  isPlaceholder: false,
  desktopImageId: null,
  mobileImageId: null,
  live: false,
  expired: false,
};

export function CampaignManager({
  campaigns,
  media,
  canDelete,
  toggleAction,
  deleteAction,
}: {
  campaigns: CampaignRow[];
  media: MediaOption[];
  canDelete: boolean;
  toggleAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState<CampaignRow | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="Create one to run a Canton Fair push, a seasonal offer or a country-specific promotion on the homepage."
          />
        ) : (
          campaigns.map((campaign) => (
            <div key={campaign.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink">
                    {campaign.name}
                  </h3>
                  {campaign.headline ? (
                    <p className="mt-0.5 text-[0.875rem] text-ink-muted">{campaign.headline}</p>
                  ) : null}
                  <p className="mt-2 text-[0.75rem] text-ink-subtle">
                    {campaign.startsAt || campaign.endsAt
                      ? `${campaign.startsAt || "no start"} → ${campaign.endsAt || "no end"}`
                      : "Always on while active"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {campaign.live ? (
                    <StatusBadge value="published" label="Live on site" />
                  ) : campaign.expired ? (
                    <StatusBadge value="archived" label="Expired" />
                  ) : (
                    <StatusBadge value="draft" label={campaign.active ? "Scheduled" : "Inactive"} />
                  )}
                  {campaign.isPlaceholder ? <StatusBadge value="sample" label="Sample" /> : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(campaign)}
                  className="btn btn-outline btn-sm"
                >
                  Edit
                </button>
                <form action={toggleAction}>
                  <input type="hidden" name="id" value={campaign.id} />
                  <ActionButton className="btn btn-ghost btn-sm">
                    {campaign.active ? "Deactivate" : "Activate"}
                  </ActionButton>
                </form>
                {canDelete ? (
                  <form action={deleteAction} className="ml-auto">
                    <input type="hidden" name="id" value={campaign.id} />
                    <ActionButton
                      className="btn btn-ghost btn-sm text-[#8c1d18]"
                      confirm={`Delete the campaign "${campaign.name}"?`}
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

      <CampaignForm
        key={editing?.id ?? "new"}
        campaign={editing ?? BLANK}
        media={media}
        onDone={() => setEditing(null)}
        isNew={!editing}
      />
    </div>
  );
}

function CampaignForm({
  campaign,
  media,
  onDone,
  isNew,
}: {
  campaign: CampaignRow;
  media: MediaOption[];
  onDone: () => void;
  isNew: boolean;
}) {
  const [state, action] = useActionState(saveCampaignAction, { status: "idle" as const });
  const error = (field: string) => state.fieldErrors?.[field];

  return (
    <Panel
      title={isNew ? "New campaign" : `Editing: ${campaign.name}`}
      description={
        isNew ? "Fill this in and save to create a campaign." : "Changes apply as soon as you save."
      }
    >
      <form action={action} className="grid gap-5">
        <input type="hidden" name="id" value={campaign.id} />

        <Input
          label="Campaign name"
          name="name"
          defaultValue={campaign.name}
          required
          hint="Internal label, e.g. 'Canton Fair 2026'."
          error={error("name")}
        />
        <Input
          label="Headline"
          name="headline"
          defaultValue={campaign.headline}
          hint="Shown on the homepage band."
          error={error("headline")}
        />
        <Textarea
          label="Short description"
          name="description"
          rows={3}
          defaultValue={campaign.description}
          error={error("description")}
        />

        <FieldGrid>
          <Input
            label="CTA label"
            name="ctaLabel"
            defaultValue={campaign.ctaLabel}
            error={error("ctaLabel")}
          />
          <Input
            label="CTA link"
            name="ctaHref"
            defaultValue={campaign.ctaHref}
            placeholder="/visa/china"
            error={error("ctaHref")}
          />
          <Input
            label="Starts"
            name="startsAt"
            type="date"
            defaultValue={campaign.startsAt}
            error={error("startsAt")}
          />
          <Input
            label="Ends"
            name="endsAt"
            type="date"
            defaultValue={campaign.endsAt}
            hint="After this date the band disappears on its own."
            error={error("endsAt")}
          />
        </FieldGrid>

        <FieldGrid>
          <MediaPicker
            label="Desktop image"
            name="desktopImageId"
            options={media}
            defaultValue={campaign.desktopImageId}
          />
          <MediaPicker
            label="Mobile image"
            name="mobileImageId"
            options={media}
            defaultValue={campaign.mobileImageId}
          />
        </FieldGrid>

        <FieldGrid>
          <Input
            label="Display order"
            name="sortOrder"
            type="number"
            defaultValue={campaign.sortOrder}
            error={error("sortOrder")}
          />
          <FullWidth>
            <Toggle
              label="Active"
              name="active"
              defaultChecked={campaign.active}
              hint="Shows on the homepage while inside its date window."
            />
          </FullWidth>
          <FullWidth>
            <Toggle
              label="This is sample content"
              name="isPlaceholder"
              defaultChecked={campaign.isPlaceholder}
            />
          </FullWidth>
        </FieldGrid>

        <FormMessage status={state.status} message={state.message} />

        <div className="flex flex-wrap gap-2">
          <SubmitButton>{isNew ? "Create campaign" : "Save campaign"}</SubmitButton>
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
