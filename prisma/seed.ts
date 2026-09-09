/**
 * Seed data.
 *
 * Two clearly separated kinds of data:
 *
 *   REAL   — supplied by DreamFly (contact details, address, the copy in the
 *            brief). Written as live content.
 *   SAMPLE — structural examples so an administrator can see how a visa page or
 *            tour package is put together. Every sample row is created with
 *            `isPlaceholder: true` and `status: "draft"`, which means the public
 *            site will NOT render it under any circumstance. Nothing here
 *            invents a fee, a processing time, a review or a statistic.
 *
 * The script is idempotent: re-running it will not duplicate rows.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./data/dreamfly.db";
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

/* -------------------------------------------------------------------------
 * REAL — supplied by DreamFly
 * ---------------------------------------------------------------------- */
const BUSINESS = {
  companyName: "DreamFly Consultancy",
  tagline: "Fly Beyond Your Dreams",
  primaryPhone: "01335374437",
  secondaryPhone: "01335374438",
  whatsappNumber: "8801335374437",
  email: "dreamflyhelp@gmail.com",
  addressLine1: "Fatema Villa, Lift-2, Flat-3B",
  addressLine2: "House #104, Road #10/2, Block D",
  city: "Niketan, Gulshan-1, Dhaka",
  country: "Bangladesh",
  siteUrl: "https://www.dreamflyconsultancy.com",
} as const;

const HOME_SECTIONS = [
  {
    key: "hero",
    label: "Hero",
    sortOrder: 0,
    heading: "",
    subheading: "",
    ctaLabel: "",
    ctaHref: "",
  },
  {
    key: "services",
    label: "Core Services",
    sortOrder: 1,
    heading: "Everything you need, handled properly.",
    subheading: "Four services, one team — from your first question to your departure.",
    ctaLabel: "",
    ctaHref: "",
  },
  {
    key: "visas",
    label: "Popular Visa Destinations",
    sortOrder: 2,
    heading: "Popular Visa Destinations",
    subheading: "Explore visa information for your next destination.",
    ctaLabel: "View All Destinations",
    ctaHref: "/visa",
  },
  {
    key: "campaign",
    label: "Campaign",
    sortOrder: 3,
    heading: "",
    subheading: "",
    ctaLabel: "",
    ctaHref: "",
  },
  {
    key: "why",
    label: "Why DreamFly",
    sortOrder: 4,
    heading: "A calmer way to travel.",
    subheading: "We keep the process clear, the advice honest and the paperwork moving.",
    ctaLabel: "",
    ctaHref: "",
  },
  {
    key: "tours",
    label: "Featured Tours",
    sortOrder: 5,
    heading: "Featured Tour Experiences",
    subheading: "A selection of journeys our team is currently arranging.",
    ctaLabel: "View All Packages",
    ctaHref: "/tours",
  },
  {
    key: "testimonials",
    label: "Reviews",
    sortOrder: 6,
    heading: "What our clients say",
    subheading: "",
    ctaLabel: "",
    ctaHref: "",
  },
  {
    key: "cta",
    label: "Final CTA",
    sortOrder: 7,
    heading: "Ready to Plan Your Next Journey?",
    subheading: "Whether it's a visa, tour, flight or hotel, our team is ready to assist.",
    ctaLabel: "",
    ctaHref: "",
  },
] as const;

const SERVICES = [
  {
    title: "Visa Services",
    description:
      "Guidance, document preparation and submission support for tourist, business and visit visas.",
    icon: "visa",
    href: "/visa",
  },
  {
    title: "Tour Packages",
    description:
      "Group, private and fully customised itineraries built around your dates and budget.",
    icon: "tour",
    href: "/tours",
  },
  {
    title: "Air Ticket & Hotel",
    description: "Assisted fare quotations and worldwide hotel booking, handled by a real person.",
    icon: "plane",
    href: "/air-ticket-hotel",
  },
  {
    title: "B2B Services",
    description: "Reliable back-office support for agencies — visas, tickets, hotels and packages.",
    icon: "b2b",
    href: "/b2b",
  },
] as const;

const WHY_ITEMS = [
  {
    title: "Professional Guidance",
    description:
      "Clear advice on what each embassy asks for, so you apply with the right documents the first time.",
    icon: "compass",
  },
  {
    title: "Transparent Service",
    description: "Our service charge is explained before you commit. No surprises later.",
    icon: "shield",
  },
  {
    title: "Personalized Support",
    description: "One point of contact who knows your file, reachable on the phone or on WhatsApp.",
    icon: "users",
  },
  {
    title: "Complete Travel Assistance",
    description: "Visa, flight, hotel and itinerary arranged together rather than piece by piece.",
    icon: "sparkle",
  },
] as const;

/* -------------------------------------------------------------------------
 * SAMPLE — structural examples only. Never published, never public.
 * ---------------------------------------------------------------------- */
