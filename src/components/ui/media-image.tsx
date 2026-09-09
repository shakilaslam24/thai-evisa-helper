import Image from "next/image";
import { BrandPanel } from "./brand-panel";

type MediaLike =
  | {
      url: string;
      altText?: string | null;
      width?: number | null;
      height?: number | null;
    }
  | null
  | undefined;

type Props = {
  media: MediaLike;
  /** Used for the alt text when the media record has none, and as panel label. */
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
  /** Varies the fallback panel composition. */
  seed?: number;
  fallbackTone?: "navy" | "light";
  fallbackLabel?: string;
};

/**
 * Renders a CMS image, or the designed brand panel when none is set.
 * Always `fill`, so the caller owns the aspect ratio and there is no layout
 * shift while the image decodes.
 */
export function MediaImage({
  media,
  alt,
  className = "",
  sizes,
  priority = false,
  seed = 0,
  fallbackTone = "navy",
  fallbackLabel,
}: Props) {
  if (!media?.url) {
    return (
      <BrandPanel seed={seed} tone={fallbackTone} label={fallbackLabel} className={className} />
    );
  }

  return (
    <Image
      src={media.url}
      alt={media.altText?.trim() || alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      className={`object-cover ${className}`}
    />
  );
}
