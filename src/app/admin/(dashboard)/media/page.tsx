import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader, Panel, EmptyState } from "@/components/admin/ui";
import { MediaManager } from "@/components/admin/media-manager";
import { formatBytes } from "@/lib/media";
import { env } from "@/lib/env";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  await requireAdmin();

  const media = await db.media.findMany({
    orderBy: { createdAt: "desc" },
    take: 400,
    include: { uploadedBy: { select: { name: true } } },
  });

  const totalBytes = media.reduce((sum, item) => sum + item.sizeBytes, 0);

  return (
    <>
      <PageHeader
        title="Media"
        description="Images used across the website. Everything uploaded here is re-encoded to WebP, resized to a sensible maximum and stripped of camera metadata."
      />

      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
          <Panel title="Upload images">
            <MediaManager mode="upload" maxBytes={env.maxUploadBytes} items={[]} />
          </Panel>

          <Panel
            title={`Library (${media.length})`}
            description={media.length > 0 ? `${formatBytes(totalBytes)} stored` : undefined}
          >
            {media.length === 0 ? (
              <EmptyState
                title="No images yet"
                description="Upload your office photos, destination imagery and campaign artwork to use them across the site."
              />
            ) : (
              <MediaManager
                mode="library"
                maxBytes={env.maxUploadBytes}
                items={media.map((item) => ({
                  id: item.id,
                  url: item.url,
                  originalName: item.originalName,
                  altText: item.altText,
                  title: item.title,
                  caption: item.caption,
                  mimeType: item.mimeType,
                  sizeLabel: formatBytes(item.sizeBytes),
                  dimensions: item.width && item.height ? `${item.width}×${item.height}` : "",
                  uploadedBy: item.uploadedBy?.name ?? "",
                }))}
              />
            )}
          </Panel>
        </div>
      </PageBody>
    </>
  );
}
