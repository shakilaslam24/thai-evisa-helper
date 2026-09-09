"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";
import { IconClose, IconMenu, IconPhone, IconWhatsApp } from "@/components/ui/icons";
import { whatsappHref } from "@/lib/whatsapp";

type HeaderPhone = { id: string; number: string; label: string; customLabel: string };

type Props = {
  companyName: string;
  logoLightUrl: string;
  whatsappDigits: string;
  primaryPhone: string;
  /** Numbers an administrator chose to surface in the header. */
  headerPhones: HeaderPhone[];
};

export function SiteHeader({
  companyName,
  logoLightUrl,
  whatsappDigits,
  primaryPhone,
  headerPhones,
}: Props) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const waHref = whatsappHref(whatsappDigits);

  // Subtle sticky treatment: a hairline and a touch of blur once the page moves.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the panel on navigation.
  useEffect(() => setMenuOpen(false), [pathname]);

  // Lock the page, trap Escape, and move focus while the panel is open.
  useEffect(() => {
    if (!menuOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-b border-line bg-[rgb(251_250_248/0.88)] shadow-[0_1px_0_0_rgb(16_31_64/0.04)] backdrop-blur-md"
          : "border-b border-transparent bg-canvas"
      }`}
    >
      <div className="container-df">
        <div
          className={`flex items-center justify-between gap-6 transition-[height] duration-300 ${
            scrolled ? "h-[68px]" : "h-[84px]"
          }`}
        >
          <Link href="/" className="shrink-0" aria-label={`${companyName} — home`}>
            <Image
              src={logoLightUrl}
              alt={companyName}
              width={442}
              height={160}
              priority
              className={`w-auto transition-[height] duration-300 ${scrolled ? "h-8" : "h-10"}`}
            />
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isActivePath(item.href, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative rounded-xs px-3 py-2 text-[0.875rem] font-medium transition-colors duration-200 ${
                        active ? "text-navy-900" : "text-ink-muted hover:text-navy-900"
                      }`}
                    >
                      {item.label}
                      <span
                        className={`absolute inset-x-3 -bottom-0.5 h-px origin-left bg-gold-400 transition-transform duration-300 ${
                          active ? "scale-x-100" : "scale-x-0"
                        }`}
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {headerPhones.length > 0 ? (
              <span className="hidden items-center gap-3 pr-1 xl:flex">
                {headerPhones.map((phone) => (
                  <a
                    key={phone.id}
                    href={`tel:${phone.number.replace(/[^\d+]/g, "")}`}
                    className="inline-flex min-h-[24px] items-center gap-1.5 text-[0.8125rem] font-medium text-ink-muted transition-colors hover:text-navy-900"
                  >
                    <IconPhone width={14} height={14} className="text-gold-500" />
                    {phone.number}
                  </a>
                ))}
              </span>
            ) : null}

            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm hidden sm:inline-flex"
              >
                <IconWhatsApp width={16} height={16} />
                WhatsApp Us
              </a>
            ) : null}

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="btn btn-ghost btn-sm -mr-2 lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <IconMenu width={22} height={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile panel */}
      <div
        id="mobile-menu"
        // `overflow-hidden` clips the off-screen panel so it never widens the page.
        className={`fixed inset-0 z-50 overflow-hidden lg:hidden ${menuOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 h-full w-full cursor-default bg-navy-950/45 transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          role="dialog"
          aria-modal={menuOpen || undefined}
          aria-label="Menu"
          className={`absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col bg-canvas shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.22,0.68,0.36,1)] ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-[84px] items-center justify-between border-b border-line px-5">
            <Image
              src={logoLightUrl}
              alt={companyName}
              width={442}
              height={160}
              className="h-8 w-auto"
            />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setMenuOpen(false)}
              className="btn btn-ghost btn-sm -mr-2"
              aria-label="Close menu"
            >
              <IconClose width={22} height={22} />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-4">
            <ul>
              {NAV_ITEMS.map((item) => {
                const active = isActivePath(item.href, pathname);
                return (
                  <li key={item.href} className="border-b border-line last:border-0">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[52px] items-center gap-3 font-display text-[1.0625rem] font-semibold tracking-[-0.015em] ${
                        active ? "text-navy-900" : "text-ink-muted"
                      }`}
                    >
                      <span
                        className={`h-1 w-1 rounded-full transition-colors ${
                          active ? "bg-gold-400" : "bg-transparent"
                        }`}
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="space-y-2 border-t border-line p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-block"
              >
                <IconWhatsApp width={17} height={17} />
                WhatsApp Us
              </a>
            ) : null}
            {primaryPhone ? (
              <a
                href={`tel:${primaryPhone.replace(/[^\d+]/g, "")}`}
                className="btn btn-outline btn-block"
              >
                <IconPhone width={17} height={17} />
                {primaryPhone}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
