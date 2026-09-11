"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is safe to surface; the message may contain internals.
    console.error("Application error", error.digest);
  }, [error]);

  return (
    <section className="section">
      <div className="container-narrow text-center">
        <p className="eyebrow eyebrow-center">Something went wrong</p>
        <h1 className="mt-6 text-h1 font-semibold">We hit some turbulence.</h1>
        <p className="lead mx-auto mt-5 max-w-lg">
          Sorry — that page didn't load. Please try again, or contact us directly and we'll help
          straight away.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn btn-primary btn-lg">
            Try again
          </button>
          <a href="/contact" className="btn btn-outline btn-lg">
            Contact Us
          </a>
        </div>
      </div>
    </section>
  );
}
