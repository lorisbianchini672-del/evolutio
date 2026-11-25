import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Vérifie la signature X-Twilio-Signature d'une requête entrante :
 * HMAC-SHA1 (clé = Auth Token) de l'URL suivie des paramètres triés (nom puis valeur), en base64.
 */
export function validTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string): boolean {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
