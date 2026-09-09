"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconClose, IconMenu } from "@/components/ui/icons";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Admin navigation.
 *
 * A short, fixed list. This panel manages the website — it is deliberately not
 * a second CRM (brief §14).
 */
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", exact: true }],
  },
  {
    label: "Website",
    items: [
      { href: "/admin/home", label: "Home" },
      { href: "/admin/visa", label: "Visa Destinations" },
      { href: "/admin/tours", label: "Tour Packages" },
      { href: "/admin/campaigns", label: "Campaigns" },
      { href: "/admin/testimonials", label: "Testimonials" },
      { href: "/admin/about", label: "About Page" },
      { href: "/admin/media", label: "Media" },
    ],
  },
  {
    label: "Enquiries",
    items: [{ href: "/admin/enquiries", label: "All Enquiries" }],
  },
  {
    label: "Configuration",
    items: [
      { href: "/admin/seo", label: "SEO" },
      { href: "/admin/settings", label: "Global Settings" },
      { href: "/admin/audit", label: "Activity Log" },
    ],
  },
] as const;

export function AdminShell({
  user,
  newEnquiryCount,
  children,
  signOut,
}: {
  user: SessionUser;
  newEnquiryCount: number;
  children: React.ReactNode;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-6 last:mb-0">
          <h2 className="px-3 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-white/35">
            {group.label}
          </h2>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                "exact" in item && item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between gap-2 rounded-sm px-3 py-2 text-[0.875rem] font-medium transition-colors ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/65 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`h-1 w-1 rounded-full ${active ? "bg-gold-400" : "bg-transparent"}`}
                        aria-hidden="true"
                      />
                      {item.label}
                    </span>
                    {item.href === "/admin/enquiries" && newEnquiryCount > 0 ? (
                      <span className="rounded-full bg-gold-400 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-navy-950">
                        {newEnquiryCount > 99 ? "99+" : newEnquiryCount}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-white/10 p-4">
      <p className="truncate text-[0.875rem] font-medium text-white">{user.name}</p>
      <p className="truncate text-[0.75rem] text-white/45">
        {user.email} · {user.role}
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          href="/"
          target="_blank"
          rel="noopener"
          className="btn btn-outline-invert btn-sm flex-1"
        >
          View site
        </Link>
        <form action={signOut} className="flex-1">
          <button type="submit" className="btn btn-outline-invert btn-sm btn-block">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-navy-900 lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/admin" className="inline-block">
            <Image
              src="/brand/logo-horizontal-white.png"
              alt="DreamFly Consultancy"
              width={442}
              height={160}
              className="h-8 w-auto"
            />
          </Link>
        </div>
        {nav}
        {account}
      </aside>

      {/* Mobile bar */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-navy-900 px-4 lg:hidden">
        <Link href="/admin">
          <Image
            src="/brand/logo-horizontal-white.png"
            alt="DreamFly Consultancy"
            width={442}
            height={160}
            className="h-7 w-auto"
          />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-outline-invert btn-sm"
          aria-label="Open admin menu"
          aria-expanded={open}
        >
          <IconMenu width={20} height={20} />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-navy-950/60"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(18rem,86vw)] flex-col bg-navy-900">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <Image
                src="/brand/logo-horizontal-white.png"
                alt="DreamFly Consultancy"
                width={442}
                height={160}
                className="h-7 w-auto"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-outline-invert btn-sm"
              >
                <IconClose width={20} height={20} />
              </button>
            </div>
            {nav}
            {account}
          </div>
        </div>
      ) : null}

      <main className="min-w-0">{children}</main>
    </div>
  );
}
