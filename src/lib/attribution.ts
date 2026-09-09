/**
 * Campaign attribution — client side, privacy-conscious.
 *
 * UTM values and the landing page are captured once per browser session and
 * held in sessionStorage: no cookies, no third-party calls, no personal data,
 * and everything is discarded when the tab closes. The values ride along with a
 * form submission so an enquiry can be traced back to the Meta or Google
 * campaign that produced it (brief §24).
 */

export type Attribution = {
  sourcePage: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
};

// Namespaced to this website. sessionStorage is origin-scoped anyway, so a
// CRM on another subdomain can neither read nor clash with this.
const STORAGE_KEY = "dreamfly_web_attribution";

const EMPTY: Attribution = {
  sourcePage: "",
  referrer: "",
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  utmContent: "",
  utmTerm: "",
};

function clean(value: string | null): string {
  return (value ?? "").trim().slice(0, 180);
}

/** Called once on first page view. Never overwrites an existing session value. */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const referrer = document.referrer;
    // Only record an external referrer; internal navigation is noise.
    const externalReferrer =
      referrer && !referrer.startsWith(window.location.origin) ? referrer : "";

    const attribution: Attribution = {
      sourcePage: `${window.location.pathname}${window.location.search}`.slice(0, 280),
      referrer: clean(externalReferrer),
      utmSource: clean(params.get("utm_source")),
      utmMedium: clean(params.get("utm_medium")),
      utmCampaign: clean(params.get("utm_campaign")),
      utmContent: clean(params.get("utm_content")),
      utmTerm: clean(params.get("utm_term")),
    };

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Private browsing can block sessionStorage; attribution is best-effort.
  }
}

/** Reads the stored attribution, always returning a complete object. */
export function readAttribution(): Attribution {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY, sourcePage: window.location.pathname };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY;
    return { ...EMPTY, ...(parsed as Partial<Attribution>) };
  } catch {
    return EMPTY;
  }
}

/** Appends attribution to a FormData payload before submission. */
export function appendAttribution(form: FormData): FormData {
  const attribution = readAttribution();
  for (const [key, value] of Object.entries(attribution)) {
    if (value) form.set(key, value);
  }
  return form;
}
