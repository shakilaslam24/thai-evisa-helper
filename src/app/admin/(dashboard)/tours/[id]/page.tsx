import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader } from "@/components/admin/ui";
import { TourForm } from "@/components/admin/tour-form";
import { deleteTourAction } from "../actions";

export const metadata = { title: "Edit package" };

export default async function TourEditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;

  const [tour, media] = await Promise.all([
    db.tourPackage.findUnique({
      where: { id },
      include: {
        highlights: { orderBy: { sortOrder: "asc" } },
        itinerary: { orderBy: { sortOrder: "asc" } },
        listItems: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, originalName: true, altText: true },
    }),
  ]);

  if (!tour) notFound();

  return (
    <>
      <PageHeader
        title={tour.name}
        description={`Public URL: /tours/${tour.slug}`}
        backHref="/admin/tours"
        backLabel="All packages"
        actions={
          tour.status === "published" && !tour.isPlaceholder ? (
            <a
              href={`/tours/${tour.slug}`}
              target="_blank"
              rel="noopener"
              className="btn btn-outline btn-sm"
            >
              View live page
            </a>
          ) : null
        }
      />

      <PageBody>
        <TourForm
          tour={{
            ...tour,
            highlights: tour.highlights.map((row) => row.label).join("\n"),
            includes: tour.listItems
              .filter((row) => row.kind === "include")
              .map((row) => row.label)
              .join("\n"),
            excludes: tour.listItems
              .filter((row) => row.kind === "exclude")
              .map((row) => row.label)
              .join("\n"),
            itinerary: tour.itinerary.map((row) => ({
              dayLabel: row.dayLabel,
              title: row.title,
              body: row.body,
            })),
          }}
          media={media}
          canDelete={user.role !== "editor"}
          deleteAction={deleteTourAction}
        />
      </PageBody>
    </>
  );
}
