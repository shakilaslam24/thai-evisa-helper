import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRows, parseLines, documentRowSchema, faqRowSchema, itineraryRowSchema } from "../src/lib/admin/rows.ts";

describe("repeatable row parsing", () => {
  it("parses well-formed document rows", () => {
    const rows = parseRows(
      JSON.stringify([{ label: "Passport", note: "Original" }, { label: "Photo", note: "" }]),
      documentRowSchema,
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.label, "Passport");
    assert.equal(rows[1]?.note, "");
  });

  it("drops rows missing a required field rather than failing the whole save", () => {
    const rows = parseRows(
      JSON.stringify([{ label: "Passport" }, { label: "" }, { note: "orphan" }]),
      documentRowSchema,
    );
    assert.equal(rows.length, 1);
  });

  it("returns an empty list for malformed or missing input", () => {
    assert.deepEqual(parseRows("not json", documentRowSchema), []);
    assert.deepEqual(parseRows("", documentRowSchema), []);
    assert.deepEqual(parseRows(undefined, documentRowSchema), []);
    assert.deepEqual(parseRows(JSON.stringify({ not: "an array" }), documentRowSchema), []);
  });

  it("requires both a question and an answer for an FAQ", () => {
    const rows = parseRows(
      JSON.stringify([
        { question: "How long?", answer: "About a week." },
        { question: "No answer", answer: "" },
      ]),
      faqRowSchema,
    );
    assert.equal(rows.length, 1);
  });

  it("parses itinerary days", () => {
    const rows = parseRows(
      JSON.stringify([{ dayLabel: "Day 1", title: "Arrival", body: "Transfer to hotel." }]),
      itineraryRowSchema,
    );
    assert.equal(rows[0]?.dayLabel, "Day 1");
  });

  it("splits a one-per-line textarea and strips bullets", () => {
    assert.deepEqual(parseLines("- Hotel\n- Breakfast\n\n• Transfers"), ["Hotel", "Breakfast", "Transfers"]);
    assert.deepEqual(parseLines(""), []);
    assert.deepEqual(parseLines(undefined), []);
  });
});
