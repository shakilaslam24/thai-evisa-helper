import Link from "next/link";
import { IconArrowRight } from "./icons";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "start" | "center";
  cta?: { label: string; href: string } | null;
  as?: "h1" | "h2";
};

/**
 * One heading treatment for every section — the main reason the site reads as a
 * single system rather than a collection of pages.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "start",
  cta,
  as: Tag = "h2",
}: Props) {
  const centered = align === "center";

  return (
    <div
      className={`flex flex-col gap-6 ${
        centered
          ? "items-center text-center"
          : "md:flex-row md:items-end md:justify-between md:gap-10"
      }`}
    >
      <div className={centered ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow ? (
          <p className={`eyebrow ${centered ? "eyebrow-center" : ""}`}>{eyebrow}</p>
        ) : null}
        <Tag className="mt-5 text-h2 font-semibold">{title}</Tag>
        {description ? <p className="lead mt-4">{description}</p> : null}
      </div>

      {cta ? (
        <Link href={cta.href} className="link-arrow shrink-0">
          {cta.label}
          <IconArrowRight />
        </Link>
      ) : null}
    </div>
  );
}
