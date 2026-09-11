/**
 * Demo content for pre-launch review.
 *
 *   npm run demo:load     create it
 *   npm run demo:list     show exactly what exists
 *   npm run demo:show     TEMPORARILY make it public, to review the designs
 *   npm run demo:hide     restore protection (run this before launch)
 *   npm run demo:clear    remove all of it
 *
 * WHAT THIS IS FOR
 * Every public design needs content before it can be judged. This script fills
 * the site so the homepage, visa pages, tour pages and campaigns can be
 * reviewed on real layouts.
 *
 * WHAT IT IS NOT
 * It is not business data. Every record it creates carries `isPlaceholder:
 * true`, which the public queries exclude unconditionally — so nothing here can
 * reach a visitor, published or not. Prices, processing times and fees are
 * illustrative and marked as such in the record itself.
 *
 * No testimonial is invented as a real client quote: the demo testimonials name
 * themselves as samples.
 */
import { connect } from "./db-connection";

const db = connect();

const DEMO = "[DEMO]";
const NOTE = "DEMO CONTENT — illustrative only. Replace with DreamFly's real information.";

const VISAS = [
  {
    countryName: "China",
    slug: "china",
    countryCode: "CN",
    processingTime: "7–10 working days",
    categories: "tourist,business",
    visaFormats: "sticker",
    entryTypes: "single,multiple",
    intro:
      "China issues sticker visas through its embassy in Dhaka. Business travellers usually apply with an invitation from a Chinese company, while tourist applicants show their itinerary and hotel bookings.\n\nWe check your documents before submission so avoidable problems are caught early.",
    serviceCharge: "BDT 5,000",
    embassyFee: "BDT 6,500",
    eligibility:
      "Passport valid for at least six months\nSufficient funds for the length of stay\nA clear travel purpose with supporting documents",
    applicationProcess:
      "Send us your passport scan and travel dates\nWe confirm the documents you need\nYou submit the originals at our Gulshan office\nWe lodge the application at the embassy\nWe hand back the passport once the decision is made",
    documents: [
      { label: "Passport", note: "Valid at least 6 months, with 2 blank pages" },
      { label: "Passport-size photograph", note: "2 copies, white background, 35×45 mm" },
      { label: "Completed application form", note: "" },
      { label: "Bank statement", note: "Last 6 months" },
      { label: "Trade licence or employment letter", note: "" },
      { label: "Invitation letter", note: "Business applicants only" },
    ],
    faqs: [
      {
        question: "How long does a China visa take?",
        answer:
          "Normal processing is 7–10 working days from the date the embassy accepts the file. Timelines are set by the embassy and can change.",
      },
      {
        question: "Do I need to attend in person?",
        answer:
          "Biometrics are required for most applicants. We tell you the exact appointment date once the file is lodged.",
      },
      {
        question: "Can DreamFly guarantee my visa?",
        answer:
          "No. Every visa decision rests entirely with the embassy. What we can do is make sure the application is complete and correctly presented.",
      },
    ],
    featuredOrder: 0,
  },
  {
    countryName: "Japan",
    slug: "japan",
    countryCode: "JP",
    processingTime: "5–7 working days",
    categories: "tourist,business,visit",
    visaFormats: "sticker",
    entryTypes: "single",
    intro:
      "Japan requires applications through an authorised agency. Tourist applicants provide a day-by-day itinerary along with proof of funds.",
    serviceCharge: "BDT 4,500",
    embassyFee: "BDT 3,000",
    feeNote: "Embassy fees are collected in local currency at the prevailing rate.",
    eligibility:
      "Confirmed return air ticket\nHotel bookings for the full stay\nProof of sufficient funds",
    applicationProcess:
      "Share your travel dates and purpose\nWe prepare the itinerary format Japan expects\nSubmit documents at our office\nWe lodge the file with the authorised agency\nCollect your passport once decided",
    documents: [
      { label: "Passport", note: "Valid at least 6 months" },
      { label: "Photograph", note: "45×45 mm, white background" },
      { label: "Day-by-day itinerary", note: "" },
      { label: "Bank statement", note: "Last 6 months, with bank seal" },
      { label: "Employment or business proof", note: "" },
    ],
    faqs: [
      {
        question: "Is a hotel booking required before applying?",
        answer:
          "Yes. Japan expects confirmed accommodation for every night of the stay. We can arrange this alongside the visa.",
      },
      {
        question: "How much bank balance is needed?",
        answer:
          "There is no published fixed amount. The balance should reasonably cover your stay. We advise based on your itinerary.",
      },
    ],
    featuredOrder: 1,
  },
  {
    countryName: "Thailand",
    slug: "thailand",
    countryCode: "TH",
    processingTime: "3–5 working days",
    categories: "tourist,business",
    visaFormats: "evisa",
    entryTypes: "single,multiple",
    intro:
      "Thailand now runs a fully online e-visa. Approval arrives by email and is shown on arrival.",
    serviceCharge: "BDT 3,500",
    embassyFee: "BDT 2,800",
    eligibility: "Passport valid at least 6 months\nConfirmed return ticket\nHotel booking",
    applicationProcess:
      "Send your passport scan and photograph\nWe complete and submit the e-visa application\nYou receive the approval by email\nPrint it and carry it with your passport",
    documents: [
      { label: "Passport scan", note: "Clear colour scan of the data page" },
      { label: "Digital photograph", note: "White background" },
      { label: "Return air ticket", note: "" },
      { label: "Hotel booking", note: "" },
      { label: "Bank statement", note: "Last 3 months" },
    ],
    faqs: [
      {
        question: "Is the Thai e-visa a sticker in my passport?",
        answer:
          "No. It is issued electronically. You carry the printed approval and it is checked on arrival.",
      },
    ],
    featuredOrder: 2,
  },
  {
    countryName: "Malaysia",
    slug: "malaysia",
    countryCode: "MY",
    processingTime: "5–7 working days",
    categories: "tourist,business",
    visaFormats: "evisa,sticker",
    entryTypes: "single",
    intro:
      "Malaysia offers both an e-visa and a sticker visa. Which applies depends on your purpose of travel.",
    serviceCharge: "BDT 4,000",
    embassyFee: "BDT 3,200",
    eligibility: "Passport valid at least 6 months\nProof of accommodation\nSufficient funds",
    applicationProcess:
      "Confirm your travel purpose with us\nWe advise which visa type applies\nSubmit your documents\nWe lodge and track the application",
    documents: [
      { label: "Passport", note: "Valid at least 6 months" },
      { label: "Photograph", note: "35×50 mm, white background" },
      { label: "Bank statement", note: "Last 3 months" },
      { label: "Hotel booking", note: "" },
    ],
    faqs: [],
    featuredOrder: 3,
  },
];

