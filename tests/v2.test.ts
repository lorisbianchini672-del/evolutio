import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePhone, phoneAlertText } from "../src/lib/alerts.ts";
import { buildSystemPrompt } from "../src/lib/prompt.ts";
import { createLimiter } from "../src/lib/rate-limit.ts";
import { computeReport, monthBounds, ratingDelta } from "../src/lib/report.ts";

test("téléphone : formats français et internationaux", () => {
  assert.equal(normalizePhone("06 12 34 56 78"), "+33612345678");
  assert.equal(normalizePhone("06.12.34.56.78"), "+33612345678");
  assert.equal(normalizePhone("+33 6 12 34 56 78"), "+33612345678");
  assert.equal(normalizePhone("0033612345678"), "+33612345678");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone(""), null);
});

test("alerte téléphone : courte, avec le lien", () => {
  const text = phoneAlertText({ locationTitle: "Garage du Parc", rating: 2, reviewer: "Karim", comment: "x".repeat(400), url: "https://e.fr/app/rapide?avis=1" });
  assert.ok(text.includes("★★☆☆☆"));
  assert.ok(text.includes("https://e.fr/app/rapide?avis=1"));
  assert.ok(text.length < 320);
});

test("limiteur : bloque au-delà de la limite puis rouvre", () => {
  const allow = createLimiter(2, 1000);
  assert.equal(allow("a", 0), true);
  assert.equal(allow("a", 10), true);
  assert.equal(allow("a", 20), false);
  assert.equal(allow("b", 20), true);
  assert.equal(allow("a", 1500), true);
});

test("consignes métier : le garage ne reconnaît aucune responsabilité", () => {
  const prompt = buildSystemPrompt({ business_name: "Garage du Parc", sector: "garage", tone: "professionnel", signature: "", private_contact: "", extra_instructions: "" });
  assert.ok(prompt.includes("garage automobile"));
  assert.ok(/responsabilité/.test(prompt));
});

test("rapport : chiffres du mois, écart de note, avis depuis l'arrivée", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  const r = (date: string, rating: number, status = "published") => ({ rating, review_created_at: date, status });
  const report = computeReport({
    now,
    offset: 0,
    joinedAt: "2026-10-01T00:00:00Z",
    insights: null,
    reviews: [r("2026-09-10T10:00:00Z", 3), r("2026-10-05T10:00:00Z", 4), r("2026-11-02T10:00:00Z", 5), r("2026-11-15T10:00:00Z", 2, "new")],
    events: [
      { kind: "visit", created_at: "2026-11-03T10:00:00Z" },
      { kind: "google_click", created_at: "2026-11-03T10:01:00Z" },
      { kind: "google_click", created_at: "2026-10-03T10:01:00Z" },
    ],
    requests: [{ sent_at: "2026-11-04T10:00:00Z" }],
  });
  assert.equal(report.label, "novembre 2026");
  assert.equal(report.received, 2);
  assert.equal(report.average, 3.5);
  assert.equal(report.previousAverage, 4);
  assert.equal(report.responseRate, 50);
  assert.equal(report.low, 1);
  assert.equal(report.visits, 1);
  assert.equal(report.googleClicks, 1);
  assert.equal(report.requests, 1);
  assert.equal(report.sinceJoin.reviews, 3);
  assert.equal(report.sinceJoin.averageBefore, 3);
  assert.equal(ratingDelta(report.average, report.previousAverage), "−0,5");
  assert.equal(monthBounds(1, now).label, "octobre 2026");
});
