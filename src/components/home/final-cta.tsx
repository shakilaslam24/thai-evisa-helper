import { WhatsAppLink } from "@/components/site/whatsapp-link";
import { IconPhone } from "@/components/ui/icons";
import { telHref } from "@/lib/settings";

/**
 * Closing call to action.
 *
 * A full navy band immediately above the footer: the two colour fields meet, so
 * the page resolves into the footer rather than stopping abruptly.
 */
export function FinalCta({
  heading,
  subheading,
  whatsappDigits,
  primaryPhone,
}: {
  heading: string;
  subheading: string;
  whatsappDigits: string;
  primaryPhone: string;
}) {
  return (
    <section className="on-navy panel-navy relative isolate overflow-hidden">
      {/* A single gold arc, echoing the logo's wing — the 5% accent */}
      <svg
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.18]"
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M-100 340 C 300 210, 700 150, 1300 40"
          fill="none"
          stroke="#c19864"
          strokeWidth="1.4"
        />
        <path
          d="M-100 392 C 340 268, 760 210, 1300 108"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1"
          strokeOpacity="0.4"
        />
      </svg>

      <div className="container-df section text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-h1 font-semibold">{heading}</h2>
          {subheading ? <p className="lead mt-5">{subheading}</p> : null}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <WhatsAppLink
              number={whatsappDigits}
              className="btn btn-gold btn-lg w-full sm:w-auto"
              context={{ kind: "general" }}
            >
              Chat on WhatsApp
            </WhatsAppLink>

            {primaryPhone ? (
              <a
                href={telHref(primaryPhone)}
                className="btn btn-outline-invert btn-lg w-full sm:w-auto"
              >
                <IconPhone width={17} height={17} />
                Call DreamFly
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
