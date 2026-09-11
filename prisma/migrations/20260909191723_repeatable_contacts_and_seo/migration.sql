-- CreateTable
CREATE TABLE "ContactNumber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL DEFAULT 'Main Office',
    "customLabel" TEXT NOT NULL DEFAULT '',
    "number" TEXT NOT NULL,
    "whatsappNumber" TEXT NOT NULL DEFAULT '',
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isPrimaryWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "showInHeader" BOOLEAN NOT NULL DEFAULT false,
    "showInFooter" BOOLEAN NOT NULL DEFAULT true,
    "showOnContact" BOOLEAN NOT NULL DEFAULT true,
    "showInMobileBar" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ContactEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL DEFAULT 'General',
    "address" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "showInFooter" BOOLEAN NOT NULL DEFAULT true,
    "showOnContact" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "OfficeHour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);


-- ---------------------------------------------------------------------------
-- Data migration: preserve the existing fixed contact details.
--
-- GlobalSettings is rebuilt below, which drops primaryPhone, secondaryPhone,
-- whatsappNumber and email. Copy them into the new repeatable tables FIRST, so
-- an install that already holds DreamFly's real numbers keeps them.
-- ---------------------------------------------------------------------------

INSERT INTO "ContactNumber" ("id", "label", "customLabel", "number", "whatsappNumber", "whatsappEnabled", "isPrimary", "isPrimaryWhatsapp", "showInHeader", "showInFooter", "showOnContact", "showInMobileBar", "archived", "sortOrder")
SELECT
  'migrated_primary_phone', 'Main Office', '', "primaryPhone",
  CASE WHEN "whatsappNumber" <> '' THEN "whatsappNumber" ELSE '' END,
  CASE WHEN "whatsappNumber" <> '' THEN 1 ELSE 0 END,
  1,
  CASE WHEN "whatsappNumber" <> '' THEN 1 ELSE 0 END,
  0, 1, 1, 1, 0, 0
FROM "GlobalSettings"
WHERE "id" = 'global' AND "primaryPhone" <> '';

INSERT INTO "ContactNumber" ("id", "label", "customLabel", "number", "whatsappNumber", "whatsappEnabled", "isPrimary", "isPrimaryWhatsapp", "showInHeader", "showInFooter", "showOnContact", "showInMobileBar", "archived", "sortOrder")
SELECT 'migrated_secondary_phone', 'Main Office', '', "secondaryPhone", '', 0, 0, 0, 0, 1, 1, 0, 0, 1
FROM "GlobalSettings"
WHERE "id" = 'global' AND "secondaryPhone" <> '';

-- A WhatsApp number that was not already carried by the primary phone row
-- becomes its own entry, so it is never lost.
INSERT INTO "ContactNumber" ("id", "label", "customLabel", "number", "whatsappNumber", "whatsappEnabled", "isPrimary", "isPrimaryWhatsapp", "showInHeader", "showInFooter", "showOnContact", "showInMobileBar", "archived", "sortOrder")
SELECT 'migrated_whatsapp', 'WhatsApp', '', "whatsappNumber", "whatsappNumber", 1, 0, 1, 0, 1, 1, 1, 0, 2
FROM "GlobalSettings"
WHERE "id" = 'global'
  AND "whatsappNumber" <> ''
  AND NOT EXISTS (SELECT 1 FROM "ContactNumber" WHERE "isPrimaryWhatsapp" = 1);

INSERT INTO "ContactEmail" ("id", "label", "address", "isPrimary", "showInFooter", "showOnContact", "archived", "sortOrder")
SELECT 'migrated_email', 'General', "email", 1, 1, 1, 0, 0
FROM "GlobalSettings"
WHERE "id" = 'global' AND "email" <> '';