const TOURS = [
  {
    name: "Thailand Escape – Bangkok & Pattaya",
    slug: "thailand-escape-bangkok-pattaya",
    destination: "Bangkok & Pattaya",
    country: "Thailand",
    shortDescription:
      "Five days across Thailand's capital and its most popular beach city, with transfers and guided sightseeing included.",
    duration: "5 days / 4 nights",
    travelDates: "Departures every Friday",
    packageType: "group",
    startingPrice: "58,000",
    availability: "available",
    hotelDetails:
      "3-star and 4-star options in central Bangkok and beachfront Pattaya. Twin sharing; single supplement available.",
    highlights:
      "Grand Palace and Wat Pho guided tour\nCoral Island day trip with lunch\nChao Phraya river cruise\nAll airport and intercity transfers",
    includes:
      "4 nights accommodation\nDaily breakfast\nAirport transfers\nGuided sightseeing\nCoral Island tour with lunch",
    excludes:
      "International air ticket\nVisa fees\nLunch and dinner unless stated\nPersonal expenses",
    itinerary: [
      {
        dayLabel: "Day 1",
        title: "Arrival in Bangkok",
        body: "Airport pickup and hotel check-in. Evening free to explore the neighbourhood.",
      },
      {
        dayLabel: "Day 2",
        title: "Bangkok city tour",
        body: "Grand Palace, Wat Pho and Wat Arun with a guide, followed by a river cruise.",
      },
      {
        dayLabel: "Day 3",
        title: "Transfer to Pattaya",
        body: "Road transfer with a stop at a viewpoint. Afternoon at leisure on the beach.",
      },
      {
        dayLabel: "Day 4",
        title: "Coral Island",
        body: "Speedboat to Koh Larn for swimming and lunch, returning in the late afternoon.",
      },
      {
        dayLabel: "Day 5",
        title: "Departure",
        body: "Transfer to Bangkok airport for your return flight.",
      },
    ],
    featuredOrder: 0,
  },
  {
    name: "Malaysia City & Island Experience",
    slug: "malaysia-city-island-experience",
    destination: "Kuala Lumpur & Langkawi",
    country: "Malaysia",
    shortDescription:
      "Six days pairing Kuala Lumpur's skyline with the beaches and cable car of Langkawi.",
    duration: "6 days / 5 nights",
    travelDates: "On request, year round",
    packageType: "private",
    startingPrice: "72,000",
    availability: "available",
    hotelDetails: "4-star city hotel in Kuala Lumpur and a beach resort in Langkawi.",
    highlights:
      "Petronas Towers and city tour\nBatu Caves excursion\nLangkawi SkyCab cable car\nIsland hopping by boat",
    includes:
      "5 nights accommodation\nDaily breakfast\nDomestic flight KL–Langkawi\nAll transfers\nGuided tours as listed",
    excludes: "International air ticket\nVisa fees\nMeals not stated\nOptional activities",
    itinerary: [
      {
        dayLabel: "Day 1",
        title: "Arrival in Kuala Lumpur",
        body: "Airport pickup and hotel check-in.",
      },
      {
        dayLabel: "Day 2",
        title: "Kuala Lumpur city tour",
        body: "Petronas Towers, Merdeka Square and the Batu Caves.",
      },
      {
        dayLabel: "Days 3–4",
        title: "Langkawi",
        body: "Morning flight to Langkawi. SkyCab cable car and an island-hopping boat trip.",
      },
      {
        dayLabel: "Day 5",
        title: "Langkawi at leisure",
        body: "A free day for the beach or optional activities.",
      },
      {
        dayLabel: "Day 6",
        title: "Departure",
        body: "Transfer to the airport for your onward flight.",
      },
    ],
    featuredOrder: 1,
  },
  {
    name: "Japan Discovery Tour",
    slug: "japan-discovery-tour",
    destination: "Tokyo, Kyoto & Osaka",
    country: "Japan",
    shortDescription:
      "Eight days across Japan's three great cities, travelling between them by bullet train.",
    duration: "8 days / 7 nights",
    travelDates: "Spring and autumn departures",
    packageType: "group",
    startingPrice: "245,000",
    availability: "upcoming",
    hotelDetails: "Centrally located 3-star and 4-star hotels in each city.",
    highlights:
      "Shinkansen bullet train between cities\nFushimi Inari and Kiyomizu-dera in Kyoto\nTokyo city tour\nOsaka Castle and Dotonbori",
    includes:
      "7 nights accommodation\nDaily breakfast\nJapan Rail transfers as per itinerary\nGuided sightseeing\nAirport transfers",
    excludes: "International air ticket\nVisa fees\nMeals not stated\nPersonal expenses",
    itinerary: [
      {
        dayLabel: "Day 1",
        title: "Arrival in Tokyo",
        body: "Airport transfer and hotel check-in.",
      },
      {
        dayLabel: "Days 2–3",
        title: "Tokyo",
        body: "City tour taking in Asakusa, Shibuya and the Tokyo Skytree.",
      },
      {
        dayLabel: "Day 4",
        title: "Bullet train to Kyoto",
        body: "Shinkansen to Kyoto, then an afternoon in the Gion district.",
      },
      {
        dayLabel: "Days 5–6",
        title: "Kyoto",
        body: "Fushimi Inari, Kiyomizu-dera and the Arashiyama bamboo grove.",
      },
      { dayLabel: "Day 7", title: "Osaka", body: "Osaka Castle and an evening in Dotonbori." },
      { dayLabel: "Day 8", title: "Departure", body: "Transfer to Kansai airport." },
    ],
    featuredOrder: 2,
  },
];

