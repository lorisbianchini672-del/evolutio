import type { Sector } from "./config";

// Relecture automatique d'une réponse avant publication : repère ce qu'un gérant regretterait
// d'avoir publié. Fonction pure, testée dans tests/. Les alertes s'affichent sous le brouillon
// et bloquent la publication automatique.

export type GuardWarning = { code: string; message: string };

const ADMISSION = [
  /c'est (de )?notre faute/i,
  /nous (reconnaissons|admettons) (notre|votre|une) (erreur|faute|responsabilit)/i,
  /nous sommes (entièrement |totalement )?responsables/i,
  /(notre|la) responsabilité (est|était) engagée/i,
];
const MONEY = /(\d[\d\s.,]*\s?(€|euros?|eur\b))|(rembours\w*\s+(de|à hauteur)\s+\d)/i;
const PROMISE = /\b(nous vous (offrons|offrirons|rembourserons)|geste commercial de|bon d'achat|réduction de \d)/i;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const PHONE = /(\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g;
const CARE = /\b(patient|patiente|consultation|traitement|diagnostic|ordonnance|soins?|examen|opération|intervention chirurgicale|dossier médical)\b/i;
const CASE = /\b(dossier|affaire|procédure|jugement|acte|succession|divorce|contentieux|honoraires)\b/i;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Début d'une réponse, pour repérer les répétitions d'une réponse à l'autre. */
export function opening(text: string): string {
  return normalize(text).replace(/^(bonjour|bonsoir|hello|hi)\s+[^,]*,\s*/, "").slice(0, 60);
}

export function checkReply(
  text: string,
  context: { sector: Sector; privateContact: string; signature?: string; recentReplies?: string[] },
): GuardWarning[] {
  const warnings: GuardWarning[] = [];
  const t = text.trim();
  if (!t) return warnings;

  if (ADMISSION.some((re) => re.test(t))) {
    warnings.push({ code: "aveu", message: "La réponse reconnaît une faute en public. Préférez « nous allons regarder ce qui s'est passé »." });
  }
  if (MONEY.test(t) || PROMISE.test(t)) {
    warnings.push({ code: "argent", message: "La réponse cite un montant ou promet un geste commercial en public." });
  }
  const allowed = normalize(`${context.privateContact} ${context.signature ?? ""}`);
  const contacts = [...(t.match(EMAIL) ?? []), ...(t.match(PHONE) ?? [])];
  if (contacts.some((c) => !allowed.includes(normalize(c)))) {
    warnings.push({ code: "contact", message: "La réponse contient une adresse ou un numéro qui ne vient pas de vos réglages." });
  }
  if (context.sector === "sante" && CARE.test(t)) {
    warnings.push({ code: "secret", message: "Secret médical : la réponse évoque un soin ou une consultation. Restez général." });
  }
  if (context.sector === "juridique" && CASE.test(t)) {
    warnings.push({ code: "secret", message: "Secret professionnel : la réponse évoque un dossier ou une affaire. Restez général." });
  }
  const start = opening(t);
  if (start.length >= 20 && (context.recentReplies ?? []).some((r) => opening(r) === start)) {
    warnings.push({ code: "repetition", message: "Cette réponse commence comme une réponse récente : variez pour ne pas paraître automatique." });
  }
  if (t.length > 1200) {
    warnings.push({ code: "longueur", message: "Réponse longue : sur Google, les réponses courtes sont plus lues." });
  }
  return warnings;
}
