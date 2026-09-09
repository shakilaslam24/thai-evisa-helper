"use client";

import { useActionState, useState } from "react";
import {
  deleteMediaAction,
  updateMediaAction,
  uploadMediaAction,
} from "@/app/admin/(dashboard)/media/actions";
import { ActionButton, FormMessage, SubmitButton } from "./form-controls";
import { IDLE_STATE } from "./action-state";
import { IconClose } from "@/components/ui/icons";

export type MediaItem = {
  id: string;
  url: string;
  originalName: string;
  altText: string;
  mimeType: string;
  sizeLabel: string;
  dimensions: string;
  uploadedBy: string;
};

export function MediaManager({
  mode,
  items,
  maxBytes,
}: {
  mode: "upload" | "library";
  items: MediaItem[];
  maxBytes: number;
}) {
  if (mode === "upload") return <UploadForm maxBytes={maxBytes} />;
  return <Library items={items} />;
}

function UploadForm({ maxBytes }: { maxBytes: number }) {
  const [state, action] = useActionState(uploadMediaAction, IDLE_STATE);

  return (
    <form action={action} className="grid gap-4">
      <div>
        <label htmlFor="media-files" className="field-label">
          Images
        </label>
        <input
          id="media-files"
          name="files"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          required
          className="input h-auto py-2.5 file:mr-3 file:rounded-sm file:border-0 file:bg-navy-900 file:px-3 file:py-1.5 file:text-[0.8125rem] file:font-semibold file:text-white"
        />
        <p className="field-hint">
          JPEG, PNG, WebP, AVIF or GIF. Up to {(maxBytes / 1024 / 1024).toFixed(0)} MB each.
        </p>
      </div>

      <div>
        <label htmlFor="media-alt" className="field-label">
          Alt text <span className="optional">(applied to all)</span>
        </label>
        <input id="media-alt" name="altText" type="text" className="input" maxLength={300} />
        <p className="field-hint">
          Describe what's in the image. Used by screen readers and search engines.
        </p>
      </div>

      <FormMessage status={state.status} message={state.message} />
      <SubmitButton>Upload</SubmitButton>
    </form>
  );
}

function Library({ items }: { items: MediaItem[] }) {
  const [active, setActive] = useState<MediaItem | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setActive(item)}
              className="group block w-full overflow-hidden rounded-sm border border-line text-left transition-colors hover:border-line-gold"
            >
              <span className="relative block aspect-square bg-surface-alt">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.altText || item.originalName}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="block truncate px-2 py-1.5 text-[0.6875rem] text-ink-muted">
                {item.originalName}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {active ? <Details item={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}

function Details({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const [updateState, updateAction] = useActionState(updateMediaAction, IDLE_STATE);
  const [deleteState, deleteAction] = useActionState(deleteMediaAction, IDLE_STATE);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-navy-950/55"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.originalName}
        className="relative w-full max-w-2xl overflow-hidden rounded-lg bg-surface shadow-lg"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h3 className="truncate font-display text-[1rem] font-semibold text-ink">
            {item.originalName}
          </h3>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm shrink-0">
            <IconClose width={18} height={18} />
            <span className="sr-only">Close</span>
          </button>
        </header>

        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-sm bg-surface-alt">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.altText || item.originalName}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex flex-col gap-4">
            <dl className="space-y-1.5 text-[0.8125rem]">
              <Meta label="Type" value={item.mimeType} />
              <Meta label="Size" value={item.sizeLabel} />
              {item.dimensions ? <Meta label="Dimensions" value={item.dimensions} /> : null}
              {item.uploadedBy ? <Meta label="Uploaded by" value={item.uploadedBy} /> : null}
              <Meta label="URL" value={item.url} />
            </dl>

            <form action={updateAction} className="grid gap-3">
              <input type="hidden" name="id" value={item.id} />
              <div>
                <label htmlFor={`alt-${item.id}`} className="field-label">
                  Alt text
                </label>
                <textarea
                  id={`alt-${item.id}`}
                  name="altText"
                  rows={3}
                  defaultValue={item.altText}
                  className="input"
                  maxLength={300}
                />
              </div>
              <FormMessage status={updateState.status} message={updateState.message} />
              <SubmitButton className="btn btn-primary btn-sm">Save alt text</SubmitButton>
            </form>

            <form action={deleteAction} className="mt-auto border-t border-line pt-4">
              <input type="hidden" name="id" value={item.id} />
              <FormMessage status={deleteState.status} message={deleteState.message} />
              <ActionButton
                className="btn btn-outline btn-sm mt-2 text-[#8c1d18]"
                confirm="Delete this image permanently? Anywhere it is used will fall back to the default brand artwork."
              >
                Delete image
              </ActionButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ink-subtle">{label}</dt>
      <dd className="min-w-0 break-all font-medium text-ink">{value}</dd>
    </div>
  );
}