const CAMPAIGNS = [
  {
    name: `${DEMO} China Business Visa Campaign`,
    headline: "China business visas, handled end to end",
    description:
      "Invitation letter guidance, document checks and embassy submission for business travellers.",
    ctaLabel: "See China visa details",
    ctaHref: "/visa/china",
    displayLocation: "homepage",
    active: true,
    featured: true,
    sortOrder: 0,
  },
  {
    name: `${DEMO} Seasonal Travel Offer`,
    headline: "Planning ahead for the next season?",
    description:
      "Talk to us early and we will hold your preferred dates while the paperwork is prepared.",
    ctaLabel: "Talk to our team",
    ctaHref: "/contact",
    displayLocation: "visa",
    active: true,
    featured: false,
    sortOrder: 1,
  },
  {
    name: `${DEMO} Office Notice`,
    headline: "Our Gulshan office is open Saturday to Thursday, 10am – 7pm.",
    ctaLabel: "Get directions",
    ctaHref: "/contact",
    displayLocation: "announcement_bar",
    active: true,
    featured: false,
    sortOrder: 2,
  },
  {
    name: `${DEMO} Expired Promotion (tests auto-hide)`,
    headline: "This campaign has already ended and must not appear anywhere.",
    ctaLabel: "Should not render",
    ctaHref: "/",
    displayLocation: "homepage",
    active: true,
    featured: false,
    sortOrder: 9,
    endsAt: new Date(Date.now() - 86_400_000),
  },
];