-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "desktopImageId" TEXT,
    "mobileImageId" TEXT,
    "ctaLabel" TEXT NOT NULL DEFAULT '',
    "ctaHref" TEXT NOT NULL DEFAULT '',
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "displayLocation" TEXT NOT NULL DEFAULT 'homepage',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_desktopImageId_fkey" FOREIGN KEY ("desktopImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Campaign_mobileImageId_fkey" FOREIGN KEY ("mobileImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Campaign" ("active", "createdAt", "ctaHref", "ctaLabel", "description", "desktopImageId", "endsAt", "headline", "id", "isPlaceholder", "mobileImageId", "name", "sortOrder", "startsAt", "updatedAt") SELECT "active", "createdAt", "ctaHref", "ctaLabel", "description", "desktopImageId", "endsAt", "headline", "id", "isPlaceholder", "mobileImageId", "name", "sortOrder", "startsAt", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE INDEX "Campaign_active_displayLocation_sortOrder_idx" ON "Campaign"("active", "displayLocation", "sortOrder");
CREATE TABLE "new_GlobalSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "companyName" TEXT NOT NULL DEFAULT 'DreamFly Consultancy',
    "tagline" TEXT NOT NULL DEFAULT 'Fly Beyond Your Dreams',
    "logoLightId" TEXT,
    "logoDarkId" TEXT,
    "faviconId" TEXT,
    "addressLine1" TEXT NOT NULL DEFAULT '',
    "addressLine2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "googleMapsUrl" TEXT NOT NULL DEFAULT '',
    "googleMapsEmbed" TEXT NOT NULL DEFAULT '',
    "facebookUrl" TEXT NOT NULL DEFAULT '',
    "instagramUrl" TEXT NOT NULL DEFAULT '',
    "tiktokUrl" TEXT NOT NULL DEFAULT '',
    "youtubeUrl" TEXT NOT NULL DEFAULT '',
    "linkedinUrl" TEXT NOT NULL DEFAULT '',
    "officeHours" TEXT NOT NULL DEFAULT '',
    "footerText" TEXT NOT NULL DEFAULT '',
    "googleSiteVerification" TEXT NOT NULL DEFAULT '',
    "bingSiteVerification" TEXT NOT NULL DEFAULT '',
    "gaMeasurementId" TEXT NOT NULL DEFAULT '',
    "gtmContainerId" TEXT NOT NULL DEFAULT '',
    "metaPixelId" TEXT NOT NULL DEFAULT '',
    "defaultSeoTitle" TEXT NOT NULL DEFAULT '',
    "defaultSeoDescription" TEXT NOT NULL DEFAULT '',
    "defaultSocialImageId" TEXT,
    "siteUrl" TEXT NOT NULL DEFAULT 'https://www.dreamflyconsultancy.com',
    "allowIndexing" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GlobalSettings_logoLightId_fkey" FOREIGN KEY ("logoLightId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GlobalSettings_logoDarkId_fkey" FOREIGN KEY ("logoDarkId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GlobalSettings_faviconId_fkey" FOREIGN KEY ("faviconId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GlobalSettings_defaultSocialImageId_fkey" FOREIGN KEY ("defaultSocialImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GlobalSettings" ("addressLine1", "addressLine2", "allowIndexing", "city", "companyName", "country", "defaultSeoDescription", "defaultSeoTitle", "defaultSocialImageId", "facebookUrl", "faviconId", "footerText", "gaMeasurementId", "googleMapsEmbed", "googleMapsUrl", "gtmContainerId", "id", "instagramUrl", "linkedinUrl", "logoDarkId", "logoLightId", "metaPixelId", "officeHours", "siteUrl", "tagline", "tiktokUrl", "updatedAt", "youtubeUrl") SELECT "addressLine1", "addressLine2", "allowIndexing", "city", "companyName", "country", "defaultSeoDescription", "defaultSeoTitle", "defaultSocialImageId", "facebookUrl", "faviconId", "footerText", "gaMeasurementId", "googleMapsEmbed", "googleMapsUrl", "gtmContainerId", "id", "instagramUrl", "linkedinUrl", "logoDarkId", "logoLightId", "metaPixelId", "officeHours", "siteUrl", "tagline", "tiktokUrl", "updatedAt", "youtubeUrl" FROM "GlobalSettings";
