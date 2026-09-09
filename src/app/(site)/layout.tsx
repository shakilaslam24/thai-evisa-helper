import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { MobileActionBar } from "@/components/site/mobile-action-bar";
import { getSettings } from "@/lib/settings";
import { jsonLd, organizationSchema } from "@/lib/seo";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const schema = jsonLd(await organizationSchema());

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <SiteHeader
        companyName={settings.companyName}
        logoLightUrl={settings.logoLightUrl}
        whatsappDigits={settings.whatsappDigits}
        primaryPhone={settings.primaryPhone}
      />

      <main id="main">{children}</main>

      <SiteFooter settings={settings} />

      <MobileActionBar
        primaryPhone={settings.primaryPhone}
        whatsappDigits={settings.whatsappDigits}
        mapsUrl={settings.googleMapsUrl}
      />

      {schema ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      ) : null}
    </>
  );
}