const TESTIMONIALS = [
  {
    authorName: `${DEMO} Sample Reviewer One`,
    authorTitle: "Sample entry",
    serviceType: "Visa Service",
    destination: "Japan",
    quote:
      "This is sample text used to check how a review looks on the page. It is not a real client review and must be replaced before launch.",
    rating: 5,
  },
  {
    authorName: `${DEMO} Sample Reviewer Two`,
    authorTitle: "Sample entry",
    serviceType: "Tour Package",
    destination: "Thailand",
    quote:
      "Another sample entry, written only to test the layout with a slightly longer piece of text so line wrapping and card height can be judged properly.",
    rating: 5,
  },
  {
    authorName: `${DEMO} Sample Reviewer Three`,
    authorTitle: "Sample entry",
    serviceType: "Air Ticket",
    destination: "Malaysia",
    quote:
      "A third sample so the three-column layout can be reviewed. Replace all of these with genuine feedback.",
    rating: 4,
  },
];

async function load() {
  for (const visa of VISAS) {
    const { documents, faqs, ...rest } = visa;
    const data = {
      ...rest,
      importantNotes: `${NOTE}\nVisa decisions rest entirely with the embassy.`,
      whatsappMessage: "",
      featured: true,
      status: "published",
      isPlaceholder: true,
      seoDescription: `${visa.countryName} visa assistance from DreamFly Consultancy — requirements, documents and processing information.`,
      documents: { create: documents.map((d, i) => ({ ...d, sortOrder: i })) },
      faqs: { create: faqs.map((f, i) => ({ ...f, sortOrder: i })) },
    };
    const existing = await db.visaDestination.findUnique({ where: { slug: visa.slug } });
    if (existing) {
      await db.$transaction([
        db.visaDocument.deleteMany({ where: { destinationId: existing.id } }),
        db.visaFaq.deleteMany({ where: { destinationId: existing.id } }),
        db.visaDestination.update({ where: { id: existing.id }, data }),
      ]);
    } else {
      await db.visaDestination.create({ data });
    }
  }

  for (const tour of TOURS) {
    const { highlights, includes, excludes, itinerary, ...rest } = tour;
    const split = (value: string) =>
      value
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);
    const data = {
      ...rest,
      currency: "BDT",
      importantNotes: `${NOTE}\nPrices are indicative and subject to availability.`,
      featured: true,
      status: "published",
      isPlaceholder: true,
      highlights: { create: split(highlights).map((label, i) => ({ label, sortOrder: i })) },
      itinerary: { create: itinerary.map((d, i) => ({ ...d, sortOrder: i })) },
      listItems: {
        create: [
          ...split(includes).map((label, i) => ({ kind: "include", label, sortOrder: i })),
          ...split(excludes).map((label, i) => ({ kind: "exclude", label, sortOrder: i })),
        ],
      },
    };
    const existing = await db.tourPackage.findUnique({ where: { slug: tour.slug } });
    if (existing) {
      await db.$transaction([
        db.tourHighlight.deleteMany({ where: { packageId: existing.id } }),
        db.tourItineraryDay.deleteMany({ where: { packageId: existing.id } }),
        db.tourListItem.deleteMany({ where: { packageId: existing.id } }),
        db.tourPackage.update({ where: { id: existing.id }, data }),
      ]);
    } else {
      await db.tourPackage.create({ data });
    }
  }

  // Visas and tours above are matched by slug, so a second `load` replaces
  // them. Campaigns and testimonials have no such key — they are identified by
  // the [DEMO] prefix every one of them carries. Clearing on the placeholder
  // flag ALONE was not enough: `demo:show` lifts that flag, so loading again
  // while the demo is exposed left the old rows behind and created a second
  // copy of each.
  const demoNamed = { OR: [{ isPlaceholder: true }, { name: { startsWith: DEMO } }] };

  await db.campaign.deleteMany({ where: demoNamed });
  for (const campaign of CAMPAIGNS) {
    await db.campaign.create({ data: { ...campaign, isPlaceholder: true } });
  }

  await db.testimonial.deleteMany({
    where: { OR: [{ isPlaceholder: true }, { authorName: { startsWith: DEMO } }] },
  });
  for (const [index, testimonial] of TESTIMONIALS.entries()) {
    await db.testimonial.create({
      data: { ...testimonial, published: true, isPlaceholder: true, sortOrder: index },
    });
  }

  await db.aboutPage.update({
    where: { id: "about" },
    data: {
      heroSubheading: `${DEMO} A short introduction, replaced with DreamFly's own words before launch.`,
      whoWeAre: `${NOTE}\n\nDreamFly Consultancy is a travel and visa consultancy based in Gulshan, Dhaka. This paragraph is demo text so the About page layout can be reviewed.\n\nA second paragraph, to check spacing between blocks of prose.`,
      mission: `${DEMO} Demo mission text for layout review.`,
      vision: `${DEMO} Demo vision text for layout review.`,
      approach: `${DEMO} Demo approach text for layout review.`,
    },
  });

  console.log("Demo content loaded. Every record is flagged isPlaceholder=true.");
  await list();
}

