import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/page-hero";
import { PageCampaign } from "@/components/site/page-campaign";
import { B2bForm } from "@/components/forms/b2b-form";
import { WhatsAppLink } from "@/components/site/whatsapp-link";
import { Reveal } from "@/components/ui/reveal";
import { Icon, IconArrowRight } from "@/components/ui/icons";
import { getActiveCampaign, getPageSeo } from "@/lib/content";
import { getSettings, telHref } from "@/lib/settings";
import { breadcrumbSchema, buildMetadata, jsonLd } from "@/lib/seo";

export const revalidate = 300;

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "B2B Services", path: "/b2b" },
];

/** Design-owned: the B2B service list is stable and not a CMS collection. */
const SERVICES = [
  {
    icon: "visa",
    title: "B2B Visa Processing",
    description:
      "File preparation, submission support and status follow-up for your clients' applications.",
  },
  {
    icon: "plane",
    title: "Air Ticket Support",
    description: "Fare sourcing and issuance support for domestic and international routes.",
  },
  {
    icon: "hotel",
    title: "Hotel Assistance",
    description: "Worldwide accommodation sourcing at agency terms.",
  },
  {
    icon: "tour",
    title: "Tour Package Support",
    description: "Ready itineraries and ground handling you can sell under your own brand.",
  },
  {
    icon: "compass",
    title: "Custom Travel Solutions",
    description: "Bespoke arrangements for corporate accounts, groups and one-off requirements.",
  },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("b2b");
  return buildMetadata({
    title: seo?.title || "B2B Services",
    description:
      seo?.description ||
      "Partner with DreamFly for professional B2B travel solutions — visa processing, air tickets, hotels and tour package support for travel agencies.",
    path: "/b2b",
    ogTitle: seo?.ogTitle,
    ogDescription: seo?.ogDescription,
    imageUrl: seo?.ogImage?.url,
    canonicalUrl: seo?.canonicalUrl,
    noindex: seo?.noindex,
  });
}

export default async function B2bPage() {
  const [settings, campaign] = await Promise.all([getSettings(), getActiveCampaign("b2b")]);
  const schema = jsonLd(breadcrumbSchema(settings.origin, CRUMBS));

  return (
    <>
      <PageHero
        eyebrow="B2B Services"
        title="Your Travel Business,"
        titleAccent="Our Support."
        description="Partner with DreamFly for professional B2B travel solutions."
        crumbs={CRUMBS}
      />

      <PageCampaign campaign={campaign} />

      <section className="section">
        <div className="container-df">
          <ul className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service, index) => (
              <Reveal
                as="li"
                key={service.title}
                delay={Math.min(index % 3, 3) as 0 | 1 | 2 | 3}
                className="bg-surface p-7 lg:p-8"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-sm border border-line-gold bg-gold-50 text-gold-500"
                  aria-hidden="true"
                >
                  <Icon name={service.icon} width={19} height={19} />
                </span>
                <h2 className="mt-5 text-h3 font-semibold">{service.title}</h2>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-muted">
                  {service.description}
                </p>
              </Reveal>
            ))}

            {/*
              Five services in a three-column grid leave one cell empty on the
              last row. Rather than a dead square, it carries the invitation.
            */}
            <li className="flex flex-col justify-center bg-gold-50 p-7 lg:p-8">
              <h2 className="text-h3 font-semibold">Something else in mind?</h2>
              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-muted">
                Tell us what your agency needs and we'll tell you honestly whether we can support
                it.
              </p>
              <Link href="#partner" className="link-arrow mt-5 text-[0.875rem]">
                Become a partner
                <IconArrowRight width={15} height={15} />
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <section id="partner" className="section scroll-mt-24 border-t border-line bg-surface">
        <div className="container-df">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="eyebrow">Partnership</p>
              <h2 className="mt-5 text-h2 font-semibold">Become a DreamFly B2B Partner</h2>
              <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
                Share a few details about your agency and our B2B team will get in touch to discuss
                terms and how we can support your bookings.
              </p>

              <div className="mt-8 space-y-2">
                <WhatsAppLink
                  number={settings.whatsappDigits}
                  className="btn btn-outline"
                  context={{ kind: "b2b" }}
                >
                  Talk to the B2B Team
                </WhatsAppLink>
                {settings.primaryPhone ? (
                  <p className="text-[0.875rem] text-ink-subtle">
                    or call{" "}
                    <a
                      href={telHref(settings.primaryPhone)}
                      className="inline-flex min-h-[26px] items-center font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {settings.primaryPhone}
                    </a>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="card p-7 sm:p-9">
              <B2bForm whatsappDigits={settings.whatsappDigits} />
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
