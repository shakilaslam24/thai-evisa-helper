import Image from "next/image";
import Link from "next/link";
import { FOOTER_COMPANY_LINKS, FOOTER_SERVICE_LINKS } from "@/lib/nav";
import { IconMail, IconPhone, IconPin } from "@/components/ui/icons";
import type { SiteSettings } from "@/lib/settings";
import { numberLabel, telHref } from "@/lib/settings";

const SOCIALS = [
  { key: "facebookUrl", label: "Facebook" },
  { key: "instagramUrl", label: "Instagram" },
  { key: "tiktokUrl", label: "TikTok" },
  { key: "youtubeUrl", label: "YouTube" },
  { key: "linkedinUrl", label: "LinkedIn" },
] as const;

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  const socials = SOCIALS.map((s) => ({ ...s, url: settings[s.key] })).filter((s) => s.url);
  const phones = settings.footerPhones;
  // A label only earns its place when it distinguishes one number from another.
  const showPhoneLabels = new Set(phones.map((phone) => numberLabel(phone))).size > 1;
  const emails = settings.footerEmails;

  return (
    <footer className="on-navy panel-navy-deep mobile-bar-offset">
      <div className="container-df section-sm">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-10">
          {/* Brand */}
          <div>
            <Link href="/" aria-label={`${settings.companyName} — home`} className="inline-block">
              <Image
                src={settings.logoDarkUrl}
                alt={settings.companyName}
                width={442}
                height={160}
                className="h-11 w-auto"
              />
            </Link>
            {settings.tagline ? (
              <p className="mt-5 font-display text-[0.9375rem] tracking-[-0.01em] text-gold-200">
                {settings.tagline}
              </p>
            ) : null}
            {settings.footerText ? (
              <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-on-navy-muted">
                {settings.footerText}
              </p>
            ) : null}

            {socials.length > 0 ? (
              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
                {socials.map((social) => (
                  <li key={social.key}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer me"
                      className="inline-flex min-h-[24px] items-center text-[0.8125rem] font-medium text-on-navy-subtle underline-offset-4 transition-colors hover:text-gold-200 hover:underline"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <FooterColumn title="Services" links={FOOTER_SERVICE_LINKS} />
          <FooterColumn title="Company" links={FOOTER_COMPANY_LINKS} />
          {/* Contact */}
          <div>
            <h2 className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-gold-200">
              Get in Touch
            </h2>
            <ul className="mt-5 space-y-3.5 text-[0.9375rem]">
              {phones.map((phone) => (
                <li key={phone.id}>
                  <a
                    href={telHref(phone.number)}
                    className="inline-flex min-h-[28px] items-start gap-2.5 text-on-navy-muted transition-colors hover:text-white"
                  >
                    <IconPhone width={17} height={17} className="mt-0.5 shrink-0 text-gold-300" />
                    <span>
                      {phone.number}
                      {showPhoneLabels ? (
                        <span className="block text-[0.75rem] text-on-navy-subtle">
                          {numberLabel(phone)}
                        </span>
                      ) : null}
                    </span>
                  </a>
                </li>
              ))}
              {emails.map((entry) => (
                <li key={entry.id}>
                  <a
                    href={`mailto:${entry.address}`}
                    className="inline-flex min-h-[28px] items-start gap-2.5 break-all text-on-navy-muted transition-colors hover:text-white"
                  >
                    <IconMail width={17} height={17} className="mt-0.5 shrink-0 text-gold-300" />
                    <span>{entry.address}</span>
                  </a>
                </li>
              ))}
              {settings.addressLines.length > 0 ? (
                <li className="flex items-start gap-2.5 text-on-navy-muted">
                  <IconPin width={17} height={17} className="mt-0.5 shrink-0 text-gold-300" />
                  <address className="not-italic leading-relaxed">
                    {settings.addressLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                </li>
              ) : null}
              {settings.officeHourRows.length > 0 ? (
                <li className="pt-1 text-[0.875rem] text-on-navy-subtle">
                  {settings.officeHourRows.map((hour) => (
                    <span key={hour.id} className="block">
                      {hour.label}: {hour.value}
                    </span>
                  ))}
                </li>
              ) : settings.officeHours ? (
                <li className="pt-1 text-[0.875rem] text-on-navy-subtle">{settings.officeHours}</li>
              ) : null}
            </ul>
          </div>
        </div>
        <div className="mt-14 border-t border-white/10 pt-7">
          <div className="flex flex-col gap-3 text-[0.8125rem] text-on-navy-subtle sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {year} {settings.companyName}. All rights reserved.
            </p>
            <p className="text-on-navy-subtle">
              Visa decisions rest with the relevant embassy or immigration authority.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h2 className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-gold-200">
        {title}
      </h2>
      <ul className="mt-5 space-y-3 text-[0.9375rem]">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex min-h-[26px] items-center text-on-navy-muted underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
