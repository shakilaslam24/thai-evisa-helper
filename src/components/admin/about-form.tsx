"use client";

import { useActionState } from "react";
import { saveAboutAction } from "@/app/admin/(dashboard)/about/actions";
import { FieldGrid, FormMessage, FullWidth, Input, SubmitButton, Textarea } from "./form-controls";
import { Panel } from "./ui";
import { IDLE_STATE } from "./action-state";

type About = {
  heroHeading: string;
  heroSubheading: string;
  whoWeAre: string;
  mission: string;
  vision: string;
  approach: string;
  galleryHeading: string;
  teamHeading: string;
};

export function AboutForm({ about }: { about: About }) {
  const [state, action] = useActionState(saveAboutAction, IDLE_STATE);
  const error = (field: string) => state.fieldErrors?.[field];

  return (
    <Panel title="Page content">
      <form action={action} className="grid gap-5">
        <FieldGrid>
          <FullWidth>
            <Input
              label="Page heading"
              name="heroHeading"
              defaultValue={about.heroHeading}
              error={error("heroHeading")}
            />
          </FullWidth>
          <FullWidth>
            <Textarea
              label="Introduction"
              name="heroSubheading"
              rows={2}
              defaultValue={about.heroSubheading}
              error={error("heroSubheading")}
            />
          </FullWidth>
        </FieldGrid>

        <Textarea
          label="Who we are"
          name="whoWeAre"
          rows={7}
          defaultValue={about.whoWeAre}
          hint="Separate paragraphs with a blank line."
          error={error("whoWeAre")}
        />

        <FieldGrid>
          <Textarea
            label="Our mission"
            name="mission"
            rows={4}
            defaultValue={about.mission}
            error={error("mission")}
          />
          <Textarea
            label="Our vision"
            name="vision"
            rows={4}
            defaultValue={about.vision}
            error={error("vision")}
          />
          <FullWidth>
            <Textarea
              label="Our approach"
              name="approach"
              rows={4}
              defaultValue={about.approach}
              error={error("approach")}
            />
          </FullWidth>
        </FieldGrid>

        <FieldGrid>
          <Input
            label="Gallery heading"
            name="galleryHeading"
            defaultValue={about.galleryHeading}
            error={error("galleryHeading")}
          />
          <Input
            label="Team heading"
            name="teamHeading"
            defaultValue={about.teamHeading}
            error={error("teamHeading")}
          />
        </FieldGrid>

        <FormMessage status={state.status} message={state.message} />
        <div>
          <SubmitButton>Save About page</SubmitButton>
        </div>
      </form>
    </Panel>
  );
}
