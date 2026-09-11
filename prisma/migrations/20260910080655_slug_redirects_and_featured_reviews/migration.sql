-- CreateTable
CREATE TABLE "SlugRedirect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "oldSlug" TEXT NOT NULL,
    "newSlug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Testimonial_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Testimonial" ("authorName", "authorTitle", "avatarId", "createdAt", "destination", "id", "isPlaceholder", "published", "quote", "rating", "reviewDate", "serviceType", "sortOrder") SELECT "authorName", "authorTitle", "avatarId", "createdAt", "destination", "id", "isPlaceholder", "published", "quote", "rating", "reviewDate", "serviceType", "sortOrder" FROM "Testimonial";
DROP TABLE "Testimonial";
ALTER TABLE "new_Testimonial" RENAME TO "Testimonial";
CREATE INDEX "Testimonial_published_featured_sortOrder_idx" ON "Testimonial"("published", "featured", "sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SlugRedirect_kind_oldSlug_idx" ON "SlugRedirect"("kind", "oldSlug");

-- CreateIndex
CREATE UNIQUE INDEX "SlugRedirect_kind_oldSlug_key" ON "SlugRedirect"("kind", "oldSlug");