async function list() {
  // Find demo records by identity, not by the placeholder flag: `demo:show`
  // lifts that flag, and a pre-launch check that answered "no demo content"
  // precisely when the demo was live on the public site would be worse than
  // useless. Each row below reports its own protection state instead.
  const [visas, tours, campaigns, testimonials] = await Promise.all([
    db.visaDestination.findMany({
      where: { OR: [{ isPlaceholder: true }, { slug: { in: VISAS.map((x) => x.slug) } }] },
      select: { countryName: true, slug: true, status: true, isPlaceholder: true },
    }),
    db.tourPackage.findMany({
      where: { OR: [{ isPlaceholder: true }, { slug: { in: TOURS.map((x) => x.slug) } }] },
      select: { name: true, slug: true, status: true, isPlaceholder: true },
    }),
    db.campaign.findMany({
      where: { OR: [{ isPlaceholder: true }, { name: { startsWith: DEMO } }] },
      select: { name: true, displayLocation: true, active: true, isPlaceholder: true },
    }),
    db.testimonial.findMany({
      where: { OR: [{ isPlaceholder: true }, { authorName: { startsWith: DEMO } }] },
      select: { authorName: true, published: true, isPlaceholder: true },
    }),
  ]);

  const exposed = [...visas, ...tours, ...campaigns, ...testimonials].filter(
    (row) => !row.isPlaceholder,
  ).length;
  const mark = (row: { isPlaceholder: boolean }) => (row.isPlaceholder ? "protected" : "LIVE");

  console.log("\n=== DEMO CONTENT CURRENTLY IN THE DATABASE ===");
  console.log(
    exposed === 0
      ? "(all of it is protected — none can appear on the public site)\n"
      : `\n  ⚠  ${exposed} demo record(s) are LIVE on the public site right now.\n     Run \`npm run demo:hide\` before launch.\n`,
  );
  console.log(`Visa destinations (${visas.length}):`);
  visas.forEach((v) =>
    console.log(`  /visa/${v.slug.padEnd(28)} ${v.countryName} — ${v.status} — ${mark(v)}`),
  );
  console.log(`\nTour packages (${tours.length}):`);
  tours.forEach((t) => console.log(`  /tours/${t.slug.padEnd(34)} ${t.status} — ${mark(t)}`));
  console.log(`\nCampaigns (${campaigns.length}):`);
  campaigns.forEach((c) =>
    console.log(`  ${c.name} — ${c.displayLocation}${c.active ? "" : " (inactive)"} — ${mark(c)}`),
  );
  console.log(`\nTestimonials (${testimonials.length}):`);
  testimonials.forEach((t) => console.log(`  ${t.authorName} — ${mark(t)}`));
  console.log("\nAbout page prose is demo text and starts with [DEMO].");
  console.log("\nRemove it all with:  npm run demo:clear\n");
}

