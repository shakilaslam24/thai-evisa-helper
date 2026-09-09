"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/app/admin/(dashboard)/settings/actions";
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

type Settings = {
  companyName: string;
  tagline: string;
  primaryPhone: string;
  secondaryPhone: string;
  whatsappNumber: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  googleMapsUrl: string;
  googleMapsEmbed: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  officeHours: string;
  footerText: string;
  gaMeasurementId: string;
  gtmContainerId: string;
  metaPixelId: string;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  siteUrl: string;
  allowIndexing: boolean;
  logoLightId: string | null;
  logoDarkId: string | null;
  faviconId: string | null;
  defaultSocialImageId: string | null;
};

export function SettingsForm({ settings, media }: { settings: Settings; media: MediaOption[] }) {
  const [state, action] = useActionState(saveSettingsAction, IDLE_STATE);
  const error = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={action} className="grid max-w-4xl gap-6">
      <Panel title="Identity">
        <FieldGrid>
          <Input
            label="Company name"
            name="companyName"
            defaultValue={settings.companyName}
            required
            error={error("companyName")}
          />
          <Input
            label="Tagline"
            name="tagline"
            defaultValue={settings.tagline}
            error={error("tagline")}
          />
          <FullWidth>
            <Textarea
              label="Footer text"
              name="footerText"
              rows={2}
              defaultValue={settings.footerText}
              hint="One or two sentences shown beside the logo in the footer."
              error={error("footerText")}
            />
          </FullWidth>
        </FieldGrid>
      </Panel>

      <Panel
        title="Logos & icons"
        description="Leave these empty to use the official DreamFly artwork supplied with the brand pack."
      >
        <FieldGrid>
          <MediaPicker
            label="Logo — light backgrounds"
            name="logoLightId"
            options={media}
            defaultValue={settings.logoLightId}
            hint="Navy artwork, used in the header."
          />
          <MediaPicker
            label="Logo — dark backgrounds"
            name="logoDarkId"
            options={media}
            defaultValue={settings.logoDarkId}
            hint="White artwork, used in the footer and admin."
          />
          <MediaPicker
            label="Favicon"
            name="faviconId"
            options={media}
            defaultValue={settings.faviconId}
          />
          <MediaPicker
            label="Default social image"
            name="defaultSocialImageId"
            options={media}
            defaultValue={settings.defaultSocialImageId}
            hint="1200×630 works best. Shown when a link is shared."
          />
        </FieldGrid>
      </Panel>

      <Panel title="Contact">
        <FieldGrid>
          <Input
            label="Primary phone"
            name="primaryPhone"
            defaultValue={settings.primaryPhone}
            error={error("primaryPhone")}
          />
          <Input
            label="Secondary phone"
            name="secondaryPhone"
            defaultValue={settings.secondaryPhone}
            error={error("secondaryPhone")}
          />
          <Input
            label="Primary WhatsApp"
            name="whatsappNumber"
            defaultValue={settings.whatsappNumber}
            hint="Full international format, digits only — e.g. 8801335374437. Every WhatsApp button uses this."
            error={error("whatsappNumber")}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            defaultValue={settings.email}
            error={error("email")}
          />
          <Input
            label="Office hours"
            name="officeHours"
            defaultValue={settings.officeHours}
            error={error("officeHours")}
          />
        </FieldGrid>
      </Panel>

      <Panel title="Address & map">
        <FieldGrid>
          <Input
            label="Address line 1"
            name="addressLine1"
            defaultValue={settings.addressLine1}
            error={error("addressLine1")}
          />
          <Input
            label="Address line 2"
            name="addressLine2"
            defaultValue={settings.addressLine2}
            error={error("addressLine2")}
          />
          <Input
            label="City / area"
            name="city"
            defaultValue={settings.city}
            error={error("city")}
          />
          <Input
            label="Country"
            name="country"
            defaultValue={settings.country}
            error={error("country")}
          />
          <FullWidth>
            <Input
              label="Google Maps link"
              name="googleMapsUrl"
              defaultValue={settings.googleMapsUrl}
              hint="Used by the Location button in the mobile action bar."
              error={error("googleMapsUrl")}
            />
          </FullWidth>
          <FullWidth>
            <Input
              label="Google Maps embed URL"
              name="googleMapsEmbed"
              defaultValue={settings.googleMapsEmbed}
              hint='In Google Maps choose Share → Embed a map, then copy only the src="…" URL. The map appears on the Contact page once this is set.'
              error={error("googleMapsEmbed")}
            />
          </FullWidth>
        </FieldGrid>
      </Panel>

      <Panel title="Social profiles" description="Leave a field empty to hide that link.">
        <FieldGrid>
          <Input
            label="Facebook"
            name="facebookUrl"
            defaultValue={settings.facebookUrl}
            error={error("facebookUrl")}
          />
          <Input
            label="Instagram"
            name="instagramUrl"
            defaultValue={settings.instagramUrl}
            error={error("instagramUrl")}
          />
          <Input
            label="TikTok"
            name="tiktokUrl"
            defaultValue={settings.tiktokUrl}
            error={error("tiktokUrl")}
          />
          <Input
            label="YouTube"
            name="youtubeUrl"
            defaultValue={settings.youtubeUrl}
            error={error("youtubeUrl")}
          />
          <Input
            label="LinkedIn"
            name="linkedinUrl"
            defaultValue={settings.linkedinUrl}
            error={error("linkedinUrl")}
          />
        </FieldGrid>
      </Panel>

      <Panel title="SEO defaults" description="Used on any page that has no override of its own.">
        <FieldGrid>
          <FullWidth>
            <Input
              label="Default title"
              name="defaultSeoTitle"
              defaultValue={settings.defaultSeoTitle}
              error={error("defaultSeoTitle")}
            />
          </FullWidth>
          <FullWidth>
            <Textarea
              label="Default description"
              name="defaultSeoDescription"
              rows={3}
              defaultValue={settings.defaultSeoDescription}
              hint="Aim for 150–160 characters."
              error={error("defaultSeoDescription")}
            />
          </FullWidth>
          <FullWidth>
            <Input
              label="Site URL"
              name="siteUrl"
              defaultValue={settings.siteUrl}
              hint="The public address, with no trailing slash. Used for canonical links and the sitemap."
              error={error("siteUrl")}
            />
          </FullWidth>
          <FullWidth>
            <Toggle
              label="Allow search engines to index this site"
              name="allowIndexing"
              defaultChecked={settings.allowIndexing}
              hint="Switch off for a staging copy. When off, robots.txt blocks everything and the sitemap is emptied."
            />
          </FullWidth>
        </FieldGrid>
      </Panel>

      <Panel
        title="Analytics"
        description="Nothing loads in the visitor's browser until an ID is entered here."
      >
        <FieldGrid>
          <Input
            label="GA4 Measurement ID"
            name="gaMeasurementId"
            defaultValue={settings.gaMeasurementId}
            placeholder="G-XXXXXXXXXX"
            error={error("gaMeasurementId")}
          />
          <Input
            label="Google Tag Manager ID"
            name="gtmContainerId"
            defaultValue={settings.gtmContainerId}
            placeholder="GTM-XXXXXXX"
            error={error("gtmContainerId")}
          />
          <Input
            label="Meta Pixel ID"
            name="metaPixelId"
            defaultValue={settings.metaPixelId}
            placeholder="123456789012345"
            hint="For Facebook and Instagram campaign tracking."
            error={error("metaPixelId")}
          />
        </FieldGrid>
        <p className="field-hint mt-4">
          If a Tag Manager ID is set, GA4 is left to Tag Manager rather than loaded twice.
        </p>
      </Panel>

      <div className="sticky bottom-0 -mx-5 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton>Save settings</SubmitButton>
          <div className="min-w-0 flex-1">
            <FormMessage status={state.status} message={state.message} />
          </div>
        </div>
      </div>
    </form>
  );
}
