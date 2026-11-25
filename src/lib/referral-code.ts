import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O ni 1/I, pour se lire sans erreur

export function newReferralCode(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function cleanReferralCode(raw: unknown): string | null {
  const code = String(raw ?? "").trim().toUpperCase();
  return /^[A-Z2-9]{6}$/.test(code) ? code : null;
}
