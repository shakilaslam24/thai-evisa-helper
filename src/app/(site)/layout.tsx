import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { MobileActionBar } from "@/components/site/mobile-action-bar";
import { getSettings } from "@/lib/settings";
import { getAnnouncement } from "@/lib/content";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { jsonLd, organizationSchema } from "@/lib/seo";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, announcement] = await Promise.all([getSettings(), getAnnouncement()]);
  const schema = jsonLd(await organizationSchema());

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {announcement ? (
        <AnnouncementBar
          headline={announcement.headline || announcement.name}
          ctaLabel={announcement.ctaLabel}
          ctaHref={announcement.ctaHref}
        />
      ) : null}

      <SiteHeader
        companyName={settings.companyName}
        logoLightUrl={settings.logoLightUrl}
        whatsappDigits={settings.whatsappDigits}
        primaryPhone={settings.primaryPhone}
        headerPhones={settings.headerPhones}
      />

      <main id="main">{children}</main>

      <SiteFooter settings={settings} />

      <MobileActionBar
        primaryPhone={settings.mobileBarPhones[0]?.number ?? settings.primaryPhone}
        whatsappDigits={settings.whatsappDigits}
        mapsUrl={settings.googleMapsUrl}
      />

      {schema ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      ) : null}
    </>
  );
}
