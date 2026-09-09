"use client";

import { useActionState, useState } from "react";
import {
  saveHeroAction,
  saveSectionsAction,
  saveServiceAction,
  saveWhyAction,
} from "@/app/admin/(dashboard)/home/actions";
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
import { IDLE_STATE } from "./action-state";
import { ICON_KEYS } from "@/components/ui/icons";

const ICON_OPTIONS = ICON_KEYS.map((key) => ({
  value: key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

type Section = {
  key: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaHref: string;
};

type Hero = {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  description: string;
  brandLine: string;
  badge: string;
  videoUrl: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  desktopImageId: string | null;
  mobileImageId: string | null;
};

type Service = {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  enabled: boolean;
  sortOrder: number;
};

type WhyItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  sortOrder: number;
};

/** Sections whose copy comes from elsewhere, so their heading fields are hidden. */
const COPY_FROM_ELSEWHERE = new Set(["hero", "campaign"]);

export function HomeEditor({
  sections,
  hero,
  services,
  whyItems,
  media,
  deleteServiceAction,
  deleteWhyAction,
}: {
  sections: Section[];
  hero: Hero;
  services: Service[];
  whyItems: WhyItem[];
  media: MediaOption[];
  deleteServiceAction: (formData: FormData) => Promise<void>;
  deleteWhyAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="grid max-w-4xl gap-6">
      <SectionsPanel sections={sections} />
      <HeroPanel hero={hero} media={media} />
      <ServicesPanel services={services} media={media} deleteAction={deleteServiceAction} />
      <WhyPanel items={whyItems} deleteAction={deleteWhyAction} />
    </div>
  );
}

function SectionsPanel({ sections }: { sections: Section[] }) {
  const [state, action] = useActionState(saveSectionsAction, IDLE_STATE);

  return (
    <Panel
      title="Sections"
      description="Order and visibility of the homepage. A section with nothing to show — no active campaign, no published reviews — hides itself automatically."
    >
      <form action={action} className="grid gap-4">
        {sections.map((section, index) => (
          <div key={section.key} className="rounded-sm border border-line bg-surface-alt p-4">
            <input type="hidden" name="sectionKey" value={section.key} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Toggle
                label={section.label}
                name={`enabled:${section.key}`}
                defaultChecked={section.enabled}
              />
              <label className="flex items-center gap-2 text-[0.75rem] text-ink-subtle">
                Order
                <input
                  type="number"
                  name={`sortOrder:${section.key}`}
                  defaultValue={section.sortOrder || index}
                  min={0}
                  max={99}
                  className="input w-20 py-1.5 text-center"
                  aria-label={`${section.label} display order`}
                />
              </label>
            </div>

            {!COPY_FROM_ELSEWHERE.has(section.key) ? (
              <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor={`heading-${section.key}`}>
                    Heading
                  </label>
                  <input
                    id={`heading-${section.key}`}
                    name={`heading:${section.key}`}
                    defaultValue={section.heading}
                    className="input"
                    maxLength={200}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor={`sub-${section.key}`}>
                    Supporting line
                  </label>
                  <textarea
                    id={`sub-${section.key}`}
                    name={`subheading:${section.key}`}
                    defaultValue={section.subheading}
                    rows={2}
                    className="input"
                    maxLength={400}
                  />
                </div>
                {section.key === "visas" || section.key === "tours" ? (
                  <>
                    <div>
                      <label className="field-label" htmlFor={`cta-${section.key}`}>
                        Link label
                      </label>
                      <input
                        id={`cta-${section.key}`}
                        name={`ctaLabel:${section.key}`}
                        defaultValue={section.ctaLabel}
                        className="input"
                        maxLength={80}
                      />
                    </div>
                    <div>
                      <label className="field-label" htmlFor={`ctahref-${section.key}`}>
                        Link URL
                      </label>
                      <input
                        id={`ctahref-${section.key}`}
                        name={`ctaHref:${section.key}`}
                        defaultValue={section.ctaHref}
                        className="input"
                        maxLength={200}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <p className="field-hint mt-3 border-t border-line pt-3">
                {section.key === "hero"
                  ? "Wording for this section is edited below."
                  : "Wording comes from whichever campaign is active."}
              </p>
            )}
          </div>
        ))}

        <FormMessage status={state.status} message={state.message} />
        <div>
          <SubmitButton>Save sections</SubmitButton>
        </div>
      </form>
    </Panel>
  );
}

function HeroPanel({ hero, media }: { hero: Hero; media: MediaOption[] }) {
  const [state, action] = useActionState(saveHeroAction, IDLE_STATE);
  const error = (field: string) => state.fieldErrors?.[field];

  return (
    <Panel title="Hero" description="The first thing a visitor sees. Every part of it is editable.">
      <form action={action} className="grid gap-5">
        <FieldGrid>
          <Input
            label="Eyebrow"
            name="eyebrow"
            defaultValue={hero.eyebrow}
            error={error("eyebrow")}
          />
          <Input
            label="Badge"
            name="badge"
            defaultValue={hero.badge}
            hint="Optional small pill under the buttons."
            error={error("badge")}
          />
          <Input
            label="Headline"
            name="headline"
            defaultValue={hero.headline}
            error={error("headline")}
          />
          <Input
            label="Headline accent"
            name="headlineAccent"
            defaultValue={hero.headlineAccent}
            hint="Shown in gold, immediately after the headline."
            error={error("headlineAccent")}
          />
          <FullWidth>
            <Textarea
              label="Description"
              name="description"
              rows={3}
              defaultValue={hero.description}
              error={error("description")}
            />
          </FullWidth>
          <FullWidth>
            <Input
              label="Brand line"
              name="brandLine"
              defaultValue={hero.brandLine}
              hint="The tagline shown beside a gold rule."
              error={error("brandLine")}
            />
          </FullWidth>
        </FieldGrid>

        <FieldGrid>
          <Input
            label="Primary button label"
            name="primaryCtaLabel"
            defaultValue={hero.primaryCtaLabel}
            error={error("primaryCtaLabel")}
          />
          <Input
            label="Primary button link"
            name="primaryCtaHref"
            defaultValue={hero.primaryCtaHref}
            error={error("primaryCtaHref")}
          />
          <Input
            label="Secondary button label"
            name="secondaryCtaLabel"
            defaultValue={hero.secondaryCtaLabel}
            error={error("secondaryCtaLabel")}
          />
          <Input
            label="Secondary button link"
            name="secondaryCtaHref"
            defaultValue={hero.secondaryCtaHref}
            hint="Leave empty to make this button open WhatsApp."
            error={error("secondaryCtaHref")}
          />
        </FieldGrid>

        <FieldGrid>
          <MediaPicker
            label="Desktop image"
            name="desktopImageId"
            options={media}
            defaultValue={hero.desktopImageId}
            hint="Portrait or square works best — it fills the right-hand panel."
          />
          <MediaPicker
            label="Mobile image"
            name="mobileImageId"
            options={media}
            defaultValue={hero.mobileImageId}
            hint="Optional. Used below 768px."
          />
          <FullWidth>
            <Input
              label="Background video URL"
              name="videoUrl"
              defaultValue={hero.videoUrl}
              hint="Optional. An MP4 served from this site. Leave empty to use the image."
              error={error("videoUrl")}
            />
          </FullWidth>
        </FieldGrid>

        <p className="field-hint">
          With no image or video set, the hero shows the designed DreamFly brand panel — so the page
          is never broken while you gather photography.
        </p>

        <FormMessage status={state.status} message={state.message} />
        <div>
          <SubmitButton>Save hero</SubmitButton>
        </div>
      </form>
    </Panel>
  );
}

function ServicesPanel({
  services,
  media,
  deleteAction,
}: {
  services: Service[];
  media: MediaOption[];
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState<Service | null>(null);
  const [state, action] = useActionState(saveServiceAction, IDLE_STATE);
  const blank: Service = {
    id: "",
    title: "",
    description: "",
    icon: "visa",
    href: "",
    enabled: true,
    sortOrder: services.length,
  };
  const current = editing ?? blank;

  return (
    <Panel title="Core services" description="The four cards below the hero.">
      <ul className="mb-5 divide-y divide-line">
        {services.map((service) => (
          <li key={service.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] font-medium text-ink">{service.title}</p>
              <p className="truncate text-[0.75rem] text-ink-subtle">
                {service.icon} · {service.href || "no link"}
                {service.enabled ? "" : " · hidden"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setEditing(service)}
                className="btn btn-outline btn-sm"
              >
                Edit
              </button>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={service.id} />
                <ActionButton
                  className="btn btn-ghost btn-sm text-[#8c1d18]"
                  confirm={`Remove "${service.title}"?`}
                >
                  Remove
                </ActionButton>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <form
        action={action}
        key={current.id || "new"}
        className="grid gap-4 border-t border-line pt-5"
      >
        <input type="hidden" name="id" value={current.id} />
        <FieldGrid>
          <Input label="Title" name="title" defaultValue={current.title} required />
          <Select label="Icon" name="icon" options={ICON_OPTIONS} defaultValue={current.icon} />
          <FullWidth>
            <Textarea
              label="Description"
              name="description"
              rows={2}
              defaultValue={current.description}
            />
          </FullWidth>
          <Input label="Link" name="href" defaultValue={current.href} placeholder="/visa" />
          <Input label="Order" name="sortOrder" type="number" defaultValue={current.sortOrder} />
          <FullWidth>
            <Toggle label="Show this card" name="enabled" defaultChecked={current.enabled} />
          </FullWidth>
        </FieldGrid>

        <FormMessage status={state.status} message={state.message} />
        <div className="flex gap-2">
          <SubmitButton>{current.id ? "Save card" : "Add card"}</SubmitButton>
          {editing ? (
            <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost">
              Cancel
            </button>
          ) : null}
        </div>
      </form>
      {/* Media is not used by service cards today; the picker stays available for future use. */}
      <span className="hidden">{media.length}</span>
    </Panel>
  );
}

function WhyPanel({
  items,
  deleteAction,
}: {
  items: WhyItem[];
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState<WhyItem | null>(null);
  const [state, action] = useActionState(saveWhyAction, IDLE_STATE);
  const blank: WhyItem = {
    id: "",
    title: "",
    description: "",
    icon: "shield",
    enabled: true,
    sortOrder: items.length,
  };
  const current = editing ?? blank;

  return (
    <Panel
      title="Why DreamFly"
      description="Keep these factual. Avoid claims you cannot stand behind."
    >
      <ul className="mb-5 divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] font-medium text-ink">{item.title}</p>
              <p className="truncate text-[0.75rem] text-ink-subtle">{item.description}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setEditing(item)}
                className="btn btn-outline btn-sm"
              >
                Edit
              </button>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={item.id} />
                <ActionButton
                  className="btn btn-ghost btn-sm text-[#8c1d18]"
                  confirm={`Remove "${item.title}"?`}
                >
                  Remove
                </ActionButton>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <form
        action={action}
        key={current.id || "new"}
        className="grid gap-4 border-t border-line pt-5"
      >
        <input type="hidden" name="id" value={current.id} />
        <FieldGrid>
          <Input label="Title" name="title" defaultValue={current.title} required />
          <Select label="Icon" name="icon" options={ICON_OPTIONS} defaultValue={current.icon} />
          <FullWidth>
            <Textarea
              label="Description"
              name="description"
              rows={2}
              defaultValue={current.description}
            />
          </FullWidth>
          <Input label="Order" name="sortOrder" type="number" defaultValue={current.sortOrder} />
          <FullWidth>
            <Toggle label="Show this item" name="enabled" defaultChecked={current.enabled} />
          </FullWidth>
        </FieldGrid>

        <FormMessage status={state.status} message={state.message} />
        <div className="flex gap-2">
          <SubmitButton>{current.id ? "Save" : "Add"}</SubmitButton>
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
