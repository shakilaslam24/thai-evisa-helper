import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { env } from "./env";

/**
 * Media uploads.
 *
 * Safety rules, in order:
 *   1. Size is capped before anything is read into memory.
 *   2. The type is decided by the file's own magic bytes, never by the
 *      browser-supplied filename or Content-Type.
 *   3. SVG is refused outright — it is a script container, and nothing on this
 *      site needs uploaded vector art.
 *   4. Everything is re-encoded through sharp, which strips EXIF (including GPS
 *      coordinates) and guarantees the output really is the format we claim.
 *   5. Filenames are random; the original name is kept only as a label.
 */

const MAX_DIMENSION = 2400;
const WEBP_QUALITY = 82;

/** Magic-byte signatures for the formats we accept. */
const SIGNATURES: Array<{ mime: string; test: (buffer: Buffer) => boolean }> = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    test: (b) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: "image/webp",
    test: (b) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
  { mime: "image/gif", test: (b) => b.subarray(0, 3).toString("ascii") === "GIF" },
  {
    mime: "image/avif",
    test: (b) =>
      b.subarray(4, 8).toString("ascii") === "ftyp" &&
      b.subarray(8, 12).toString("ascii").startsWith("avif"),
  },
];

export class UploadError extends Error {}

function detectMime(buffer: Buffer): string | null {
  return SIGNATURES.find((signature) => signature.test(buffer))?.mime ?? null;
}

export type StoredFile = {
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  originalName: string;
};

/**
 * Validates, normalises and writes an uploaded image.
 * Animated GIFs are preserved as-is (re-encoding would drop the animation);
 * everything else becomes a size-capped WebP.
 */
export async function storeUpload(file: File): Promise<StoredFile> {
  if (file.size === 0) throw new UploadError("That file is empty.");
  if (file.size > env.maxUploadBytes) {
    throw new UploadError(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${(env.maxUploadBytes / 1024 / 1024).toFixed(0)} MB.`,
    );
  }

  const input = Buffer.from(await file.arrayBuffer());
  const detected = detectMime(input);

  if (!detected) {
    throw new UploadError(
      "That file isn't a supported image. Please upload a JPEG, PNG, WebP, AVIF or GIF.",
    );
  }

  const originalName = sanitiseName(file.name);
  const uploadDir = path.resolve(process.cwd(), env.uploadDir);
  await mkdir(uploadDir, { recursive: true });

  const stem = randomBytes(16).toString("hex");

  // Animated GIFs pass through; still images are normalised to WebP.
  if (detected === "image/gif") {
    const metadata = await sharp(input).metadata();
    const filename = `${stem}.gif`;
    await writeFile(path.join(uploadDir, filename), input, { flag: "wx" });
    return {
      filename,
      url: `/uploads/${filename}`,
      mimeType: "image/gif",
      sizeBytes: input.byteLength,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      originalName,
    };
  }

  let output: Buffer;
  let width: number | null = null;
  let height: number | null = null;

  try {
    const pipeline = sharp(input, { failOn: "error" })
      .rotate() // apply EXIF orientation, then discard the metadata
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY });

    const result = await pipeline.toBuffer({ resolveWithObject: true });
    output = result.data;
    width = result.info.width;
    height = result.info.height;
  } catch {
    throw new UploadError("That image couldn't be processed. It may be corrupt.");
  }

  const filename = `${stem}.webp`;
  await writeFile(path.join(uploadDir, filename), output, { flag: "wx" });

  return {
    filename,
    url: `/uploads/${filename}`,
    mimeType: "image/webp",
    sizeBytes: output.byteLength,
    width,
    height,
    originalName,
  };
}

/** Removes a stored file. Never throws: a missing file is not an error here. */
export async function deleteStoredFile(filename: string): Promise<void> {
  // Defend against a crafted filename escaping the upload directory.
  const safe = path.basename(filename);
  if (!safe || safe !== filename) return;
  try {
    await unlink(path.join(path.resolve(process.cwd(), env.uploadDir), safe));
  } catch {
    // Already gone.
  }
}

function sanitiseName(name: string): string {
  return (
    path
      .basename(name)
      .replace(/[^\w.\- ]+/g, "")
      .slice(0, 120) || "upload"
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
