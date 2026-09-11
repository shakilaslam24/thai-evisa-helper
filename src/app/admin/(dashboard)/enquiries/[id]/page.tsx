import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { EnquiryStatusForm, EnquiryNoteForm } from "@/components/admin/enquiry-detail-forms";
import { formatDateTime } from "@/lib/format";
import { readPayload } from "@/lib/enquiries/dispatch";
import { ENQUIRY_TYPES } from "@/lib/validation/enquiry";
import { labelFor } from "@/lib/list";
import { getSettings, telHref } from "@/lib/settings";
import { whatsappHref } from "@/lib/whatsapp";

export const metadata = { title: "Enquiry" };

/** Turns a payload key such as "checkIn" into "Check in". */
function humanise(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export default async function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [enquiry, settings] = await Promise.all([
    db.enquiry.findUnique({
      where: { id },
      include: { notes: { orderBy: { createdAt: "desc" } } },
    }),
    getSettings(),
  ]);

  if (!enquiry) notFound();

  const payload = readPayload(enquiry.payloadJson);
  const payloadRows = Object.entries(payload).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && String(value).trim() !== "";
  });

  const attribution = (
    [
      ["Landing page", enquiry.sourcePage],
      ["Referrer", enquiry.referrer],
      ["UTM source", enquiry.utmSource],
      ["UTM medium", enquiry.utmMedium],
      ["UTM campaign", enquiry.utmCampaign],
      ["UTM content", enquiry.utmContent],
      ["UTM term", enquiry.utmTerm],
    ] satisfies Array<[string, string]>
  ).filter(([, value]) => value.trim() !== "");

  const contactNumber = (enquiry.whatsapp || enquiry.phone).replace(/\D/g, "");
  const waHref = whatsappHref(contactNumber, {
    kind: "raw",
    message: `Hello ${enquiry.name}, this is ${settings.companyName} following up on your enquiry.`,
  });

  return (
    <>
      <PageHeader
        title={enquiry.name}
        description={`${labelFor(ENQUIRY_TYPES, enquiry.type)} enquiry · received ${formatDateTime(enquiry.createdAt)}`}
        backHref="/admin/enquiries"
        backLabel="All enquiries"
        actions={<StatusBadge value={enquiry.status} />}
      />

      <PageBody>
        <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-6">
            <Panel title="Contact">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Detail label="Name" value={enquiry.name} />
                <Detail
                  label="Phone"
                  value={enquiry.phone}
                  href={enquiry.phone ? telHref(enquiry.phone) : undefined}
                />
                <Detail label="WhatsApp" value={enquiry.whatsapp || "—"} />
                <Detail
                  label="Email"
                  value={enquiry.email || "—"}
                  href={enquiry.email ? `mailto:${enquiry.email}` : undefined}
                />
                <Detail label="Service" value={enquiry.service || "—"} />
                <Detail label="Destination" value={enquiry.destination || "—"} />
              </dl>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    Reply on WhatsApp
                  </a>
                ) : null}
                {enquiry.phone ? (
                  <a href={telHref(enquiry.phone)} className="btn btn-outline btn-sm">
                    Call {enquiry.phone}
                  </a>
                ) : null}
              </div>
            </Panel>

            {enquiry.message ? (
              <Panel title="Message">
                <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink-muted">
                  {enquiry.message}
                </p>
              </Panel>
            ) : null}

            {payloadRows.length > 0 ? (
              <Panel title="Request details">
                <dl className="grid gap-3 sm:grid-cols-2">
                  {payloadRows.map(([key, value]) => (
                    <Detail
                      key={key}
                      label={humanise(key)}
                      value={Array.isArray(value) ? value.join(", ") : String(value)}
                    />
                  ))}
                </dl>
              </Panel>
            ) : null}

            <Panel
              title="Internal notes"
              description="Visible to your team only. Never shown to the visitor."
            >
              <EnquiryNoteForm enquiryId={enquiry.id} />

              {enquiry.notes.length > 0 ? (
                <ul className="mt-6 space-y-4 border-t border-line pt-5">
                  {enquiry.notes.map((note) => (
                    <li key={note.id}>
                      <p className="whitespace-pre-wrap text-[0.875rem] leading-relaxed text-ink-muted">
                        {note.body}
                      </p>
                      <p className="mt-1 text-[0.75rem] text-ink-subtle">
                        {note.authorName || "Team"} · {formatDateTime(note.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Status">
              <EnquiryStatusForm enquiryId={enquiry.id} status={enquiry.status} />
            </Panel>

            <Panel title="Where this came from">
              {attribution.length === 0 ? (
                <p className="text-[0.875rem] text-ink-muted">
                  Direct visit — no campaign parameters were present.
                </p>
              ) : (
                <dl className="space-y-2.5">
                  {attribution.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                        {label}
                      </dt>
                      <dd className="mt-0.5 break-all text-[0.8125rem] text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="mt-4 border-t border-line pt-4 text-[0.75rem] leading-relaxed text-ink-subtle">
                Captured from the visitor's landing URL. No cookies or personal tracking are used.
              </p>
            </Panel>
          </div>
        </div>
      </PageBody>
    </>
  );
}

function Detail({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[0.9375rem] text-ink">
        {href ? (
          <a href={href} className="underline-offset-4 hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