DROP TABLE "GlobalSettings";
ALTER TABLE "new_GlobalSettings" RENAME TO "GlobalSettings";
CREATE TABLE "new_Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Media" ("altText", "createdAt", "filename", "height", "id", "mimeType", "originalName", "sizeBytes", "uploadedById", "url", "width") SELECT "altText", "createdAt", "filename", "height", "id", "mimeType", "originalName", "sizeBytes", "uploadedById", "url", "width" FROM "Media";
DROP TABLE "Media";
ALTER TABLE "new_Media" RENAME TO "Media";
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");
CREATE TABLE "new_PageSeo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageKey" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "ogTitle" TEXT NOT NULL DEFAULT '',
    "ogDescription" TEXT NOT NULL DEFAULT '',
    "ogImageId" TEXT,
    "canonicalUrl" TEXT NOT NULL DEFAULT '',
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PageSeo_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PageSeo" ("canonicalUrl", "description", "id", "noindex", "ogImageId", "pageKey", "title", "updatedAt") SELECT "canonicalUrl", "description", "id", "noindex", "ogImageId", "pageKey", "title", "updatedAt" FROM "PageSeo";
DROP TABLE "PageSeo";
ALTER TABLE "new_PageSeo" RENAME TO "PageSeo";
CREATE UNIQUE INDEX "PageSeo_pageKey_key" ON "PageSeo"("pageKey");
CREATE TABLE "new_Testimonial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorName" TEXT NOT NULL,
    "authorTitle" TEXT NOT NULL DEFAULT '',
    "quote" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL DEFAULT '',
    "destination" TEXT NOT NULL DEFAULT '',
    "reviewDate" DATETIME,
    "rating" INTEGER,
    "avatarId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Testimonial_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Testimonial" ("authorName", "authorTitle", "avatarId", "createdAt", "id", "isPlaceholder", "published", "quote", "rating", "serviceType", "sortOrder") SELECT "authorName", "authorTitle", "avatarId", "createdAt", "id", "isPlaceholder", "published", "quote", "rating", "serviceType", "sortOrder" FROM "Testimonial";
