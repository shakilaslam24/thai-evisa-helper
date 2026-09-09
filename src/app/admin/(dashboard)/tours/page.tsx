import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import {
  DataTable,
  EmptyState,
  PageBody,
  PageHeader,
  Panel,
  SampleBadge,
  StatusBadge,
} from "@/components/admin/ui";
import { createTourAction, setTourStatusAction } from "./actions";
import { formatDate } from "@/lib/format";
import { AVAILABILITY, PACKAGE_TYPES, labelFor } from "@/lib/list";

export const metadata = { title: "Tour Packages" };

export default async function ToursListPage() {
  await requireAdmin();

  const tours = await db.tourPackage.findMany({
    orderBy: [{ status: "asc" }, { featuredOrder: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Tour Packages"
        description="Group, private and custom packages. Cards on the website stay simple; the detail here is what visitors see on the package page."
      />

      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:items-start">
          {/* min-w-0: without it this grid child widens to fit the table and
              takes the page with it, instead of the table scrolling itself. */}
          <div className="min-w-0">
            {tours.length === 0 ? (
              <EmptyState
                title="No packages yet"
                description="Create your first tour package using the panel on the right."
              />
            ) : (
              <DataTable head={["Package", "Status", "Type", "Availability", "Updated", ""]}>
                {tours.map((tour) => (
                  <tr key={tour.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/tours/${tour.id}`}
                        className="font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {tour.name}
                      </Link>
                      <p className="text-[0.75rem] text-ink-subtle">
                        /tours/{tour.slug}
                        {tour.destination ? ` · ${tour.destination}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge value={tour.status} />
                        {tour.isPlaceholder ? <SampleBadge /> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-ink-muted">
                      {labelFor(PACKAGE_TYPES, tour.packageType)}
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-ink-muted">
                      {labelFor(AVAILABILITY, tour.availability)}
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-ink-subtle">
                      {formatDate(tour.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={setTourStatusAction} className="inline">
                        <input type="hidden" name="id" value={tour.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={tour.status === "published" ? "draft" : "published"}
                        />
                        <button
                          type="submit"
                          className="btn btn-outline btn-sm"
                          disabled={tour.isPlaceholder && tour.status !== "published"}
                          title={
                            tour.isPlaceholder
                              ? "Clear the sample flag in the editor before publishing."
                              : undefined
                          }
                        >
                          {tour.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>

          <Panel title="Add a package">
            <form action={createTourAction} className="grid gap-3">
              <div>
                <label htmlFor="new-tour" className="field-label">
                  Package name
                </label>
                <input
                  id="new-tour"
                  name="name"
                  type="text"
                  required
                  maxLength={180}
                  className="input"
                  placeholder="e.g. Thailand 5 Days"
                />
                <p className="field-hint">Creates a draft you can fill in next.</p>
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                Create draft
              </button>
            </form>
          </Panel>
        </div>
      </PageBody>
    </>
  );
}
