import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader } from "@/components/admin/ui";
import { TourForm } from "@/components/admin/tour-form";
import { deleteTourAction } from "../actions";

export const metadata = { title: "Edit package" };

export default async function TourEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ slug?: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;
  const { slug: slugNotice } = await searchParams;

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
        {slugNotice === "adjusted" ? (
          <div className="mb-6 max-w-4xl rounded-md border border-line-gold bg-gold-50 px-5 py-4">
            <p className="text-[0.875rem] leading-relaxed text-ink-muted">
              <strong className="font-semibold text-ink">The web address was adjusted.</strong> A
              package with that name already existed, so a number was added to keep the address
              unique. Change the <strong className="font-semibold text-ink">URL slug</strong> below
              if you would prefer something else — you can still edit it freely at this point.
            </p>
          </div>
        ) : null}

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
