import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { DataTable, EmptyState, PageBody, PageHeader } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Activity Log" };

const PAGE_SIZE = 60;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin("admin");
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.auditLog.count(),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Activity Log"
        description="A record of sign-ins and content changes. Useful when more than one person manages the website."
      />

      <PageBody>
        {entries.length === 0 ? (
          <EmptyState title="Nothing logged yet" description="Admin activity will appear here." />
        ) : (
          <>
            <DataTable head={["When", "Who", "Action", "What"]}>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-[0.8125rem] text-ink-subtle">
                    {formatDateTime(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-[0.8125rem] text-ink-muted">
                    {entry.userEmail ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-line bg-surface-alt px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                      {entry.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[0.8125rem] text-ink">{entry.summary}</td>
                </tr>
              ))}
            </DataTable>

            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="text-[0.8125rem] text-ink-muted">
                {total} entries · page {page} of {pages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <a href={`/admin/audit?page=${page - 1}`} className="btn btn-outline btn-sm">
                    Previous
                  </a>
                ) : null}
                {page < pages ? (
                  <a href={`/admin/audit?page=${page + 1}`} className="btn btn-outline btn-sm">
                    Next
                  </a>
                ) : null}
              </div>
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}
