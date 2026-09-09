import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/site/page-hero";
import { ContactForm } from "@/components/forms/contact-form";
import { WhatsAppLink } from "@/components/site/whatsapp-link";
import { IconMail, IconPhone, IconPin, IconWhatsApp } from "@/components/ui/icons";
import { getPageSeo } from "@/lib/content";
import { getSettings, telHref } from "@/lib/settings";
import { breadcrumbSchema, buildMetadata, jsonLd } from "@/lib/seo";

export const revalidate = 300;

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Contact", path: "/contact" },
];

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("contact");
  const settings = await getSettings();
  return buildMetadata({
    title: seo?.title || "Contact",
    description:
      seo?.description ||
      `Call, WhatsApp, email or visit ${settings.companyName} in Gulshan, Dhaka. We reply to every enquiry.`,
    path: "/contact",
    imageUrl: seo?.ogImage?.url,
    canonicalUrl: seo?.canonicalUrl,
    noindex: seo?.noindex,
  });
}

export default async function ContactPage() {
  const settings = await getSettings();
  const schema = jsonLd(breadcrumbSchema(settings.origin, CRUMBS));
  const phones = [settings.primaryPhone, settings.secondaryPhone].filter(Boolean);

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's Talk"
        titleAccent="Travel."
        description="Call us, message us on WhatsApp, or send the form below — whichever suits you. We reply to every enquiry."
        crumbs={CRUMBS}
      />

      <section className="section">
        <div className="container-df">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            {/* Channels */}
            <div>
              <ul className="space-y-px overflow-hidden rounded-md border border-line bg-line">
                {phones.length > 0 ? (
                  <ContactRow
                    icon={<IconPhone width={19} height={19} />}
                    label="Call Us"
                    className="bg-surface"
                  >
                    <ul className="space-y-1">
                      {phones.map((phone) => (
                        <li key={phone}>
                          <a
                            href={telHref(phone)}
                            className="inline-flex min-h-[28px] items-center font-display text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink underline-offset-4 hover:text-gold-600 hover:underline"
                          >
                            {phone}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </ContactRow>
                ) : null}

                {settings.whatsappDigits ? (
                  <ContactRow
                    icon={<IconWhatsApp width={19} height={19} />}
                    label="WhatsApp Us"
                    className="bg-surface"
                  >
                    <WhatsAppLink
                      number={settings.whatsappDigits}
                      className="link-arrow"
                      showIcon={false}
                      context={{ kind: "general" }}
                    >
                      Start a conversation
                    </WhatsAppLink>
                  </ContactRow>
                ) : null}

                {settings.email ? (
                  <ContactRow
                    icon={<IconMail width={19} height={19} />}
                    label="Email Us"
                    className="bg-surface"
                  >
                    <a
                      href={`mailto:${settings.email}`}
                      className="inline-flex min-h-[28px] items-center break-all font-display text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink underline-offset-4 hover:text-gold-600 hover:underline"
                    >
                      {settings.email}
                    </a>
                  </ContactRow>
                ) : null}

                {settings.addressLines.length > 0 ? (
                  <ContactRow
                    icon={<IconPin width={19} height={19} />}
                    label="Visit Our Office"
                    className="bg-surface"
                  >
                    <address className="not-italic text-[0.9375rem] leading-relaxed text-ink-muted">
                      {settings.addressLines.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </address>
                    {settings.officeHours ? (
                      <p className="mt-2 text-[0.875rem] text-ink-subtle">{settings.officeHours}</p>
                    ) : null}
                    {settings.googleMapsUrl ? (
                      <a
                        href={settings.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-arrow mt-3 text-[0.875rem]"
                      >
                        Open in Google Maps
                      </a>
                    ) : null}
                  </ContactRow>
                ) : null}
              </ul>
            </div>

            {/* Form */}
            <div className="card p-7 sm:p-9">
              <h2 className="text-h3 font-semibold">Send us a message</h2>
              <p className="mt-2 text-[0.9375rem] text-ink-muted">
                Tell us what you need and we'll get back to you.
              </p>
              <div className="mt-7">
                <Suspense fallback={<div className="h-[28rem]" aria-hidden="true" />}>
                  <ContactForm whatsappDigits={settings.whatsappDigits} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map — only when an administrator has supplied an embed URL */}
      {settings.googleMapsEmbed ? (
        <section aria-label="Office location">
          <div className="h-[22rem] w-full border-t border-line sm:h-[26rem]">
            <iframe
              src={settings.googleMapsEmbed}
              title={`${settings.companyName} office location`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-scripts allow-same-origin allow-popups"
              className="h-full w-full border-0"
            />
          </div>
        </section>
      ) : null}

      {schema ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
      ) : null}
    </>
  );
}

function ContactRow({
  icon,
  label,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <li className={`flex gap-5 p-6 ${className}`}>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-line-gold bg-gold-50 text-gold-500"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
          {label}
        </h2>
        <div className="mt-2">{children}</div>
      </div>
    </li>
  );
}
