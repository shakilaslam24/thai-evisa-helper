import "server-only";
import { cache } from "react";
import { db } from "./db";

/**
 * Public content queries.
 *
 * Two rules hold everywhere:
 *   1. Only `status: "published"` rows reach the public site.
 *   2. `isPlaceholder` rows NEVER reach the public site, whatever their status.
 *      Seeded sample data is flagged this way so demo copy can never be
 *      mistaken for real business information (brief §26).
 */

const PUBLIC = { status: "published", isPlaceholder: false } as const;

export const getHomeSections = cache(async () => {
  const rows = await db.homeSection.findMany({ orderBy: { sortOrder: "asc" } });
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return {
    ordered: rows.filter((row) => row.enabled),
    /** Section metadata by key; missing rows behave as disabled. */
    get: (key: string) => byKey.get(key) ?? null,
    isEnabled: (key: string) => byKey.get(key)?.enabled ?? false,
  };
});

export const getHero = cache(() =>
  db.homeHero.findUnique({
    where: { id: "hero" },
    include: { desktopImage: true, mobileImage: true },
  }),
);

export const getHomeServices = cache(() =>
  db.homeService.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
    include: { image: true },
  }),
);

export const getWhyItems = cache(() =>
  db.homeWhyItem.findMany({ where: { enabled: true }, orderBy: { sortOrder: "asc" } }),
);

export const getFeaturedVisas = cache((take = 9) =>
  db.visaDestination.findMany({
    where: { ...PUBLIC, featured: true },
    orderBy: [{ featuredOrder: "asc" }, { countryName: "asc" }],
    take,
    include: { coverImage: true, flagImage: true },
  }),
);

export const getPublishedVisas = cache(() =>
  db.visaDestination.findMany({
    where: PUBLIC,
    orderBy: [{ featured: "desc" }, { featuredOrder: "asc" }, { countryName: "asc" }],
    include: { coverImage: true, flagImage: true },
  }),
);

export const getVisaBySlug = cache((slug: string) =>
  db.visaDestination.findFirst({
    where: { slug, ...PUBLIC },
    include: {
      coverImage: true,
      flagImage: true,
      ogImage: true,
      documents: { orderBy: { sortOrder: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
      gallery: { orderBy: { sortOrder: "asc" }, include: { media: true } },
    },
  }),
);

export const getFeaturedTours = cache((take = 6) =>
  db.tourPackage.findMany({
    where: { ...PUBLIC, featured: true },
    orderBy: [{ featuredOrder: "asc" }, { name: "asc" }],
    take,
    include: { coverImage: true },
  }),
);

export const getPublishedTours = cache(() =>
  db.tourPackage.findMany({
    where: PUBLIC,
    orderBy: [{ featured: "desc" }, { featuredOrder: "asc" }, { name: "asc" }],
    include: { coverImage: true },
  }),
);

export const getTourBySlug = cache((slug: string) =>
  db.tourPackage.findFirst({
    where: { slug, ...PUBLIC },
    include: {
      coverImage: true,
      ogImage: true,
      highlights: { orderBy: { sortOrder: "asc" } },
      itinerary: { orderBy: { sortOrder: "asc" } },
      listItems: { orderBy: { sortOrder: "asc" } },
      gallery: { orderBy: { sortOrder: "asc" }, include: { media: true } },
    },
  }),
);

/**
 * The campaign band.
 *
 * Returns null unless a campaign is active AND inside its scheduled window, so
 * an expired campaign disappears on its own and an empty section is never
 * rendered (brief §5.04).
 */
export const getActiveCampaign = cache(async () => {
  const now = new Date();
  return db.campaign.findFirst({
    where: {
      active: true,
      isPlaceholder: false,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: { desktopImage: true, mobileImage: true },
  });
});

/** Only real, admin-published testimonials. Never invented (brief §5.07). */
export const getTestimonials = cache((take = 6) =>
  db.testimonial.findMany({
    where: { published: true, isPlaceholder: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take,
    include: { avatar: true },
  }),
);

export const getAboutPage = cache(async () => {
  const [page, gallery, team, milestones] = await Promise.all([
    db.aboutPage.findUnique({ where: { id: "about" } }),
    db.aboutGalleryImage.findMany({ orderBy: { sortOrder: "asc" }, include: { media: true } }),
    db.teamMember.findMany({
      where: { published: true, isPlaceholder: false },
      orderBy: { sortOrder: "asc" },
      include: { photo: true },
    }),
    db.milestone.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return { page, gallery, team, milestones };
});

export const getPageSeo = cache((pageKey: string) =>
  db.pageSeo.findUnique({ where: { pageKey }, include: { ogImage: true } }),
);
