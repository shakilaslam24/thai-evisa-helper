"use client";

import { useEffect, useMemo, useState } from "react";
import { IconClose } from "@/components/ui/icons";

export type MediaOption = {
  id: string;
  url: string;
  originalName: string;
  altText: string;
};

/**
 * Image chooser used across every content form.
 *
 * Renders a hidden input carrying the selected media id, so the surrounding
 * Server Action receives it like any other field. Choosing from the existing
 * library (rather than uploading inline) keeps the media library authoritative
 * and stops the same photo being uploaded five times.
 */
export function MediaPicker({
  label,
  name,
  options,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  options: MediaOption[];
  defaultValue?: string | null;
  hint?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(defaultValue ?? null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((option) => option.id === selectedId) ?? null,
    [options, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.originalName.toLowerCase().includes(q) || option.altText.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div>
      <span className="field-label">{label}</span>
      <input type="hidden" name={name} value={selectedId ?? ""} />

      <div className="flex items-center gap-3">
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-sm border border-line bg-surface-alt">
          {selected ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[0.6875rem] text-ink-subtle">
              None
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setOpen(true)} className="btn btn-outline btn-sm">
            {selected ? "Change" : "Choose image"}
          </button>
          {selected ? (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="btn btn-ghost btn-sm"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {hint ? <p className="field-hint">{hint}</p> : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close image picker"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-navy-950/55"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Choose ${label}`}
            className="relative flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-surface shadow-lg"
          >
            <header className="flex items-center gap-3 border-b border-line px-5 py-4">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the media library…"
                className="input"
                aria-label="Search images"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-ghost btn-sm shrink-0"
              >
                <IconClose width={18} height={18} />
                <span className="sr-only">Close</span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              {filtered.length === 0 ? (
                <p className="py-10 text-center text-[0.875rem] text-ink-muted">
                  No images found. Upload some in the Media section first.
                </p>
              ) : (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {filtered.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(option.id);
                          setOpen(false);
                        }}
                        className={`block w-full overflow-hidden rounded-sm border-2 transition-colors ${
                          option.id === selectedId
                            ? "border-gold-400"
                            : "border-transparent hover:border-line-strong"
                        }`}
                      >
                        <span className="relative block aspect-square bg-surface-alt">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={option.url}
                            alt={option.altText || option.originalName}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </span>
                        <span className="block truncate px-1.5 py-1 text-left text-[0.6875rem] text-ink-muted">
                          {option.originalName}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
