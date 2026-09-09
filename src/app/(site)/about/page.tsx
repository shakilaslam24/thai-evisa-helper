import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { MediaImage } from "@/components/ui/media-image";
import { Reveal } from "@/components/ui/reveal";
import { WhatsAppLink } from "@/components/site/whatsapp-link";
import { getAboutPage, getPageSeo } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { breadcrumbSchema, buildMetadata, jsonLd } from "@/lib/seo";
import { paragraphs } from "@/lib/format";

export const revalidate = 300;

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
];

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("about");
  return buildMetadata({
    title: seo?.title || "About",
    description:
      seo?.description ||
      "DreamFly Consultancy is a travel and visa consultancy based in Gulshan, Dhaka.",
    path: "/about",
    imageUrl: seo?.ogImage?.url,
    canonicalUrl: seo?.canonicalUrl,
    noindex: seo?.noindex,
  });
}

export default async function AboutPage() {
  const [{ page, gallery, team, milestones }, settings] = await Promise.all([
    getAboutPage(),
    getSettings(),
  ]);
  const schema = jsonLd(breadcrumbSchema(settings.origin, CRUMBS));

  const statements = [
    { title: "Our Mission", body: page?.mission ?? "" },
    { title: "Our Vision", body: page?.vision ?? "" },
    { title: "Our Approach", body: page?.approach ?? "" },
  ].filter((item) => item.body.trim());

  return (
    <>
      <PageHero
        eyebrow="About Us"
        title={page?.heroHeading || `About ${settings.companyName}`}
        crumbs={CRUMBS}
        description={page?.heroSubheading || undefined}
      />

      {/* Who we are */}
      {page?.whoWeAre?.trim() ? (
        <section className="section">
          <div className="container-df">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
              <div>
                <p className="eyebrow">Who We Are</p>
                <hr className="hairline-gold mt-6" />
              </div>
              <div className="prose-df max-w-2xl text-[1.0625rem] leading-relaxed">
                {paragraphs(page.whoWeAre).map((block, index) => (
                  <p key={index}>{block}</p>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Mission / Vision / Approach */}
      {statements.length > 0 ? (
        <section className="section-sm border-y border-line bg-surface">
          <div className="container-df">
            <ul className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3">
              {statements.map((statement, index) => (
                <Reveal
                  as="li"
                  key={statement.title}
                  delay={Math.min(index, 3) as 0 | 1 | 2 | 3}
                  className="bg-surface p-7 lg:p-9"
                >
                  <h2 className="text-h3 font-semibold">{statement.title}</h2>
                  <div className="prose-df mt-4 text-[0.9375rem] leading-relaxed">
                    {paragraphs(statement.body).map((block, blockIndex) => (
                      <p key={blockIndex}>{block}</p>
                    ))}
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Milestones — only ever what an administrator has entered */}
      {milestones.length > 0 ? (
        <section className="section-sm">
          <div className="container-df">
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {milestones.map((milestone) => (
                <li key={milestone.id} className="border-t-2 border-gold-400 pt-5">
                  <p className="font-display text-h2 font-semibold text-navy-900">
                    {milestone.value}
                  </p>
                  <p className="mt-1 text-[0.875rem] text-ink-muted">{milestone.label}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Office gallery */}
      {gallery.length > 0 ? (
        <section className="section-sm">
          <div className="container-df">
            <h2 className="text-h2 font-semibold">{page?.galleryHeading || "Our Office"}</h2>
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {gallery.map((item, index) => (
                <li key={item.id} className="relative aspect-[4/3] overflow-hidden rounded-md">
                  <MediaImage
                    media={item.media}
                    alt={item.caption || `${settings.companyName} office`}
                    seed={index}
                    sizes="(max-width: 640px) 46vw, 30vw"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Team */}
      {team.length > 0 ? (
        <section className="section-sm">
          <div className="container-df">
            <h2 className="text-h2 font-semibold">{page?.teamHeading || "Our Team"}</h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((member, index) => (
                <li key={member.id}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-navy-900">
                    <MediaImage
                      media={member.photo}
                      alt={member.name}
                      seed={index}
                      sizes="(max-width: 640px) 46vw, 24vw"
                    />
                  </div>
                  <h3 className="mt-4 font-display text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink">
                    {member.name}
                  </h3>
                  {member.role ? (
                    <p className="text-[0.875rem] text-gold-600">{member.role}</p>
                  ) : null}
                  {member.bio ? (
                    <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-muted">
                      {member.bio}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Contact invitation — always present, so the page never dead-ends */}
      <section className="section-sm">
        <div className="container-df">
          <div className="rounded-lg border border-line bg-surface p-8 sm:p-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
              <div className="max-w-xl">
                <h2 className="text-h3 font-semibold">Come and see us in Gulshan.</h2>
                {settings.addressText ? (
                  <address className="mt-3 not-italic text-[0.9375rem] leading-relaxed text-ink-muted">
                    {settings.addressLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                ) : null}
              </div>
              <WhatsAppLink
                number={settings.whatsappDigits}
                className="btn btn-primary shrink-0"
                context={{ kind: "general" }}
              >
                Message Us
              </WhatsAppLink>
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
