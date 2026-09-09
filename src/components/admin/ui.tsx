import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Admin UI primitives.
 *
 * The admin panel uses the same design tokens as the public site, but a denser
 * layout. Keeping these in one file is what stops twelve CRUD screens drifting
 * apart.
 */

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="px-5 py-7 sm:px-8 sm:py-9">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-subtle transition-colors hover:text-ink"
          >
            <span aria-hidden="true">←</span>
            {backLabel ?? "Back"}
          </Link>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-[1.5rem] font-semibold tracking-[-0.025em] text-ink sm:text-[1.75rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="px-5 py-7 sm:px-8 sm:py-9">{children}</div>;
}

export function Panel({
  title,
  description,
  children,
  footer,
  id,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="card overflow-hidden">
      {title ? (
        <header className="border-b border-line px-5 py-4 sm:px-6">
          <h2 className="font-display text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-[0.8125rem] text-ink-muted">{description}</p>
          ) : null}
        </header>
      ) : null}
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      {footer ? (
        <footer className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-alt px-5 py-4 sm:px-6">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

const STATUS_TONE: Record<string, string> = {
  published: "border-transparent bg-[#0f6b3f]/10 text-[#0f6b3f]",
  draft: "border-line bg-surface-alt text-ink-muted",
  archived: "border-line bg-surface-alt text-ink-subtle",
  new: "border-transparent bg-gold-400 text-navy-950",
  contacted: "border-transparent bg-navy-900 text-white",
  follow_up: "border-line-gold bg-gold-50 text-gold-600",
  converted: "border-transparent bg-[#0f6b3f]/10 text-[#0f6b3f]",
  closed: "border-line bg-surface-alt text-ink-subtle",
  sample: "border-transparent bg-[#8c1d18]/10 text-[#8c1d18]",
};

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  const tone = STATUS_TONE[value] ?? "border-line bg-surface-alt text-ink-muted";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] ${tone}`}
    >
      {label ?? value.replace(/_/g, " ")}
    </span>
  );
}

/** Marks seeded example rows so they can never be mistaken for real data. */
export function SampleBadge() {
  return <StatusBadge value="sample" label="Sample" />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <h3 className="font-display text-[1.0625rem] font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[0.875rem] leading-relaxed text-ink-muted">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function DataTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[44rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-surface-alt">
            {head.map((label) => (
              <th
                key={label}
                scope="col"
                className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface">{children}</tbody>
      </table>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
        {label}
      </p>
      <p className="mt-3 font-display text-[1.875rem] font-semibold tabular-nums tracking-[-0.03em] text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[0.8125rem] text-ink-muted">{hint}</p> : null}
    </>
  );

  return href ? (
    <Link href={href} className="card card-interactive block p-5">
      {inner}
    </Link>
  ) : (
    <div className="card p-5">{inner}</div>
  );
}
