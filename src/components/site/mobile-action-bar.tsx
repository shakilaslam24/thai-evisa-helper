"use client";
import { usePathname } from "next/navigation";
import { IconPhone, IconPin, IconWhatsApp } from "@/components/ui/icons";
import { whatsappHref } from "@/lib/whatsapp";

type Props = {
  /** The number the Call button dials — flagged for the mobile bar, else the main one. */
  primaryPhone: string;
  whatsappDigits: string;
  mapsUrl: string;
};

/**
 * Mobile sticky actions — Call, WhatsApp, Location.
 *
 * Kept to a 60px bar with a hairline top edge rather than a floating pill, so
 * it reads as part of the page. Pages add `.mobile-bar-offset` at the bottom so
 * it never covers content, and it is suppressed inside the admin area.
 */
export function MobileActionBar({ primaryPhone, whatsappDigits, mapsUrl }: Props) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  const waHref = whatsappHref(whatsappDigits);
  const actions = [
    primaryPhone
      ? {
          key: "call",
          label: "Call",
          href: `tel:${primaryPhone.replace(/[^\d+]/g, "")}`,
          Icon: IconPhone,
          external: false,
        }
      : null,
    waHref
      ? { key: "whatsapp", label: "WhatsApp", href: waHref, Icon: IconWhatsApp, external: true }
      : null,
    mapsUrl
      ? { key: "map", label: "Location", href: mapsUrl, Icon: IconPin, external: true }
      : null,
  ].filter((action): action is NonNullable<typeof action> => action !== null);

  if (actions.length === 0) return null;

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[rgb(251_250_248/0.94)] backdrop-blur-md md:hidden">
      <nav aria-label="Quick contact" className="pb-[env(safe-area-inset-bottom)]">
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
        >
          {actions.map(({ key, label, href, Icon, external }) => (
            <li key={key} className="border-r border-line last:border-r-0">
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex min-h-[60px] flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold tracking-[0.02em] text-ink-muted transition-colors active:bg-navy-50"
              >
                <Icon width={19} height={19} className="text-navy-900" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
