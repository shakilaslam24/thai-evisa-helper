"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel } from "./ui";
import { IconCheck, IconClose } from "@/components/ui/icons";

/**
 * Search Console / sitemap dashboard.
 *
 * Deliberately shows only real state — verification tokens actually saved, the
 * live sitemap URL, the true count of indexable pages. There is no "request
 * indexing" button, because no such thing can be honestly offered without
 * Google's own API (brief §20).
 */
export function SearchConsolePanel({
  origin,
  allowIndexing,
  googleVerified,
  bingVerified,
  sitemapUrlCount,
  visaCount,
  tourCount,
  staticRouteCount,
  defaultTitle,
  defaultDescription,
  generatedAt,
}: {
  origin: string;
  allowIndexing: boolean;
  googleVerified: boolean;
  bingVerified: boolean;
  sitemapUrlCount: number;
  visaCount: number;
  tourCount: number;
  staticRouteCount: number;
  defaultTitle: string;
  defaultDescription: string;
  generatedAt: string;
}) {
  const sitemapUrl = `${origin}/sitemap.xml`;
  const robotsUrl = `${origin}/robots.txt`;

  return (
    <div className="grid gap-6">
      <Panel
        title="Search Console"
        description="Verification and sitemap status. Everything here reflects what the live site is actually serving."
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <Row label="Site URL" value={origin} />
          <Row
            label="Search engine indexing"
            value={allowIndexing ? "Allowed" : "Blocked site-wide"}
            tone={allowIndexing ? "good" : "warn"}
          />
          <Row
            label="Google verification"
            value={googleVerified ? "Token saved" : "Not set"}
            tone={googleVerified ? "good" : "neutral"}
          />
          <Row
            label="Bing verification"
            value={bingVerified ? "Token saved" : "Not set"}
            tone={bingVerified ? "good" : "neutral"}
          />
        </dl>

        {!allowIndexing ? (
          <p className="mt-5 rounded-sm border border-line-gold bg-gold-50 px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-muted">
            <strong className="font-semibold text-ink">Indexing is switched off.</strong> Google is
            being told to ignore the whole site and the sitemap is served empty. Turn it on in
            Global Settings before launch.
          </p>
        ) : null}

        {!googleVerified ? (
          <div className="mt-5 rounded-sm border border-line bg-surface-alt px-4 py-4">
            <h3 className="text-[0.875rem] font-semibold text-ink">How to verify with Google</h3>
            <ol className="mt-2 space-y-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">
              <li>
                1. Open Google Search Console and add {origin.replace(/^https?:\/\//, "")} as a
                property.
              </li>
              <li>
                2. Choose the <strong className="text-ink">HTML tag</strong> method. Google shows a
                tag like{" "}
                <code className="text-[0.75rem]">
                  &lt;meta name=&quot;google-site-verification&quot; content=&quot;XYZ&quot; /&gt;
                </code>
              </li>
              <li>
                3. Copy only the <strong className="text-ink">XYZ</strong> part into Global Settings
                → Search Console verification, and save.
              </li>
              <li>4. Deploy, then press Verify in Search Console.</li>
            </ol>
            <Link href="/admin/settings" className="link-arrow mt-3 text-[0.8125rem]">
              Open Global Settings
            </Link>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Sitemap"
        description="Generated automatically. New published pages appear without any code change."
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <Row label="Sitemap URL" value={sitemapUrl} />
          <Row
            label="Status"
            value={allowIndexing ? "Live" : "Empty (indexing off)"}
            tone={allowIndexing ? "good" : "warn"}
          />
          <Row label="Pages included" value={String(sitemapUrlCount)} />
          <Row label="Generated" value={new Date(generatedAt).toLocaleString("en-GB")} />
        </dl>

        <p className="mt-4 text-[0.8125rem] text-ink-muted">
          {staticRouteCount} main pages · {visaCount} visa {visaCount === 1 ? "page" : "pages"} ·{" "}
          {tourCount} tour {tourCount === 1 ? "package" : "packages"}
        </p>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
          <CopyButton value={sitemapUrl} label="Copy sitemap URL" />
          <a href="/sitemap.xml" target="_blank" rel="noopener" className="btn btn-outline btn-sm">
            Open sitemap
          </a>
          <a href="/robots.txt" target="_blank" rel="noopener" className="btn btn-outline btn-sm">
            Open robots.txt
          </a>
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
          >
            Open Search Console
          </a>
        </div>

        <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-muted">
          To submit it: open Search Console → <strong className="text-ink">Sitemaps</strong>, paste{" "}
          <code className="text-[0.75rem]">sitemap.xml</code> and press Submit. You only need to do
          this once — Google re-reads it on its own afterwards.
        </p>
      </Panel>

      <Panel title="robots.txt">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Row label="URL" value={robotsUrl} />
          <Row label="Admin and API" value="Blocked from crawlers" tone="good" />
        </dl>
      </Panel>

      <Panel title="Site-wide defaults" description="Used by any page without its own values.">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Row
            label="Default title"
            value={defaultTitle || "— not set —"}
            tone={defaultTitle ? "neutral" : "warn"}
          />
          <Row
            label="Default description"
            value={defaultDescription || "— not set —"}
            tone={defaultDescription ? "neutral" : "warn"}
          />
        </dl>
        <Link href="/admin/settings" className="link-arrow mt-4 text-[0.8125rem]">
          Edit in Global Settings
        </Link>
      </Panel>
    </div>
  );
}

function Row({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "neutral";
}) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
        {label}
      </dt>
      <dd className="mt-1 flex items-start gap-1.5 break-all text-[0.875rem] text-ink">
        {tone === "good" ? (
          <IconCheck
            width={15}
            height={15}
            className="mt-0.5 shrink-0 text-[#0f6b3f]"
            aria-hidden="true"
          />
        ) : tone === "warn" ? (
          <IconClose
            width={15}
            height={15}
            className="mt-0.5 shrink-0 text-[#8c1d18]"
            aria-hidden="true"
          />
        ) : null}
        <span>{value}</span>
      </dd>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard access can be refused; the URL is shown above regardless.
        }
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
