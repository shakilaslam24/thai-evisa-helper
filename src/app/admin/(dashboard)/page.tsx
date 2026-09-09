import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import { ENQUIRY_TYPES } from "@/lib/validation/enquiry";
import { labelFor } from "@/lib/list";
import { getSettings } from "@/lib/settings";

export default async function AdminDashboard() {
  const user = await requireAdmin();

  const [
    newEnquiries,
    totalEnquiries,
    weekEnquiries,
    publishedVisas,
    placeholderVisas,
    publishedTours,
    activeCampaigns,
    publishedTestimonials,
    recentEnquiries,
    settings,
  ] = await Promise.all([
    db.enquiry.count({ where: { status: "new", archived: false } }),
    db.enquiry.count(),
    db.enquiry.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } }),
    db.visaDestination.count({ where: { status: "published", isPlaceholder: false } }),
    db.visaDestination.count({ where: { isPlaceholder: true } }),
    db.tourPackage.count({ where: { status: "published", isPlaceholder: false } }),
    db.campaign.count({ where: { active: true, isPlaceholder: false } }),
    db.testimonial.count({ where: { published: true, isPlaceholder: false } }),
    db.enquiry.findMany({
      where: { archived: false },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        type: true,
        service: true,
        destination: true,
        status: true,
        createdAt: true,
        utmSource: true,
      },
    }),
    getSettings(),
  ]);

  /** Onboarding checks — real gaps only, no busywork. */
  const setupTasks = [
    {
      done: Boolean(settings.whatsappNumber),
      label: "Add the primary WhatsApp number",
      href: "/admin/settings",
      why: "Every WhatsApp button on the site is hidden until this is set.",
    },
    {
      done: Boolean(settings.googleMapsEmbed),
      label: "Add the Google Maps embed",
      href: "/admin/settings",
      why: "The map on the Contact page appears once this is filled in.",
    },
    {
      done: publishedVisas > 0,
      label: "Publish your first visa destination",
      href: "/admin/visa",
      why: "Sample destinations are drafts and never appear on the public site.",
    },
    {
      done: Boolean(settings.defaultSeoDescription),
      label: "Write the default SEO description",
      href: "/admin/seo",
      why: "Used wherever a page has no description of its own.",
    },
  ];
  const outstanding = setupTasks.filter((task) => !task.done);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description="Everything on the public website is managed from here. This panel is separate from the DreamFly CRM."
        actions={
          <Link href="/admin/enquiries" className="btn btn-primary btn-sm">
            View enquiries
          </Link>
        }
      />

      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="New enquiries"
            value={newEnquiries}
            hint="Awaiting first contact"
            href="/admin/enquiries?status=new"
          />
          <StatCard
            label="Last 7 days"
            value={weekEnquiries}
            hint={`${totalEnquiries} all time`}
            href="/admin/enquiries"
          />
          <StatCard
            label="Published visas"
            value={publishedVisas}
            hint="Live on the website"
            href="/admin/visa"
          />
          <StatCard
            label="Published tours"
            value={publishedTours}
            hint="Live on the website"
            href="/admin/tours"
          />
        </div>

        {outstanding.length > 0 ? (
          <div className="mt-8">
            <Panel
              title="Finish setting up"
              description="A few things still need your real business information before they appear on the site."
            >
              <ul className="space-y-3">
                {outstanding.map((task) => (
                  <li key={task.label} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[0.9375rem] font-medium text-ink">{task.label}</p>
                      <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{task.why}</p>
                    </div>
                    <Link href={task.href} className="btn btn-outline btn-sm shrink-0">
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        ) : null}

        {placeholderVisas > 0 ? (
          <div className="mt-8 rounded-md border border-line-gold bg-gold-50 px-5 py-4">
            <p className="text-[0.875rem] leading-relaxed text-ink-muted">
              <strong className="font-semibold text-ink">
                {placeholderVisas} sample destination{placeholderVisas === 1 ? "" : "s"}
              </strong>{" "}
              are in your library. They are drafts marked as sample content and will never appear on
              the public site. Fill one in with real information and clear its sample flag to
              publish it.{" "}
              <Link
                href="/admin/visa"
                className="font-medium text-ink underline underline-offset-4"
              >
                Review them
              </Link>
              .
            </p>
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Panel title="Recent enquiries">
            {recentEnquiries.length === 0 ? (
              <p className="py-6 text-center text-[0.875rem] text-ink-muted">
                No enquiries yet. They'll appear here as soon as someone submits a form.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {recentEnquiries.map((enquiry) => (
                  <li key={enquiry.id}>
                    <Link
                      href={`/admin/enquiries/${enquiry.id}`}
                      className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-surface-alt"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[0.9375rem] font-medium text-ink">
                          {enquiry.name}
                        </p>
                        <p className="truncate text-[0.8125rem] text-ink-muted">
                          {labelFor(ENQUIRY_TYPES, enquiry.type)}
                          {enquiry.destination ? ` · ${enquiry.destination}` : ""}
                          {enquiry.utmSource ? ` · ${enquiry.utmSource}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusBadge value={enquiry.status} />
                        <span className="hidden text-[0.75rem] text-ink-subtle sm:inline">
                          {formatDateTime(enquiry.createdAt)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Website at a glance">
            <dl className="space-y-3 text-[0.875rem]">
              <Row label="Active campaigns" value={String(activeCampaigns)} />
              <Row label="Published testimonials" value={String(publishedTestimonials)} />
              <Row
                label="Search indexing"
                value={settings.allowIndexing ? "Enabled" : "Disabled"}
              />
              <Row
                label="Analytics"
                value={settings.hasAnalytics ? "Configured" : "Not configured"}
              />
              <Row label="Site URL" value={settings.origin.replace(/^https?:\/\//, "")} />
            </dl>
          </Panel>
        </div>
      </PageBody>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