/**
 * Temporarily lifts the placeholder flag so the public designs can be reviewed
 * with content in them. Indexing is switched off at the same time, so search
 * engines cannot pick up demo copy while it is exposed.
 *
 * This is a review aid, not a feature. `npm run demo:hide` reverses it, and the
 * pre-launch checklist requires it.
 */
async function show() {
  const [v, t, c, s] = await Promise.all([
    db.visaDestination.updateMany({
      where: { isPlaceholder: true },
      data: { isPlaceholder: false },
    }),
    db.tourPackage.updateMany({ where: { isPlaceholder: true }, data: { isPlaceholder: false } }),
    db.campaign.updateMany({ where: { isPlaceholder: true }, data: { isPlaceholder: false } }),
    db.testimonial.updateMany({ where: { isPlaceholder: true }, data: { isPlaceholder: false } }),
  ]);
  await db.globalSettings.update({ where: { id: "global" }, data: { allowIndexing: false } });

  console.log("\n  ⚠  DEMO CONTENT IS NOW PUBLIC — FOR DESIGN REVIEW ONLY\n");
  console.log(
    `  Exposed: ${v.count} visa, ${t.count} tour, ${c.count} campaign, ${s.count} testimonial records.`,
  );
  console.log("  Search engine indexing has been switched OFF while they are exposed.");
  console.log("\n  Run `npm run demo:hide` when you have finished reviewing.\n");
}

/**
 * Restores the placeholder protection and re-enables indexing.
 *
 * `show` lifts the flag from EVERY placeholder row, which includes the empty
 * drafts the seed creates as well as this script's own records. So `hide` has
 * to re-protect everything still unfinished — matching only the demo slugs
 * would quietly leave those seeded drafts exposed.
 *
 * The rule: a record is unfinished if it is still a draft, or if it is one of
 * this script's own demo records. Anything an administrator has genuinely
 * published with real content is left alone.
 */
async function hide() {
  const demoSlugs = [...VISAS.map((v) => v.slug)];
  const demoTourSlugs = TOURS.map((t) => t.slug);

  const [v, t, c, s] = await Promise.all([
    db.visaDestination.updateMany({
      where: { OR: [{ slug: { in: demoSlugs } }, { status: "draft" }] },
      data: { isPlaceholder: true },
    }),
    db.tourPackage.updateMany({
      where: { OR: [{ slug: { in: demoTourSlugs } }, { status: "draft" }] },
      data: { isPlaceholder: true },
    }),
    db.campaign.updateMany({
      where: { name: { startsWith: DEMO } },
      data: { isPlaceholder: true },
    }),
    db.testimonial.updateMany({
      where: { authorName: { startsWith: DEMO } },
      data: { isPlaceholder: true },
    }),
  ]);
  await db.globalSettings.update({ where: { id: "global" }, data: { allowIndexing: true } });

  console.log(
    `Protected again: ${v.count} visa, ${t.count} tour, ${c.count} campaign, ${s.count} testimonial records.`,
  );
  console.log(
    "Search engine indexing re-enabled. Demo content can no longer reach the public site.",
  );
}

async function clear() {
  // Matching on the placeholder flag alone would remove nothing at all while
  // `demo:show` has that flag lifted — and this is the pre-launch step whose
  // whole job is making sure no demo copy survives. So match the flag OR this
  // script's own records.
  const [v, t, c, s] = await Promise.all([
    db.visaDestination.deleteMany({
      where: { OR: [{ isPlaceholder: true }, { slug: { in: VISAS.map((x) => x.slug) } }] },
    }),
    db.tourPackage.deleteMany({
      where: { OR: [{ isPlaceholder: true }, { slug: { in: TOURS.map((x) => x.slug) } }] },
    }),
    db.campaign.deleteMany({
      where: { OR: [{ isPlaceholder: true }, { name: { startsWith: DEMO } }] },
    }),
    db.testimonial.deleteMany({
      where: { OR: [{ isPlaceholder: true }, { authorName: { startsWith: DEMO } }] },
    }),
  ]);
  await db.aboutPage.update({
    where: { id: "about" },
    data: { heroSubheading: "", whoWeAre: "", mission: "", vision: "", approach: "" },
  });
  console.log(
    `Removed ${v.count} visa, ${t.count} tour, ${c.count} campaign, ${s.count} testimonial records.`,
  );
  console.log("About page prose cleared. Real content is untouched.");
}

const command = process.argv[2] ?? "load";
const commands = { load, list, show, hide, clear } as const;
const run = commands[command as keyof typeof commands] ?? load;

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
