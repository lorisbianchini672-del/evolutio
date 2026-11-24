import { randomBytes } from "node:crypto";
import { createAdminClient } from "./supabase/admin";

// Données d'exemple pour essayer le produit avant que Google ait approuvé l'accès à l'API.
// Elles sont marquées is_demo : rien n'est jamais envoyé à Google pour ces avis.

const SAMPLES: { reviewer_name: string; rating: number; comment: string | null; daysAgo: number }[] = [
  { reviewer_name: "Camille R.", rating: 5, comment: "Accueil au top et conseils précis. J'ai trouvé exactement ce qu'il me fallait, je reviendrai.", daysAgo: 1 },
  { reviewer_name: "Thomas B.", rating: 2, comment: "Plus de quarante minutes d'attente alors que j'avais rendez-vous, et personne pour s'excuser. Dommage, le travail est correct.", daysAgo: 2 },
  { reviewer_name: "Inès", rating: 4, comment: "Très bien dans l'ensemble, équipe sympathique. Un peu cher par rapport au quartier.", daysAgo: 4 },
  { reviewer_name: "Marc Dupont", rating: 5, comment: null, daysAgo: 6 },
  { reviewer_name: "Sarah L.", rating: 1, comment: "Devis accepté puis facture plus élevée sans explication. Je ne recommande pas.", daysAgo: 9 },
  { reviewer_name: "Julien", rating: 5, comment: "Great service, quick and friendly. Highly recommended if you are visiting the area!", daysAgo: 12 },
];

export function makeSlug(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "etablissement"}-${randomBytes(3).toString("hex")}`;
}

/** Renvoie l'établissement de démonstration de l'utilisateur, en le créant au besoin. */
async function ensureDemoLocation(userId: string, businessName: string): Promise<{ id: string; created: boolean }> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("locations")
    .select("id")
    .eq("user_id", userId)
    .eq("is_demo", true)
    .maybeSingle<{ id: string }>();
  if (existing) return { id: existing.id, created: false };

  const title = businessName.trim() || "Mon établissement (démonstration)";
  const { data: location, error } = await admin
    .from("locations")
    .insert({ user_id: userId, title, slug: makeSlug(title), is_demo: true, review_url: null })
    .select("id")
    .single<{ id: string }>();
  if (error || !location) {
    throw new Error(`Création de l'établissement de démonstration impossible : ${error?.message ?? "erreur inconnue"}`);
  }
  return { id: location.id, created: true };
}

/** Charge six avis d'exemple (une seule fois). */
export async function loadDemoData(userId: string, businessName: string): Promise<void> {
  const location = await ensureDemoLocation(userId, businessName);
  if (!location.created) return;
  const now = Date.now();
  const { error } = await createAdminClient()
    .from("reviews")
    .insert(
      SAMPLES.map((s) => ({
        user_id: userId,
        location_id: location.id,
        reviewer_name: s.reviewer_name,
        rating: s.rating,
        comment: s.comment,
        review_created_at: new Date(now - s.daysAgo * 86_400_000).toISOString(),
        status: "new",
        is_demo: true,
      })),
    );
  if (error) throw new Error(`Création des avis de démonstration impossible : ${error.message}`);
}

/** Ajoute un avis collé à la main, pour montrer à un prospect la réponse à l'un de ses propres avis. */
export async function addManualReview(
  userId: string,
  businessName: string,
  input: { reviewer_name: string | null; rating: number; comment: string | null },
): Promise<string> {
  const location = await ensureDemoLocation(userId, businessName);
  const { data, error } = await createAdminClient()
    .from("reviews")
    .insert({
      user_id: userId,
      location_id: location.id,
      reviewer_name: input.reviewer_name,
      rating: input.rating,
      comment: input.comment,
      review_created_at: new Date().toISOString(),
      status: "new",
      is_demo: true,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) throw new Error(`Ajout de l'avis impossible : ${error?.message ?? "erreur inconnue"}`);
  return data.id;
}

export async function clearDemoData(userId: string): Promise<void> {
  await createAdminClient().from("locations").delete().eq("user_id", userId).eq("is_demo", true);
}
