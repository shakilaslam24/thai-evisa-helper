import Link from "next/link";
import { IconArrowRight } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container-narrow text-center">
        <p className="eyebrow eyebrow-center">Error 404</p>
        <h1 className="mt-6 text-h1 font-semibold">This page has flown off.</h1>
        <p className="lead mx-auto mt-5 max-w-lg">
          The page you're looking for doesn't exist or has moved. Let's get you back on route.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="btn btn-primary btn-lg">
            Back to Home
            <IconArrowRight />
          </Link>
          <Link href="/contact" className="btn btn-outline btn-lg">
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}
