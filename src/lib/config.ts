// Réglages centraux du produit.
export const APP_NAME = "Evolutio";

/** Adresse publique du site, lue à chaque appel (réglable sans reconstruire l'application). */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export const TRIAL_DAYS = 14;

export type PlanId = "essentiel" | "pro" | "multi";

export type Plan = {
  id: PlanId;
  name: string;
  priceEur: number; // prix mensuel HT
  priceEnv: string; // variable d'environnement qui contient l'identifiant de prix Stripe
  maxLocations: number;
  emailRequestsPerMonth: number;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  essentiel: {
    id: "essentiel",
    name: "Essentiel",
    priceEur: 19,
    priceEnv: "STRIPE_PRICE_ESSENTIEL",
    maxLocations: 1,
    emailRequestsPerMonth: 30,
    features: [
      "1 établissement",
      "Réponses rédigées par IA, publiées en un clic",
      "Publication automatique des avis 4 et 5 étoiles (option)",
      "QR code et page de collecte d'avis",
      "Alerte e-mail à chaque nouvel avis",
      "Messages privés des clients dans le tableau de bord",
      "30 demandes d'avis par e-mail par mois",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceEur: 39,
    priceEnv: "STRIPE_PRICE_PRO",
    maxLocations: 1,
    emailRequestsPerMonth: 300,
    features: [
      "Tout Essentiel",
      "300 demandes d'avis par e-mail par mois",
    ],
  },
  multi: {
    id: "multi",
    name: "Multi",
    priceEur: 79,
    priceEnv: "STRIPE_PRICE_MULTI",
    maxLocations: 5,
    emailRequestsPerMonth: 1000,
    features: [
      "Tout Pro",
      "Jusqu'à 5 établissements",
      "1 000 demandes d'avis par e-mail par mois",
    ],
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

export const SECTORS = {
  restaurant: "Restaurant, café, bar",
  commerce: "Commerce de proximité",
  artisan: "Artisan (bâtiment, dépannage, services)",
  beaute: "Beauté et bien-être",
  immobilier: "Agence immobilière",
  sante: "Professionnel de santé",
  autre: "Autre activité",
} as const;
export type Sector = keyof typeof SECTORS;

export const TONES = {
  chaleureux: "Chaleureux et proche",
  professionnel: "Professionnel et sobre",
  decontracte: "Décontracté",
} as const;
export type Tone = keyof typeof TONES;

/** La facturation est active dès que la clé Stripe est renseignée. Sans clé, l'app tourne en mode découverte. */
export function billingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
