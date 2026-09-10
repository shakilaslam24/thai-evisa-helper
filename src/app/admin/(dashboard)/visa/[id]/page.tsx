import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader } from "@/components/admin/ui";
import { VisaForm } from "@/components/admin/visa-form";
import { deleteVisaAction } from "../actions";
import { parseList } from "@/lib/list";

export const metadata = { title: "Edit destination" };

export default async function VisaEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ slug?: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;
  const { slug: slugNotice } = await searchParams;

  const [visa, media] = await Promise.all([
    db.visaDestination.findUnique({
      where: { id },
      include: {
        documents: { orderBy: { sortOrder: "asc" } },
        faqs: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, originalName: true, altText: true },
    }),
  ]);

  if (!visa) notFound();

  return (
    <>
      <PageHeader
        title={visa.countryName}
        description={`Public URL: /visa/${visa.slug}`}
        backHref="/admin/visa"
        backLabel="All destinations"
        actions={
          visa.status === "published" && !visa.isPlaceholder ? (
            <a
              href={`/visa/${visa.slug}`}
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
              destination with that name already existed, so a number was added to keep the address
              unique. Change the <strong className="font-semibold text-ink">URL slug</strong> below
              if you would prefer something else — you can still edit it freely at this point.
            </p>
          </div>
        ) : null}

        <VisaForm
          visa={{
            ...visa,
            categories: parseList(visa.categories),
            visaFormats: parseList(visa.visaFormats),
            entryTypes: parseList(visa.entryTypes),
            documents: visa.documents.map((row) => ({ label: row.label, note: row.note })),
            faqs: visa.faqs.map((row) => ({ question: row.question, answer: row.answer })),
          }}
          media={media}
          canDelete={user.role !== "editor"}
          deleteAction={deleteVisaAction}
        />
      </PageBody>
    </>
  );
}
