import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/site/page-hero";
import { FaqList } from "@/components/site/faq-list";
import { WhatsAppLink } from "@/components/site/whatsapp-link";
import { MediaImage } from "@/components/ui/media-image";
import { QuickEnquiryForm } from "@/components/forms/quick-enquiry-form";
import {
  ChecklistBlock,
  DetailSection,
  FactTable,
  NoticeBlock,
  ProseBlock,
  StepsBlock,
} from "@/components/site/detail-blocks";
import { getVisaBySlug } from "@/lib/content";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { breadcrumbSchema, buildMetadata, faqSchema, jsonLd } from "@/lib/seo";
import { flagEmoji, paragraphs } from "@/lib/format";
import { ENTRY_TYPES, VISA_CATEGORIES, VISA_FORMATS, labelsFor } from "@/lib/list";
import { IconClock, IconDocument, IconPhone, IconVisa } from "@/components/ui/icons";
import { telHref } from "@/lib/settings";

export const revalidate = 300;
export const dynamicParams = true;

/** Pre-render every published destination at build time. */
export async function generateStaticParams() {
  const rows = await db.visaDestination.findMany({
    where: { status: "published", isPlaceholder: false },
    select: { slug: true },
  });
  return rows.map((row) => ({ slug: row.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const visa = await getVisaBySlug(slug);
  if (!visa) return buildMetadata({ title: "Not found", noindex: true });

  return buildMetadata({
    title: visa.seoTitle || `${visa.countryName} Visa`,
    description:
      visa.seoDescription ||
      (visa.intro
        ? visa.intro.slice(0, 180)
        : `Visa information and assistance for ${visa.countryName}.`),
    path: `/visa/${visa.slug}`,
    ogTitle: visa.ogTitle,
    ogDescription: visa.ogDescription,
    imageUrl: visa.ogImage?.url ?? visa.coverImage?.url,
    canonicalUrl: visa.canonicalUrl,
    noindex: visa.noindex,
    type: "article",
  });
}

export default async function VisaDetailPage({ params }: Props) {
  const { slug } = await params;
  const [visa, settings] = await Promise.all([getVisaBySlug(slug), getSettings()]);
  if (!visa) notFound();

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Visa Services", path: "/visa" },
    { name: visa.countryName, path: `/visa/${visa.slug}` },
  ];

  const facts: Array<[string, string]> = [
    ["Visa Categories", labelsFor(VISA_CATEGORIES, visa.categories).join(", ")],
    ["Visa Format", labelsFor(VISA_FORMATS, visa.visaFormats).join(", ")],
    ["Entry Type", labelsFor(ENTRY_TYPES, visa.entryTypes).join(", ")],
    ["Processing Time", visa.processingTime],
  ];

  const fees: Array<[string, string]> = [
    ["DreamFly Service Charge", visa.serviceCharge],
    ["Embassy / Government Fee", visa.embassyFee],
    ["Other Charges", visa.otherCharges],
  ];

  const schemas = [
    jsonLd(breadcrumbSchema(settings.origin, crumbs)),
    jsonLd(faqSchema(visa.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })))),
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHero
        eyebrow="Visa Services"
        title={`${visa.countryName} Visa`}
        crumbs={crumbs}
        description={visa.intro ? paragraphs(visa.intro)[0] : undefined}
      >
        <div className="mt-8 flex flex-wrap items-center gap-2.5">
          {flagEmoji(visa.countryCode) ? (
            <span className="badge border-white/15 bg-white/10 text-white/85">
              <span aria-hidden="true">{flagEmoji(visa.countryCode)}</span>
              {visa.countryName}
            </span>
          ) : null}
          {visa.processingTime ? (
            <span className="badge border-white/15 bg-white/10 text-white/85">
              <IconClock width={14} height={14} className="text-gold-200" />
              {visa.processingTime}
            </span>
          ) : null}
          {labelsFor(VISA_FORMATS, visa.visaFormats).map((label) => (
            <span key={label} className="badge border-white/15 bg-white/10 text-white/85">
              <IconVisa width={14} height={14} className="text-gold-200" />
              {label}
            </span>
          ))}
        </div>
      </PageHero>

      <div className="section">
        <div className="container-df">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-16">
            {/* Content */}
            <div className="min-w-0 space-y-10">
              {visa.coverImage ? (
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                  <MediaImage
                    media={visa.coverImage}
                    alt={`${visa.countryName} visa services`}
                    sizes="(max-width: 1024px) 92vw, 60vw"
                    priority
                  />
                </div>
              ) : null}

              {paragraphs(visa.intro).length > 1 ? (
                <ProseBlock title="Overview" text={paragraphs(visa.intro).slice(1).join("\n\n")} />
              ) : null}

              <FactTable title="At a Glance" rows={facts} id="details" />

              <FactTable
                title="Fees"
                rows={fees}
                id="fees"
                note={
                  visa.feeNote ||
                  "Embassy and government fees are set by the relevant authority and may change without notice."
                }
              />

              {visa.documents.length > 0 ? (
                <DetailSection id="documents" title="Required Documents">
                  <ul className="grid max-w-3xl gap-2.5 sm:grid-cols-2">
                    {visa.documents.map((document) => (
                      <li
                        key={document.id}
                        className="flex items-start gap-2.5 rounded-sm border border-line bg-surface px-4 py-3"
                      >
                        <IconDocument
                          width={17}
                          height={17}
                          className="mt-0.5 shrink-0 text-gold-500"
                          aria-hidden="true"
                        />
                        <span className="text-[0.9375rem] leading-relaxed">
                          {document.label}
                          {document.note ? (
                            <span className="mt-0.5 block text-[0.8125rem] text-ink-subtle">
                              {document.note}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              ) : null}

              <ChecklistBlock title="Who Can Apply" text={visa.eligibility} id="eligibility" />
              <StepsBlock title="Application Process" text={visa.applicationProcess} id="process" />
              <NoticeBlock title="Important Notes" text={visa.importantNotes} />

              {visa.faqs.length > 0 ? (
                <DetailSection id="faq" title="Frequently Asked Questions">
                  <FaqList faqs={visa.faqs} />
                </DetailSection>
              ) : null}

              {visa.gallery.length > 0 ? (
                <DetailSection title="Gallery">
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {visa.gallery.map((item, index) => (
                      <li
                        key={item.id}
                        className="relative aspect-[4/3] overflow-hidden rounded-sm"
                      >
                        <MediaImage
                          media={item.media}
                          alt={`${visa.countryName} — image ${index + 1}`}
                          sizes="(max-width: 640px) 46vw, 30vw"
                        />
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              ) : null}

              <p className="border-t border-line pt-8 text-[0.8125rem] leading-relaxed text-ink-subtle">
                DreamFly Consultancy provides application assistance only. The decision on any visa
                application rests entirely with the relevant embassy or immigration authority.
              </p>
            </div>

            {/* Sticky enquiry rail */}
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="card p-6">
                <h2 className="text-h3 font-semibold">Enquire about the {visa.countryName} visa</h2>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-muted">
                  Send your details and our team will confirm the requirements for your case.
                </p>

                <div className="mt-6">
                  <QuickEnquiryForm
                    type="visa"
                    service="Visa Service"
                    destination={visa.countryName}
                    whatsappDigits={settings.whatsappDigits}
                    submitLabel="Send Enquiry"
                    messagePlaceholder={`Your travel dates, purpose of travel, or any question about the ${visa.countryName} visa.`}
                  />
                </div>

                <div className="mt-6 space-y-2 border-t border-line pt-6">
                  <WhatsAppLink
                    number={settings.whatsappDigits}
                    className="btn btn-outline btn-block"
                    context={{
                      kind: "visa",
                      country: visa.countryName,
                      custom: visa.whatsappMessage,
                    }}
                  >
                    WhatsApp Us
                  </WhatsAppLink>

                  {settings.primaryPhone ? (
                    <a href={telHref(settings.primaryPhone)} className="btn btn-ghost btn-block">
                      <IconPhone width={16} height={16} />
                      {settings.primaryPhone}
                    </a>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schema }}
        />
      ))}
    </>
  );
}
