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
import { createVisaAction, setVisaStatusAction } from "./actions";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Visa Destinations" };

export default async function VisaListPage() {
  await requireAdmin();

  const destinations = await db.visaDestination.findMany({
    orderBy: [{ status: "asc" }, { featuredOrder: "asc" }, { countryName: "asc" }],
  });

  const published = destinations.filter(
    (row) => row.status === "published" && !row.isPlaceholder,
  ).length;

  return (
    <>
      <PageHeader
        title="Visa Destinations"
        description="One template drives every country page. Add a destination, fill in the real requirements, and publish — no code changes needed."
      />

      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:items-start">
          <div>
            {destinations.length === 0 ? (
              <EmptyState
                title="No destinations yet"
                description="Create your first visa destination using the panel on the right."
              />
            ) : (
              <DataTable head={["Country", "Status", "Featured", "Processing", "Updated", ""]}>
                {destinations.map((destination) => (
                  <tr key={destination.id} className="align-middle">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/visa/${destination.id}`}
                        className="font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {destination.countryName}
                      </Link>
                      <p className="text-[0.75rem] text-ink-subtle">/visa/{destination.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge value={destination.status} />
                        {destination.isPlaceholder ? <SampleBadge /> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-ink-muted">
                      {destination.featured ? `Yes · ${destination.featuredOrder}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-ink-muted">
                      {destination.processingTime || "—"}
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-ink-subtle">
                      {formatDate(destination.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={setVisaStatusAction} className="inline">
                        <input type="hidden" name="id" value={destination.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={destination.status === "published" ? "draft" : "published"}
                        />
                        <button
                          type="submit"
                          className="btn btn-outline btn-sm"
                          disabled={destination.isPlaceholder && destination.status !== "published"}
                          title={
                            destination.isPlaceholder
                              ? "Clear the sample flag in the editor before publishing."
                              : undefined
                          }
                        >
                          {destination.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>

          <div className="space-y-6">
            <Panel title="Add a destination">
              <form action={createVisaAction} className="grid gap-3">
                <div>
                  <label htmlFor="new-country" className="field-label">
                    Country name
                  </label>
                  <input
                    id="new-country"
                    name="countryName"
                    type="text"
                    required
                    maxLength={120}
                    className="input"
                    placeholder="e.g. Vietnam"
                  />
                  <p className="field-hint">Creates a draft you can fill in next.</p>
                </div>
                <button type="submit" className="btn btn-primary btn-block">
                  Create draft
                </button>
              </form>
            </Panel>

            <Panel title="How publishing works">
              <ul className="space-y-3 text-[0.8125rem] leading-relaxed text-ink-muted">
                <li>
                  <strong className="text-ink">Draft</strong> — invisible to visitors. Use it while
                  you gather fees and requirements.
                </li>
                <li>
                  <strong className="text-ink">Published</strong> — live at its own URL, in the
                  sitemap, and indexable by search engines.
                </li>
                <li>
                  <strong className="text-ink">Sample</strong> — seeded example content. Never shown
                  publicly, whatever its status. Clear the flag once you've entered real
                  information.
                </li>
              </ul>
              <p className="mt-4 border-t border-line pt-4 text-[0.8125rem] text-ink-muted">
                {published} destination{published === 1 ? "" : "s"} currently live.
              </p>
            </Panel>
          </div>
        </div>
      </PageBody>
    </>
  );
}