DROP TABLE "Testimonial";
ALTER TABLE "new_Testimonial" RENAME TO "Testimonial";
CREATE INDEX "Testimonial_published_sortOrder_idx" ON "Testimonial"("published", "sortOrder");
CREATE TABLE "new_TourPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "destination" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "coverImageId" TEXT,
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "duration" TEXT NOT NULL DEFAULT '',
    "travelDates" TEXT NOT NULL DEFAULT '',
    "packageType" TEXT NOT NULL DEFAULT 'group',
    "startingPrice" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "hotelDetails" TEXT NOT NULL DEFAULT '',
    "importantNotes" TEXT NOT NULL DEFAULT '',
    "availability" TEXT NOT NULL DEFAULT 'available',
    "whatsappMessage" TEXT NOT NULL DEFAULT '',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "ogTitle" TEXT NOT NULL DEFAULT '',
    "ogDescription" TEXT NOT NULL DEFAULT '',
    "ogImageId" TEXT,
    "canonicalUrl" TEXT NOT NULL DEFAULT '',
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TourPackage_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TourPackage_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TourPackage" ("availability", "canonicalUrl", "country", "coverImageId", "createdAt", "currency", "destination", "duration", "featured", "featuredOrder", "hotelDetails", "id", "importantNotes", "isPlaceholder", "name", "noindex", "ogImageId", "packageType", "seoDescription", "seoTitle", "shortDescription", "slug", "startingPrice", "status", "travelDates", "updatedAt", "whatsappMessage") SELECT "availability", "canonicalUrl", "country", "coverImageId", "createdAt", "currency", "destination", "duration", "featured", "featuredOrder", "hotelDetails", "id", "importantNotes", "isPlaceholder", "name", "noindex", "ogImageId", "packageType", "seoDescription", "seoTitle", "shortDescription", "slug", "startingPrice", "status", "travelDates", "updatedAt", "whatsappMessage" FROM "TourPackage";
DROP TABLE "TourPackage";
ALTER TABLE "new_TourPackage" RENAME TO "TourPackage";
CREATE UNIQUE INDEX "TourPackage_slug_key" ON "TourPackage"("slug");
CREATE INDEX "TourPackage_status_featured_featuredOrder_idx" ON "TourPackage"("status", "featured", "featuredOrder");
CREATE INDEX "TourPackage_slug_idx" ON "TourPackage"("slug");
CREATE TABLE "new_VisaDestination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT '',
    "flagImageId" TEXT,
    "coverImageId" TEXT,
    "intro" TEXT NOT NULL DEFAULT '',
    "categories" TEXT NOT NULL DEFAULT '',
    "visaFormats" TEXT NOT NULL DEFAULT '',
    "entryTypes" TEXT NOT NULL DEFAULT '',
    "processingTime" TEXT NOT NULL DEFAULT '',
    "serviceCharge" TEXT NOT NULL DEFAULT '',
    "embassyFee" TEXT NOT NULL DEFAULT '',
    "otherCharges" TEXT NOT NULL DEFAULT '',
    "feeNote" TEXT NOT NULL DEFAULT '',
    "eligibility" TEXT NOT NULL DEFAULT '',
    "applicationProcess" TEXT NOT NULL DEFAULT '',
    "importantNotes" TEXT NOT NULL DEFAULT '',
    "whatsappMessage" TEXT NOT NULL DEFAULT '',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "ogTitle" TEXT NOT NULL DEFAULT '',
    "ogDescription" TEXT NOT NULL DEFAULT '',
    "ogImageId" TEXT,
    "canonicalUrl" TEXT NOT NULL DEFAULT '',
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VisaDestination_flagImageId_fkey" FOREIGN KEY ("flagImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VisaDestination_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VisaDestination_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VisaDestination" ("applicationProcess", "canonicalUrl", "categories", "countryCode", "countryName", "coverImageId", "createdAt", "eligibility", "embassyFee", "entryTypes", "featured", "featuredOrder", "feeNote", "flagImageId", "id", "importantNotes", "intro", "isPlaceholder", "noindex", "ogImageId", "otherCharges", "processingTime", "seoDescription", "seoTitle", "serviceCharge", "slug", "status", "updatedAt", "visaFormats", "whatsappMessage") SELECT "applicationProcess", "canonicalUrl", "categories", "countryCode", "countryName", "coverImageId", "createdAt", "eligibility", "embassyFee", "entryTypes", "featured", "featuredOrder", "feeNote", "flagImageId", "id", "importantNotes", "intro", "isPlaceholder", "noindex", "ogImageId", "otherCharges", "processingTime", "seoDescription", "seoTitle", "serviceCharge", "slug", "status", "updatedAt", "visaFormats", "whatsappMessage" FROM "VisaDestination";
DROP TABLE "VisaDestination";
ALTER TABLE "new_VisaDestination" RENAME TO "VisaDestination";
CREATE UNIQUE INDEX "VisaDestination_slug_key" ON "VisaDestination"("slug");
CREATE INDEX "VisaDestination_status_featured_featuredOrder_idx" ON "VisaDestination"("status", "featured", "featuredOrder");
CREATE INDEX "VisaDestination_slug_idx" ON "VisaDestination"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ContactNumber_archived_sortOrder_idx" ON "ContactNumber"("archived", "sortOrder");

-- CreateIndex
CREATE INDEX "ContactEmail_archived_sortOrder_idx" ON "ContactEmail"("archived", "sortOrder");

-- CreateIndex
CREATE INDEX "OfficeHour_published_sortOrder_idx" ON "OfficeHour"("published", "sortOrder");

