/** The public navigation. Design-owned: fixed, small, and deliberate. */
export const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/visa", label: "Visa Services" },
  { href: "/tours", label: "Tour Packages" },
  { href: "/air-ticket-hotel", label: "Air Ticket & Hotel" },
  { href: "/b2b", label: "B2B Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const FOOTER_SERVICE_LINKS = [
  { href: "/visa", label: "Visa Services" },
  { href: "/tours", label: "Tour Packages" },
  { href: "/air-ticket-hotel#air-ticket", label: "Air Ticket" },
  { href: "/air-ticket-hotel#hotel", label: "Hotel Booking" },
  { href: "/b2b", label: "B2B Services" },
] as const;

export const FOOTER_COMPANY_LINKS = [
  { href: "/about", label: "About DreamFly" },
  { href: "/contact", label: "Contact" },
] as const;

/** True when `href` is the current page or an ancestor of it. */
export function isActivePath(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