const SAMPLE_VISA_COUNTRIES = [
  { countryName: "China", slug: "china", countryCode: "CN" },
  { countryName: "Japan", slug: "japan", countryCode: "JP" },
  { countryName: "South Korea", slug: "south-korea", countryCode: "KR" },
  { countryName: "Thailand", slug: "thailand", countryCode: "TH" },
  { countryName: "Malaysia", slug: "malaysia", countryCode: "MY" },
  { countryName: "Singapore", slug: "singapore", countryCode: "SG" },
  { countryName: "Hong Kong", slug: "hong-kong", countryCode: "HK" },
  { countryName: "Philippines", slug: "philippines", countryCode: "PH" },
  { countryName: "Mongolia", slug: "mongolia", countryCode: "MN" },
] as const;

const PLACEHOLDER_NOTE =
  "SAMPLE CONTENT — replace with DreamFly's real information before publishing.";

async function main() {
  // --- Global settings ----------------------------------------------------
  await db.globalSettings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      ...BUSINESS,
      officeHours: "",
      footerText:
        "Visa assistance, tour packages, air tickets and hotel booking from our office in Gulshan, Dhaka.",
      defaultSeoTitle: `${BUSINESS.companyName} — Visa & Travel Solutions in Dhaka`,
      defaultSeoDescription:
        "Professional visa assistance, customized tours, air tickets, hotel booking and B2B travel solutions from DreamFly Consultancy, Gulshan, Dhaka.",
      googleMapsUrl: "",
      googleMapsEmbed: "",
    },
  });

  // --- Homepage structure -------------------------------------------------
  for (const section of HOME_SECTIONS) {
    await db.homeSection.upsert({
      where: { key: section.key },
      update: {},
      create: { ...section },
    });
  }

  await db.homeHero.upsert({
    where: { id: "hero" },
    update: {},
    create: {
      id: "hero",
      eyebrow: "DreamFly Consultancy",
      headline: "Visa & Travel Solutions,",
      headlineAccent: "Made Simple.",
      description:
        "Professional visa assistance, customized tours, air tickets, hotel booking and B2B travel solutions.",
      brandLine: BUSINESS.tagline,
      primaryCtaLabel: "Explore Visa Services",
      primaryCtaHref: "/visa",
      secondaryCtaLabel: "WhatsApp Us",
      secondaryCtaHref: "",
    },
  });

  if ((await db.homeService.count()) === 0) {
    await db.homeService.createMany({
      data: SERVICES.map((service, index) => ({ ...service, sortOrder: index })),
    });
  }

  if ((await db.homeWhyItem.count()) === 0) {
    await db.homeWhyItem.createMany({
      data: WHY_ITEMS.map((item, index) => ({ ...item, sortOrder: index })),
    });
  }

  await db.aboutPage.upsert({
    where: { id: "about" },
    update: {},
    create: {
      id: "about",
      heroHeading: "About DreamFly Consultancy",
      heroSubheading: "",
      whoWeAre: "",
      mission: "",
      vision: "",
      approach: "",
      galleryHeading: "Our Office",
      teamHeading: "Our Team",
    },
  });

  // --- Per-page SEO rows (empty overrides, ready to fill) -----------------
  for (const pageKey of ["home", "visa", "tours", "air-ticket-hotel", "b2b", "about", "contact"]) {
    await db.pageSeo.upsert({ where: { pageKey }, update: {}, create: { pageKey } });
  }

  // --- SAMPLE visa destinations ------------------------------------------
  for (const [index, country] of SAMPLE_VISA_COUNTRIES.entries()) {
    const existing = await db.visaDestination.findUnique({ where: { slug: country.slug } });
    if (existing) continue;

    await db.visaDestination.create({
      data: {
        ...country,
        // Deliberately blank: fees, processing times and requirements are
        // business facts that must come from DreamFly, never from a seed.
        intro: "",
        processingTime: "",
        serviceCharge: "",
        embassyFee: "",
        otherCharges: "",
        eligibility: "",
        applicationProcess: "",
        importantNotes: PLACEHOLDER_NOTE,
        categories: "tourist,business",
        visaFormats: "",
        entryTypes: "",
        featured: index < 8,
        featuredOrder: index,
        status: "draft",
        isPlaceholder: true,
      },
    });
  }

  // --- SAMPLE tour package ------------------------------------------------
  if (!(await db.tourPackage.findUnique({ where: { slug: "sample-tour-package" } }))) {
    await db.tourPackage.create({
      data: {
        name: "Sample Tour Package",
        slug: "sample-tour-package",
        destination: "",
        country: "",
        shortDescription: "",
        duration: "",
        packageType: "group",
        startingPrice: "",
        currency: "BDT",
        importantNotes: PLACEHOLDER_NOTE,
        status: "draft",
        isPlaceholder: true,
        itinerary: {
          create: [{ dayLabel: "Day 1", title: "Arrival", body: "", sortOrder: 0 }],
        },
        listItems: {
          create: [
            { kind: "include", label: "Example inclusion", sortOrder: 0 },
            { kind: "exclude", label: "Example exclusion", sortOrder: 0 },
          ],
        },
      },
    });
  }

  console.log("Seed complete.");
  console.log("  Real data:   Global Settings, homepage structure, services, why-items.");
  console.log(`  Sample data: ${SAMPLE_VISA_COUNTRIES.length} visa destinations + 1 tour package`);
  console.log("               (draft + placeholder — invisible on the public site).");
  console.log("\nNext: create an admin user with `npm run admin:create`.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
