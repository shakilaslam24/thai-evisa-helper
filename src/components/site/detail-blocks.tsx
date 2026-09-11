import type { ReactNode } from "react";
import { IconCheck } from "@/components/ui/icons";
import { lines, paragraphs } from "@/lib/format";

/**
 * The building blocks a visa or tour detail page is assembled from.
 *
 * Each one renders nothing when its CMS field is empty, so a sparsely filled
 * destination still produces a clean page instead of a row of empty headings.
 */

export function DetailSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line pt-10 first:border-0 first:pt-0">
      <h2 className="text-h3 font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Multi-paragraph prose from a textarea field. */
export function ProseBlock({ text, title, id }: { text: string; title: string; id?: string }) {
  const blocks = paragraphs(text);
  if (blocks.length === 0) return null;
  return (
    <DetailSection id={id} title={title}>
      <div className="prose-df max-w-2xl text-[0.9375rem] leading-relaxed">
        {blocks.map((block, index) => (
          <p key={index}>{block}</p>
        ))}
      </div>
    </DetailSection>
  );
}

/** A checklist from a line-per-item textarea field. */
export function ChecklistBlock({ text, title, id }: { text: string; title: string; id?: string }) {
  const items = lines(text);
  if (items.length === 0) return null;
  return (
    <DetailSection id={id} title={title}>
      <ul className="grid max-w-3xl gap-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[0.9375rem] leading-relaxed">
            <IconCheck
              width={17}
              height={17}
              className="mt-1 shrink-0 text-gold-500"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}

/** Numbered steps, used for the application process. */
export function StepsBlock({ text, title, id }: { text: string; title: string; id?: string }) {
  const steps = lines(text);
  if (steps.length === 0) return null;
  return (
    <DetailSection id={id} title={title}>
      <ol className="max-w-2xl">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-4 border-b border-line py-4 last:border-0">
            <span className="font-display text-[0.8125rem] font-semibold tabular-nums text-gold-400">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-[0.9375rem] leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
    </DetailSection>
  );
}

/** A definition-style key/value table for fees and facts. */
export function FactTable({
  rows,
  title,
  id,
  note,
}: {
  rows: Array<[label: string, value: string]>;
  title: string;
  id?: string;
  note?: string;
}) {
  const present = rows.filter(([, value]) => value?.trim());
  if (present.length === 0) return null;

  return (
    <DetailSection id={id} title={title}>
      <dl className="max-w-2xl overflow-hidden rounded-md border border-line">
        {present.map(([label, value], index) => (
          <div
            key={label}
            className={`grid gap-1 px-5 py-4 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-6 ${
              index % 2 === 1 ? "bg-surface-alt" : "bg-surface"
            }`}
          >
            <dt className="text-[0.8125rem] font-semibold text-ink">{label}</dt>
            <dd className="text-[0.9375rem] text-ink-muted">{value}</dd>
          </div>
        ))}
      </dl>
      {note?.trim() ? <p className="field-hint mt-3 max-w-2xl">{note}</p> : null}
    </DetailSection>
  );
}

/** Highlighted notice, used for "Important Notes". */
export function NoticeBlock({ text, title }: { text: string; title: string }) {
  const items = lines(text);
  if (items.length === 0) return null;
  return (
    <DetailSection title={title}>
      <div className="max-w-2xl rounded-md border border-line-gold bg-gold-50 p-5">
        <ul className="space-y-2 text-[0.875rem] leading-relaxed text-ink-muted">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-400" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </DetailSection>
  );
}
