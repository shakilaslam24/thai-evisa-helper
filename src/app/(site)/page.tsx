import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { Services } from "@/components/home/services";
import { PopularVisas } from "@/components/home/popular-visas";
import { CampaignBand } from "@/components/home/campaign";
import { WhyDreamFly } from "@/components/home/why";
import { FeaturedTours } from "@/components/home/featured-tours";
import { Testimonials } from "@/components/home/testimonials";
import { FinalCta } from "@/components/home/final-cta";
import {
  getActiveCampaign,
  getFeaturedTours,
  getFeaturedVisas,
  getHero,
  getHomeSections,
  getHomeServices,
  getPageSeo,
  getTestimonials,
  getWhyItems,
} from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";

// Incremental regeneration: pages are served from cache and refreshed in the
// background. Admin mutations call revalidatePath() for immediate updates.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("home");
  return buildMetadata({
    title: seo?.title || undefined,
    description: seo?.description || undefined,
    path: "/",
    ogTitle: seo?.ogTitle,
    ogDescription: seo?.ogDescription,
    imageUrl: seo?.ogImage?.url,
    canonicalUrl: seo?.canonicalUrl,
    noindex: seo?.noindex,
  });
}

export default async function HomePage() {
  const [sections, settings, hero, services, visas, campaign, whyItems, tours, testimonials] =
    await Promise.all([
      getHomeSections(),
      getSettings(),
      getHero(),
      getHomeServices(),
      getFeaturedVisas(8),
      getActiveCampaign(),
      getWhyItems(),
      getFeaturedTours(3),
      getTestimonials(3),
    ]);

  /**
   * Sections render in the order an administrator chose, and only when enabled.
   * The set of section types is fixed by the design system — controlled
   * flexibility, not a free-form page builder (brief §16).
   */
  const render = (key: string) => {
    const meta = sections.get(key);
    if (!meta?.enabled) return null;

    switch (key) {
      case "hero":
        return hero ? (
          <Hero
            key={key}
            {...hero}
            companyName={settings.companyName}
            whatsappDigits={settings.whatsappDigits}
          />
        ) : null;

      case "services":
        return (
          <Services
            key={key}
            heading={meta.heading}
            subheading={meta.subheading}
            services={services}
          />
        );

      case "visas":
        return (
          <PopularVisas
            key={key}
            heading={meta.heading}
            subheading={meta.subheading}
            ctaLabel={meta.ctaLabel}
            destinations={visas}
          />
        );

      case "campaign":
        // Null when nothing is active or in-window — no empty section.
        return campaign ? <CampaignBand key={key} {...campaign} /> : null;

      case "why":
        return (
          <WhyDreamFly
            key={key}
            heading={meta.heading}
            subheading={meta.subheading}
            items={whyItems}
          />
        );

      case "tours":
        return (
          <FeaturedTours
            key={key}
            heading={meta.heading}
            subheading={meta.subheading}
            ctaLabel={meta.ctaLabel}
            tours={tours}
          />
        );

      case "testimonials":
        return (
          <Testimonials
            key={key}
            heading={meta.heading}
            subheading={meta.subheading}
            testimonials={testimonials}
          />
        );

      case "cta":
        return (
          <FinalCta
            key={key}
            heading={meta.heading}
            subheading={meta.subheading}
            whatsappDigits={settings.whatsappDigits}
            primaryPhone={settings.primaryPhone}
          />
        );

      default:
        return null;
    }
  };

  return <>{sections.ordered.map((section) => render(section.key))}</>;
}
