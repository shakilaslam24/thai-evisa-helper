import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hashPassword, verifyPassword, validatePasswordStrength } from "../src/lib/auth/password.ts";
import { whatsappHref, whatsappMessage, structuredWhatsAppMessage } from "../src/lib/whatsapp.ts";
import { parseList, serialiseList, labelFor, labelsFor, VISA_CATEGORIES } from "../src/lib/list.ts";
import { slugify, paragraphs, lines, flagEmoji, safeHref } from "../src/lib/format.ts";
import { enquirySubmissionSchema } from "../src/lib/validation/enquiry.ts";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    assert.equal(await verifyPassword("wrong password entirely", hash), false);
  });

  it("produces a different hash each time (random salt)", async () => {
    const a = await hashPassword("same password");
    const b = await hashPassword("same password");
    assert.notEqual(a, b);
    assert.equal(await verifyPassword("same password", a), true);
    assert.equal(await verifyPassword("same password", b), true);
  });

  it("never throws on a malformed stored hash", async () => {
    for (const bad of ["", "nonsense", "scrypt$1$2", "bcrypt$1$2$3$4$5"]) {
      assert.equal(await verifyPassword("anything", bad), false);
    }
  });

  it("enforces the password policy", () => {
    assert.ok(validatePasswordStrength("short"));
    assert.ok(validatePasswordStrength("alllowercase123"));
    assert.ok(validatePasswordStrength("ALLUPPERCASE123"));
    assert.ok(validatePasswordStrength("NoDigitsInHere"));
    assert.equal(validatePasswordStrength("Str0ngEnoughPass"), null);
  });
});

describe("WhatsApp links", () => {
  it("uses the contextual message for a visa page", () => {
    assert.equal(
      whatsappMessage({ kind: "visa", country: "Japan" }),
      "Hello DreamFly, I would like to know more about your Japan visa service.",
    );
  });

  it("prefers a custom message when one is set in the CMS", () => {
    assert.equal(
      whatsappMessage({ kind: "visa", country: "Japan", custom: "Custom copy." }),
      "Custom copy.",
    );
  });

  it("names the package on a tour page", () => {
    assert.equal(
      whatsappMessage({ kind: "tour", packageName: "Thailand 5 Days" }),
      "Hello DreamFly, I'm interested in Thailand 5 Days.",
    );
  });

  it("builds a wa.me link with an encoded message", () => {
    const href = whatsappHref("8801335374437", { kind: "b2b" });
    assert.ok(href?.startsWith("https://wa.me/8801335374437?text="));
    assert.ok(href?.includes("B2B%20partner"));
  });

  it("returns null when no number is configured, so no dead link renders", () => {
    assert.equal(whatsappHref(""), null);
    assert.equal(whatsappHref("123"), null);
  });

  it("strips non-digits from a formatted number", () => {
    assert.ok(whatsappHref("+880 1335-374437")?.startsWith("https://wa.me/8801335374437"));
  });

  it("omits empty rows from a structured message", () => {
    const message = structuredWhatsAppMessage("Quotation request.", [
      ["Route", "Dhaka → Bangkok"],
      ["Return", ""],
      ["Passengers", undefined],
      ["Cabin", "Economy"],
    ]);
    assert.ok(message.includes("Route: Dhaka → Bangkok"));
    assert.ok(message.includes("Cabin: Economy"));
    assert.ok(!message.includes("Return"));
    assert.ok(!message.includes("Passengers"));
  });
});

describe("delimited list columns", () => {
  it("round-trips a list", () => {
    assert.deepEqual(parseList(serialiseList(["tourist", "business"])), ["tourist", "business"]);
  });

  it("drops blanks and duplicates", () => {
    assert.equal(serialiseList(["tourist", "", "tourist", " business "]), "tourist,business");
  });

  it("treats null and empty as an empty list", () => {
    assert.deepEqual(parseList(null), []);
    assert.deepEqual(parseList(""), []);
    assert.deepEqual(parseList("  ,  ,"), []);
  });

  it("maps stored values to display labels", () => {
    assert.equal(labelFor(VISA_CATEGORIES, "business"), "Business");
    assert.deepEqual(labelsFor(VISA_CATEGORIES, "tourist,visit"), ["Tourist", "Visit"]);
  });

  it("falls back to the raw value for an unknown key", () => {
    assert.equal(labelFor(VISA_CATEGORIES, "unknown"), "unknown");
  });
});

