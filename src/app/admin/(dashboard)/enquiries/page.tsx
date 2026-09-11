import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { DataTable, EmptyState, PageBody, PageHeader, StatusBadge } from "@/components/admin/ui";
import { EnquiryFilters } from "@/components/admin/enquiry-filters";
import { ExportButton } from "@/components/admin/export-button";
import { formatDateTime } from "@/lib/format";
import { ENQUIRY_STATUSES, ENQUIRY_TYPES } from "@/lib/validation/enquiry";
import { ENQUIRY_SORTS } from "@/lib/validation/admin";
import { labelFor } from "@/lib/list";

export const metadata = { title: "Enquiries" };

const PAGE_SIZE = 40;

type Search = Promise<{ type?: string; status?: string; q?: string; page?: string; sort?: string }>;

export default async function EnquiriesPage({ searchParams }: { searchParams: Search }) {
  const user = await requireAdmin();
  const params = await searchParams;

  const type = ENQUIRY_TYPES.some((t) => t.value === params.type) ? params.type! : "";
  const status = ENQUIRY_STATUSES.some((s) => s.value === params.status) ? params.status! : "";
  const query = (params.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const sort = ENQUIRY_SORTS.some((s) => s.value === params.sort) ? params.sort! : "newest";

  const ORDER_BY = {
    newest: [{ createdAt: "desc" as const }],
    oldest: [{ createdAt: "asc" as const }],
    name: [{ name: "asc" as const }],
    // Newest within each status, so the freshest untouched enquiries lead.
    status: [{ status: "asc" as const }, { createdAt: "desc" as const }],
  };

  const where = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { phone: { contains: query } },
            { email: { contains: query } },
            { destination: { contains: query } },
            { message: { contains: query } },
          ],
        }
      : {}),
  };

  const [enquiries, total] = await Promise.all([
    db.enquiry.findMany({
      where,
      orderBy: ORDER_BY[sort as keyof typeof ORDER_BY],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.enquiry.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (next: Record<string, string>) => {
    const search = new URLSearchParams({
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(query ? { q: query } : {}),
      ...(sort !== "newest" ? { sort } : {}),
      ...next,
    });
    const qs = search.toString();
    return `/admin/enquiries${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Every form on the website lands here. This is a simple inbox, not a CRM — record the outcome and move on."
        actions={user.role !== "editor" ? <ExportButton type={type} status={status} /> : undefined}
      />

      <PageBody>
        <EnquiryFilters type={type} status={status} query={query} sort={sort} />

        <div className="mt-6">
          {enquiries.length === 0 ? (
            <EmptyState
              title={
                total === 0 && !query && !type && !status ? "No enquiries yet" : "Nothing matches"
              }
              description={
                total === 0 && !query && !type && !status
                  ? "Submissions from the contact, air ticket, hotel and B2B forms will appear here."
                  : "Try a different filter or search term."
              }
            />
          ) : (
            <>
              <DataTable head={["Received", "Name", "Type", "Interested in", "Source", "Status"]}>
                {enquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-[0.8125rem] text-ink-subtle">
                      {formatDateTime(enquiry.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/enquiries/${enquiry.id}`}
                        className="font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {enquiry.name}
                      </Link>
                      <p className="text-[0.75rem] text-ink-subtle">{enquiry.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-ink-muted">
                      {labelFor(ENQUIRY_TYPES, enquiry.type)}
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-ink-muted">
                      {enquiry.destination || enquiry.service || "—"}
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-ink-subtle">
                      {enquiry.utmSource || enquiry.utmCampaign ? (
                        <span
                          title={`${enquiry.utmSource} / ${enquiry.utmMedium} / ${enquiry.utmCampaign}`}
                        >
                          {enquiry.utmSource || "—"}
                        </span>
                      ) : (
                        "Direct"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={enquiry.status} />
                    </td>
                  </tr>
                ))}
              </DataTable>

              <div className="mt-5 flex items-center justify-between gap-4">
                <p className="text-[0.8125rem] text-ink-muted">
                  {total} enquir{total === 1 ? "y" : "ies"} · page {page} of {pages}
                </p>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link
                      href={buildHref({ page: String(page - 1) })}
                      className="btn btn-outline btn-sm"
                    >
                      Previous
                    </Link>
                  ) : null}
                  {page < pages ? (
                    <Link
                      href={buildHref({ page: String(page + 1) })}
                      className="btn btn-outline btn-sm"
                    >
                      Next
                    </Link>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </PageBody>
    </>
  );
}
