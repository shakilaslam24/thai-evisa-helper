import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { AirTicketForm } from "@/components/forms/air-ticket-form";
import { HotelForm } from "@/components/forms/hotel-form";
import { WhatsAppLink } from "@/components/site/whatsapp-link";
import { getPageSeo } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { breadcrumbSchema, buildMetadata, jsonLd } from "@/lib/seo";
import { IconHotel, IconPlane } from "@/components/ui/icons";

export const revalidate = 300;

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Air Ticket & Hotel", path: "/air-ticket-hotel" },
];

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("air-ticket-hotel");
  return buildMetadata({
    title: seo?.title || "Air Ticket & Hotel",
    description:
      seo?.description ||
      "Domestic and international air ticket assistance and worldwide hotel booking. Send us your route and dates and we'll come back with options.",
    path: "/air-ticket-hotel",
    ogTitle: seo?.ogTitle,
    ogDescription: seo?.ogDescription,
    imageUrl: seo?.ogImage?.url,
    canonicalUrl: seo?.canonicalUrl,
    noindex: seo?.noindex,
  });
}

export default async function AirTicketHotelPage() {
  const settings = await getSettings();
  const schema = jsonLd(breadcrumbSchema(settings.origin, CRUMBS));

  return (
    <>
      <PageHero
        eyebrow="Air Ticket & Hotel"
        title="Tell us the route."
        titleAccent="We'll do the rest."
        description="We don't run an automated booking engine — a consultant prices your trip by hand and sends you real options."
        crumbs={CRUMBS}
      />

      {/* Air ticket */}
      <section id="air-ticket" className="section scroll-mt-24">
        <div className="container-df">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-sm border border-line-gold bg-gold-50 text-gold-500"
                aria-hidden="true"
              >
                <IconPlane width={21} height={21} />
              </span>
              <p className="eyebrow mt-6">Air Ticket</p>
              <h2 className="mt-5 text-h2 font-semibold">
                Fly <span className="accent">Anywhere.</span>
              </h2>
              <p className="lead mt-4">Domestic & International Air Ticket Assistance</p>
              <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
                Send your route, dates and passenger count. We'll check fares across airlines and
                come back with the options that actually suit you.
              </p>

              <div className="mt-8">
                <WhatsAppLink
                  number={settings.whatsappDigits}
                  className="btn btn-outline"
                  context={{ kind: "air_ticket" }}
                >
                  Ask on WhatsApp
                </WhatsAppLink>
              </div>
            </div>

            <div className="card p-7 sm:p-9">
              <AirTicketForm whatsappDigits={settings.whatsappDigits} />
            </div>
          </div>
        </div>
      </section>

      {/* Hotel */}
      <section id="hotel" className="section scroll-mt-24 border-t border-line bg-surface">
        <div className="container-df">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-sm border border-line-gold bg-gold-50 text-gold-500"
                aria-hidden="true"
              >
                <IconHotel width={21} height={21} />
              </span>
              <p className="eyebrow mt-6">Hotel Booking</p>
              <h2 className="mt-5 text-h2 font-semibold">
                Stay <span className="accent">Your Way.</span>
              </h2>
              <p className="lead mt-4">Worldwide Hotel Booking Assistance</p>
              <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
                Tell us the city, your dates and roughly what you'd like to spend. We'll send you a
                shortlist rather than a thousand results.
              </p>

              <div className="mt-8">
                <WhatsAppLink
                  number={settings.whatsappDigits}
                  className="btn btn-outline"
                  context={{ kind: "hotel" }}
                >
                  Ask on WhatsApp
                </WhatsAppLink>
              </div>
            </div>

            <div className="card p-7 sm:p-9">
              <HotelForm whatsappDigits={settings.whatsappDigits} />
            </div>
          </div>
        </div>
      </section>

      {schema ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      ) : null}
    </>
  );
}
