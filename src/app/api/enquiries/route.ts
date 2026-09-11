import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { createEnquiry } from "@/lib/enquiries/dispatch";
import { enquirySubmissionSchema } from "@/lib/validation/enquiry";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A genuine form takes a person more than a couple of seconds to complete. */
const MIN_FILL_MS = 2500;
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
const MAX_BODY_BYTES = 24 * 1024;

/** Rejects cross-origin posts; browsers always send Origin on cross-site POSTs. */
async function isSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return true;
  try {
    const host = h.get("host");
    return !host || new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await isSameOrigin())) {
    return NextResponse.json({ ok: false, error: "Request rejected." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413 });
  }

  const ip = await clientIp();
  const limit = rateLimit(`enquiry:${ip}`, RATE_LIMIT.max, RATE_LIMIT.windowMs);
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many submissions. Please try again shortly, or contact us on WhatsApp.",
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = enquirySubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    // Field-level messages, so the form can highlight the offending inputs.
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json(
      { ok: false, error: "Please check the highlighted fields.", fieldErrors },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // Anti-spam. Both checks fail silently with a success response so a bot gets
  // no signal about which control caught it.
  const tooFast = data.startedAt > 0 && Date.now() - data.startedAt < MIN_FILL_MS;
  if (data.company_website || tooFast) {
    return NextResponse.json({ ok: true, id: null });
  }

  try {
    const enquiry = await createEnquiry(data);
    return NextResponse.json({ ok: true, id: enquiry.id });
  } catch (error) {
    console.error("[enquiries] failed to save", error);
    return NextResponse.json(
      {
        ok: false,
        error: "We couldn't save your enquiry. Please try again, or reach us on WhatsApp.",
      },
      { status: 500 },
    );
  }
}

/** Enquiry data is private to the admin panel. Never readable over the public API. */
export function GET() {
  return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
}