describe("formatting helpers", () => {
  it("slugifies country names", () => {
    assert.equal(slugify("South Korea"), "south-korea");
    assert.equal(slugify("Hong Kong (SAR)"), "hong-kong-sar");
    assert.equal(slugify("  Thailand  "), "thailand");
  });

  it("splits prose into paragraphs and lists into lines", () => {
    assert.deepEqual(paragraphs("One.\n\nTwo."), ["One.", "Two."]);
    assert.deepEqual(lines("- First\n• Second\n\n* Third"), ["First", "Second", "Third"]);
    assert.deepEqual(paragraphs(""), []);
  });

  it("derives a flag only from a valid ISO code", () => {
    assert.equal(flagEmoji("JP"), "🇯🇵");
    assert.equal(flagEmoji("jp"), "🇯🇵");
    assert.equal(flagEmoji("JPN"), null);
    assert.equal(flagEmoji(""), null);
  });

  it("refuses unsafe hrefs from CMS fields", () => {
    assert.equal(safeHref("/visa/japan"), "/visa/japan");
    assert.equal(safeHref("https://example.com"), "https://example.com");
    assert.equal(safeHref("mailto:a@b.com"), "mailto:a@b.com");
    // javascript: and data: URLs must never survive
    assert.equal(safeHref("javascript:alert(1)"), "#");
    assert.equal(safeHref("data:text/html,<script>"), "#");
    assert.equal(safeHref(""), "#");
  });
});

describe("enquiry validation", () => {
  const base = { name: "Test Person", phone: "01700000000" };

  it("accepts a valid general enquiry", () => {
    const result = enquirySubmissionSchema.safeParse({ type: "general", ...base });
    assert.equal(result.success, true);
  });

  it("rejects a too-short name and a bad phone number", () => {
    assert.equal(enquirySubmissionSchema.safeParse({ type: "general", name: "A", phone: "01700000000" }).success, false);
    assert.equal(enquirySubmissionSchema.safeParse({ type: "general", name: "Test Person", phone: "abc" }).success, false);
  });

  it("rejects an unknown enquiry type", () => {
    assert.equal(enquirySubmissionSchema.safeParse({ type: "hacking", ...base }).success, false);
  });

  it("requires a route on an air ticket enquiry", () => {
    assert.equal(enquirySubmissionSchema.safeParse({ type: "air_ticket", ...base, tripType: "one_way", from: "Dhaka" }).success, false);
    assert.equal(
      enquirySubmissionSchema.safeParse({
        type: "air_ticket", ...base, tripType: "one_way", from: "Dhaka", to: "Bangkok",
      }).success,
      true,
    );
  });

  it("requires a company name on a B2B enquiry", () => {
    assert.equal(enquirySubmissionSchema.safeParse({ type: "b2b", ...base }).success, false);
    assert.equal(enquirySubmissionSchema.safeParse({ type: "b2b", ...base, companyName: "Acme Travels" }).success, true);
  });

  it("accepts a filled honeypot so the route can discard it silently", () => {
    const result = enquirySubmissionSchema.safeParse({
      type: "general", ...base, company_website: "http://spam.example",
    });
    assert.equal(result.success, true);
    assert.equal(result.success && result.data.company_website, "http://spam.example");
  });

  it("carries campaign attribution through", () => {
    const result = enquirySubmissionSchema.safeParse({
      type: "general", ...base, utmSource: "facebook", utmCampaign: "japan-visa-jan",
    });
    assert.equal(result.success, true);
    assert.equal(result.success && result.data.utmSource, "facebook");
  });

  it("rejects an invalid email but allows an empty one", () => {
    assert.equal(enquirySubmissionSchema.safeParse({ type: "general", ...base, email: "" }).success, true);
    assert.equal(enquirySubmissionSchema.safeParse({ type: "general", ...base, email: "nope" }).success, false);
  });
});
