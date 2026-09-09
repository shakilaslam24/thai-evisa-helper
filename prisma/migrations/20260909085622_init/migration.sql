-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" TEXT,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GlobalSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "companyName" TEXT NOT NULL DEFAULT 'DreamFly Consultancy',
    "tagline" TEXT NOT NULL DEFAULT 'Fly Beyond Your Dreams',
    "logoLightId" TEXT,
    "logoDarkId" TEXT,
    "faviconId" TEXT,
    "primaryPhone" TEXT NOT NULL DEFAULT '',
    "secondaryPhone" TEXT NOT NULL DEFAULT '',
    "whatsappNumber" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
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

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT NOT NULL DEFAULT '',
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomeSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "heading" TEXT NOT NULL DEFAULT '',
    "subheading" TEXT NOT NULL DEFAULT '',
    "ctaLabel" TEXT NOT NULL DEFAULT '',
    "ctaHref" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "HomeHero" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'hero',
    "eyebrow" TEXT NOT NULL DEFAULT '',
    "headline" TEXT NOT NULL DEFAULT '',
    "headlineAccent" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "brandLine" TEXT NOT NULL DEFAULT '',
    "badge" TEXT NOT NULL DEFAULT '',
    "desktopImageId" TEXT,
    "mobileImageId" TEXT,
    "videoUrl" TEXT NOT NULL DEFAULT '',
    "primaryCtaLabel" TEXT NOT NULL DEFAULT '',
    "primaryCtaHref" TEXT NOT NULL DEFAULT '',
    "secondaryCtaLabel" TEXT NOT NULL DEFAULT '',
    "secondaryCtaHref" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HomeHero_desktopImageId_fkey" FOREIGN KEY ("desktopImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HomeHero_mobileImageId_fkey" FOREIGN KEY ("mobileImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomeService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'visa',
    "href" TEXT NOT NULL DEFAULT '',
    "imageId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "HomeService_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomeWhyItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'shield',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "VisaDestination" (
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
    "ogImageId" TEXT,
    "canonicalUrl" TEXT NOT NULL DEFAULT '',
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VisaDestination_flagImageId_fkey" FOREIGN KEY ("flagImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VisaDestination_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VisaDestination_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VisaDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "destinationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "VisaDocument_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "VisaDestination" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VisaFaq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "destinationId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "VisaFaq_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "VisaDestination" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VisaGalleryImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "destinationId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "VisaGalleryImage_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "VisaDestination" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VisaGalleryImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourPackage" (
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
    "ogImageId" TEXT,
    "canonicalUrl" TEXT NOT NULL DEFAULT '',
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TourPackage_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TourPackage_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourHighlight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TourHighlight_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourItineraryDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "dayLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TourItineraryDay_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourListItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TourListItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourGalleryImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TourGalleryImage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TourGalleryImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
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
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_desktopImageId_fkey" FOREIGN KEY ("desktopImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Campaign_mobileImageId_fkey" FOREIGN KEY ("mobileImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorName" TEXT NOT NULL,
    "authorTitle" TEXT NOT NULL DEFAULT '',
    "quote" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL DEFAULT '',
    "rating" INTEGER,
    "avatarId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Testimonial_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AboutPage" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'about',
    "heroHeading" TEXT NOT NULL DEFAULT '',
    "heroSubheading" TEXT NOT NULL DEFAULT '',
    "whoWeAre" TEXT NOT NULL DEFAULT '',
    "mission" TEXT NOT NULL DEFAULT '',
    "vision" TEXT NOT NULL DEFAULT '',
    "approach" TEXT NOT NULL DEFAULT '',
    "galleryHeading" TEXT NOT NULL DEFAULT '',
    "teamHeading" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AboutGalleryImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mediaId" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AboutGalleryImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "photoId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TeamMember_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "PageSeo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageKey" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "ogImageId" TEXT,
    "canonicalUrl" TEXT NOT NULL DEFAULT '',
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PageSeo_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "service" TEXT NOT NULL DEFAULT '',
    "destination" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "sourcePage" TEXT NOT NULL DEFAULT '',
    "referrer" TEXT NOT NULL DEFAULT '',
    "utmSource" TEXT NOT NULL DEFAULT '',
    "utmMedium" TEXT NOT NULL DEFAULT '',
    "utmCampaign" TEXT NOT NULL DEFAULT '',
    "utmContent" TEXT NOT NULL DEFAULT '',
    "utmTerm" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'new',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,
    "externalState" TEXT NOT NULL DEFAULT 'not_dispatched',
    "externalSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EnquiryNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enquiryId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorName" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnquiryNote_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_email_idx" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_userId_idx" ON "AdminSession"("userId");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HomeSection_key_key" ON "HomeSection"("key");

-- CreateIndex
CREATE INDEX "HomeSection_sortOrder_idx" ON "HomeSection"("sortOrder");

-- CreateIndex
CREATE INDEX "HomeService_sortOrder_idx" ON "HomeService"("sortOrder");

-- CreateIndex
CREATE INDEX "HomeWhyItem_sortOrder_idx" ON "HomeWhyItem"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "VisaDestination_slug_key" ON "VisaDestination"("slug");

-- CreateIndex
CREATE INDEX "VisaDestination_status_featured_featuredOrder_idx" ON "VisaDestination"("status", "featured", "featuredOrder");

-- CreateIndex
CREATE INDEX "VisaDestination_slug_idx" ON "VisaDestination"("slug");

-- CreateIndex
CREATE INDEX "VisaDocument_destinationId_sortOrder_idx" ON "VisaDocument"("destinationId", "sortOrder");

-- CreateIndex
CREATE INDEX "VisaFaq_destinationId_sortOrder_idx" ON "VisaFaq"("destinationId", "sortOrder");

-- CreateIndex
CREATE INDEX "VisaGalleryImage_destinationId_sortOrder_idx" ON "VisaGalleryImage"("destinationId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TourPackage_slug_key" ON "TourPackage"("slug");

-- CreateIndex
CREATE INDEX "TourPackage_status_featured_featuredOrder_idx" ON "TourPackage"("status", "featured", "featuredOrder");

-- CreateIndex
CREATE INDEX "TourPackage_slug_idx" ON "TourPackage"("slug");

-- CreateIndex
CREATE INDEX "TourHighlight_packageId_sortOrder_idx" ON "TourHighlight"("packageId", "sortOrder");

-- CreateIndex
CREATE INDEX "TourItineraryDay_packageId_sortOrder_idx" ON "TourItineraryDay"("packageId", "sortOrder");

-- CreateIndex
CREATE INDEX "TourListItem_packageId_kind_sortOrder_idx" ON "TourListItem"("packageId", "kind", "sortOrder");

-- CreateIndex
CREATE INDEX "TourGalleryImage_packageId_sortOrder_idx" ON "TourGalleryImage"("packageId", "sortOrder");

-- CreateIndex
CREATE INDEX "Campaign_active_sortOrder_idx" ON "Campaign"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "Testimonial_published_sortOrder_idx" ON "Testimonial"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "AboutGalleryImage_sortOrder_idx" ON "AboutGalleryImage"("sortOrder");

-- CreateIndex
CREATE INDEX "TeamMember_published_sortOrder_idx" ON "TeamMember"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "Milestone_published_sortOrder_idx" ON "Milestone"("published", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PageSeo_pageKey_key" ON "PageSeo"("pageKey");

-- CreateIndex
CREATE INDEX "Enquiry_type_status_idx" ON "Enquiry"("type", "status");

-- CreateIndex
CREATE INDEX "Enquiry_createdAt_idx" ON "Enquiry"("createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_archived_idx" ON "Enquiry"("archived");

-- CreateIndex
CREATE INDEX "EnquiryNote_enquiryId_createdAt_idx" ON "EnquiryNote"("enquiryId", "createdAt");
