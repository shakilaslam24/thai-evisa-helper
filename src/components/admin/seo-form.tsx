"use client";

import { useActionState } from "react";
import { savePageSeoAction } from "@/app/admin/(dashboard)/seo/actions";
import {
  FieldGrid,
  FormMessage,
  FullWidth,
  Input,
  SubmitButton,
  Textarea,
  Toggle,
} from "./form-controls";
import { MediaPicker, type MediaOption } from "./media-picker";
import { Panel } from "./ui";
import { IDLE_STATE } from "./action-state";

export function PageSeoForm({
  pageKey,
  label,
  path,
  seo,
  media,
}: {
  pageKey: string;
  label: string;
  path: string;
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    canonicalUrl: string;
    noindex: boolean;
    ogImageId: string | null;
  };
  media: MediaOption[];
}) {
  const [state, action] = useActionState(savePageSeoAction, IDLE_STATE);
  const error = (field: string) => state.fieldErrors?.[field];

  return (
    <Panel title={label} description={path}>
      <form action={action} className="grid gap-5">
        <input type="hidden" name="pageKey" value={pageKey} />

        <FieldGrid>
          <FullWidth>
            <Input
              label="Title"
              name="title"
              defaultValue={seo.title}
              hint="Around 50–60 characters. The company name is appended automatically."
              error={error("title")}
            />
          </FullWidth>
          <FullWidth>
            <Textarea
              label="Description"
              name="description"
              rows={3}
              defaultValue={seo.description}
              hint="Around 150–160 characters."
              error={error("description")}
            />
          </FullWidth>
          <MediaPicker
            label="Social share image"
            name="ogImageId"
            options={media}
            defaultValue={seo.ogImageId}
          />
          <Input
            label="Canonical URL"
            name="canonicalUrl"
            defaultValue={seo.canonicalUrl}
            error={error("canonicalUrl")}
          />
          <FullWidth>
            <Toggle
              label="Hide from search engines (noindex)"
              name="noindex"
              defaultChecked={seo.noindex}
            />
          </FullWidth>
        </FieldGrid>

        <FormMessage status={state.status} message={state.message} />
        <div>
          <SubmitButton className="btn btn-primary btn-sm">Save {label} SEO</SubmitButton>
        </div>
      </form>
    </Panel>
  );
}
