import Link from "next/link";
import { IconChevronDown } from "@/components/ui/icons";

export type Crumb = { name: string; path: string };

/**
 * The shared inner-page header: a navy band with breadcrumbs and the page
 * title. Using one component everywhere is what makes the inner pages feel
 * like one site rather than seven.
 */
export function PageHero({
  eyebrow,
  title,
  titleAccent,
  description,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  description?: string;
  crumbs: Crumb[];
  children?: React.ReactNode;
}) {
  return (
    <section className="on-navy panel-navy relative isolate overflow-hidden">
      <svg
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.16]"
        viewBox="0 0 1200 340"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M-100 300 C 320 200, 720 140, 1300 30"
          fill="none"
          stroke="#c19864"
          strokeWidth="1.4"
        />
        <path
          d="M-100 340 C 360 250, 780 190, 1300 92"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1"
          strokeOpacity="0.35"
        />
      </svg>

      <div className="container-df pb-14 pt-8 sm:pb-16 sm:pt-10">
        <Breadcrumbs crumbs={crumbs} />

        <div className="mt-9 max-w-3xl">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="mt-5 text-h1 font-semibold">
            {title}
            {titleAccent ? <span className="accent"> {titleAccent}</span> : null}
          </h1>
          {description ? <p className="lead mt-5">{description}</p> : null}
          {children}
        </div>
      </div>
    </section>
  );
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-[0.8125rem]">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-1">
              {index > 0 ? (
                <IconChevronDown
                  width={13}
                  height={13}
                  className="-rotate-90 text-white/30"
                  aria-hidden="true"
                />
              ) : null}
              {isLast ? (
                <span
                  className="inline-flex min-h-[26px] items-center text-white/80"
                  aria-current="page"
                >
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className="inline-flex min-h-[26px] items-center text-white/55 underline-offset-4 transition-colors hover:text-gold-200 hover:underline"
                >
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
