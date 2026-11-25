import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { auditPlace } from "../src/lib/audit.ts";
import { newlyAhead } from "../src/lib/rivals.ts";
import { checkReply, opening } from "../src/lib/guard.ts";
import type { PlaceDetails } from "../src/lib/places.ts";
import { buildPostPrompt, buildSystemPrompt, parseInsights } from "../src/lib/prompt.ts";
import { cleanReferralCode, newReferralCode } from "../src/lib/referral-code.ts";
import { validTwilioSignature } from "../src/lib/twilio-signature.ts";
import type { Competitor } from "../src/lib/types.ts";

const base = { business_name: "Garage du Parc", sector: "garage" as const, tone: "professionnel" as const, signature: "", private_contact: "contact@garage.fr", extra_instructions: "" };

test("relecture : aveu, montant, contact inconnu, répétition", () => {
  const ctx = { sector: "garage" as const, privateContact: "contact@garage.fr" };
  assert.deepEqual(checkReply("Merci pour votre retour, à bientôt !", ctx), []);
  assert.ok(checkReply("C'est notre faute, désolés.", ctx).some((w) => w.code === "aveu"));
  assert.ok(checkReply("Nous vous rembourserons 50 €.", ctx).some((w) => w.code === "argent"));
  assert.ok(checkReply("Écrivez à patron@gmail.com", ctx).some((w) => w.code === "contact"));
  assert.ok(!checkReply("Écrivez à contact@garage.fr", ctx).some((w) => w.code === "contact"));
  const recent = ["Bonjour Paul, merci beaucoup pour ce retour très chaleureux, toute l'équipe est ravie."];
  assert.ok(checkReply("Bonjour Léa, merci beaucoup pour ce retour très chaleureux, toute l'équipe est ravie.", { ...ctx, recentReplies: recent }).some((w) => w.code === "repetition"));
  assert.equal(opening("Bonjour Léa, Merci !"), "merci !");
});

test("relecture : secret médical et secret professionnel", () => {
  assert.ok(checkReply("Merci pour votre consultation.", { sector: "sante", privateContact: "" }).some((w) => w.code === "secret"));
  assert.ok(checkReply("Votre dossier avance.", { sector: "juridique", privateContact: "" }).some((w) => w.code === "secret"));
  assert.deepEqual(checkReply("Merci pour votre message.", { sector: "sante", privateContact: "" }), []);
});

test("IA : style du patron, phrases à éviter, consigne dictée", () => {
  const p = buildSystemPrompt({ ...base, examples: ["Merci Karim, à très vite à l'atelier !"], avoid: ["merci beaucoup pour"], instruction: "dis-lui qu'on le rappelle demain" });
  assert.ok(p.includes("<exemple>Merci Karim"));
  assert.ok(p.includes("« merci beaucoup pour »"));
  assert.ok(p.includes("on le rappelle demain"));
  const legal = buildSystemPrompt({ ...base, sector: "juridique" });
  assert.ok(/ne confirme jamais que l'auteur est ou a été client/.test(legal));
  assert.ok(buildPostPrompt(base, "pneus hiver en stock").includes("pneus hiver"));
});

test("analyse : les mots-clés sont lus et bornés", () => {
  const i = parseInsights('{"forces":[{"theme":"Accueil","detail":"Souvent cité."}],"irritants":[],"action":"Rien.","keywords":["pain chaud","accueil",1]}');
  assert.deepEqual(i?.keywords, ["pain chaud", "accueil", "1"]);
});

test("audit : barème et rang", () => {
  const place: PlaceDetails = { id: "a", name: "A", address: "", rating: 4.6, reviewCount: 120, mapsUrl: null, primaryType: "bakery", location: null, typeLabel: null, website: "https://a.fr", phone: "01", hasHours: true, photoCount: 12, description: null, open: true };
  const rivals = [
    { id: "b", name: "B", address: "", rating: 4.8, reviewCount: 300, mapsUrl: null, primaryType: "bakery", location: null },
    { id: "c", name: "C", address: "", rating: 4.1, reviewCount: 60, mapsUrl: null, primaryType: "bakery", location: null },
  ];
  const a = auditPlace(place, rivals);
  assert.equal(a.rank, 2);
  assert.equal(a.medianReviews, 180);
  assert.ok(a.score > 70 && a.score <= 100);
  const empty = auditPlace({ ...place, rating: null, reviewCount: 0, website: null, phone: null, hasHours: false, photoCount: 0 });
  assert.ok(empty.score <= 5);
});

test("concurrents : alerte seulement quand l'un passe devant", () => {
  const c = (rating: number, previous: number | null): Competitor => ({ id: "x", user_id: "u", place_id: "p", name: "X", address: "", rating, review_count: 1, previous_rating: previous, previous_count: 1, maps_url: null, updated_at: "" });
  assert.equal(newlyAhead([c(4.6, 4.4)], 4.5).length, 1);
  assert.equal(newlyAhead([c(4.6, 4.6)], 4.5).length, 0);
  assert.equal(newlyAhead([c(4.4, 4.2)], 4.5).length, 0);
});

test("parrainage : codes lisibles et validés", () => {
  const code = newReferralCode();
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(cleanReferralCode(code.toLowerCase()), code);
  assert.equal(cleanReferralCode("ABC"), null);
  assert.equal(cleanReferralCode("O0O0O0"), null);
});

test("Twilio : signature vérifiée", () => {
  const url = "https://exemple.fr/api/twilio/entrant";
  const params = { From: "whatsapp:+33612345678", Body: "OUI" };
  const data = url + Object.keys(params).sort().map((k) => k + params[k as keyof typeof params]).join("");
  const sig = createHmac("sha1", "secret").update(data).digest("base64");
  assert.equal(validTwilioSignature("secret", url, params, sig), true);
  assert.equal(validTwilioSignature("secret", url, { ...params, Body: "NON" }, sig), false);
});
