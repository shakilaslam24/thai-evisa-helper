"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ENQUIRY_STATUSES, ENQUIRY_TYPES } from "@/lib/validation/enquiry";

/**
 * Filter bar for the enquiry inbox. Filters live in the URL so a view can be
 * bookmarked and shared with a colleague.
 */
export function EnquiryFilters({
  type,
  status,
  query,
}: {
  type: string;
  status: string;
  query: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);

  const go = (next: Record<string, string>) => {
    const params = new URLSearchParams({
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(query ? { q: query } : {}),
      ...next,
    });
    for (const [key, value] of [...params.entries()]) {
      if (!value) params.delete(key);
    }
    const qs = params.toString();
    router.push(`/admin/enquiries${qs ? `?${qs}` : ""}`);
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip active={!type} onClick={() => go({ type: "", page: "" })}>
          All types
        </FilterChip>
        {ENQUIRY_TYPES.map((option) => (
          <FilterChip
            key={option.value}
            active={type === option.value}
            onClick={() => go({ type: option.value, page: "" })}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip active={!status} onClick={() => go({ status: "", page: "" })}>
          Any status
        </FilterChip>
        {ENQUIRY_STATUSES.map((option) => (
          <FilterChip
            key={option.value}
            active={status === option.value}
            onClick={() => go({ status: option.value, page: "" })}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          go({ q: search.trim(), page: "" });
        }}
        className="flex max-w-md gap-2"
        role="search"
      >
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, phone, email, destination…"
          className="input"
          aria-label="Search enquiries"
        />
        <button type="submit" className="btn btn-outline shrink-0">
          Search
        </button>
      </form>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors ${
        active
          ? "border-navy-900 bg-navy-900 text-white"
          : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
