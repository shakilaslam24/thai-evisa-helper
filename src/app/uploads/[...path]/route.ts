import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves admin-uploaded media.
 *
 * Uploads deliberately do NOT live in `public/`. Next.js indexes that directory
 * when the server boots, so anything uploaded afterwards returns 404 until a
 * restart — an administrator would add a photo, see it in the media library,
 * put it on the homepage, and visitors would get a broken image.
 *
 * Serving them here also keeps uploaded files outside the web root, so nothing
 * in the upload directory can ever be reached except through this handler.
 */

/** Content types we are prepared to serve, keyed by the extension we wrote. */
const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
};

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  // Filenames are generated as flat random hex, so a nested or relative path is
  // never legitimate — reject it rather than trying to normalise it.
  if (segments.length !== 1) {
    return new NextResponse("Not found", { status: 404 });
  }
  const [filename] = segments;
  if (!filename || filename !== path.basename(filename) || filename.startsWith(".")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const extension = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  const root = path.resolve(process.cwd(), env.uploadDir);
  const filePath = path.join(root, filename);

  // Belt and braces: the resolved path must still sit inside the upload root.
  if (!filePath.startsWith(root + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let size: number;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return new NextResponse("Not found", { status: 404 });
    size = info.size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      // Filenames are content-random, so a given URL never changes.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
