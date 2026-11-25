import { generateReply } from "./ai";
import { decryptSecret } from "./crypto";
import { listReviews, publishReply, refreshAccessToken } from "./google";
import { mapGoogleReview } from "./google-map";
import { notifyNewReview } from "./notify";
import { createAdminClient } from "./supabase/admin";
import type { Account, Location, Review } from "./types";

// Cœur du produit : importer les avis, rédiger les brouillons, publier les réponses.
// Tout ce fichier tourne côté serveur avec le client admin ; chaque fonction reçoit l'identifiant
// de l'utilisateur concerné et ne touche que ses lignes.

export async function getAccessTokenFor(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("google_connections")
    .select("refresh_token_enc")
    .eq("user_id", userId)
    .maybeSingle<{ refresh_token_enc: string }>();
  if (!data) throw new Error("Aucun compte Google connecté.");
  return refreshAccessToken(decryptSecret(data.refresh_token_enc));
}

async function loadAccount(userId: string): Promise<Account> {
  const { data } = await createAdminClient().from("accounts").select("*").eq("id", userId).single<Account>();
  if (!data) throw new Error("Compte introuvable.");
  return data;
}

/** Rédige (ou régénère) le brouillon d'un avis. */
export async function draftReview(userId: string, reviewId: string): Promise<string> {
  const admin = createAdminClient();
  const [account, { data: review }] = await Promise.all([
    loadAccount(userId),
    admin.from("reviews").select("*").eq("id", reviewId).eq("user_id", userId).single<Review>(),
  ]);
  if (!review) throw new Error("Avis introuvable.");
  if (review.status === "published") throw new Error("Cet avis a déjà une réponse publiée.");
  const draft = await generateReply(review, account);
  await admin.from("reviews").update({ draft_text: draft, status: "drafted" }).eq("id", reviewId).eq("user_id", userId);
  return draft;
}

/** Publie une réponse sur Google (ou la marque comme publiée pour un avis de démonstration). */
export async function publishReview(userId: string, reviewId: string, text: string, accessToken?: string): Promise<void> {
  const reply = text.trim();
  if (!reply) throw new Error("La réponse est vide.");
  if (reply.length > 4000) throw new Error("La réponse dépasse 4 000 caractères.");

  const admin = createAdminClient();
  const { data: review } = await admin
    .from("reviews")
    .select("*")
    .eq("id", reviewId)
    .eq("user_id", userId)
    .single<Review>();
  if (!review) throw new Error("Avis introuvable.");

  if (!review.is_demo) {
    if (!review.google_review_name) throw new Error("Cet avis n'est pas relié à Google.");
    const token = accessToken ?? (await getAccessTokenFor(userId));
    await publishReply(token, review.google_review_name, reply);
  }
  await admin
    .from("reviews")
    .update({ reply_text: reply, draft_text: reply, reply_published_at: new Date().toISOString(), status: "published" })
    .eq("id", reviewId)
    .eq("user_id", userId);
}

export type SyncResult = { imported: number; drafted: number; autoPublished: number };

/**
 * Relit les avis d'un établissement chez Google et met la base à jour.
 * - `initial` : premier import. On enregistre l'historique sans rédiger ni alerter,
 *   pour ne pas répondre en rafale à d'anciens avis.
 * - sinon : chaque nouvel avis reçoit un brouillon ; il est publié seul uniquement si le commerçant
 *   a activé l'option ET que la note atteint son seuil (4 ou 5). Sous 4 étoiles, jamais d'envoi automatique.
 */
export async function syncLocation(
  userId: string,
  location: Location,
  options: { initial?: boolean; accessToken?: string } = {},
): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, drafted: 0, autoPublished: 0 };
  if (!location.google_account_name || !location.google_location_name) return result;

  const admin = createAdminClient();
  const accessToken = options.accessToken ?? (await getAccessTokenFor(userId));
  const [account, remote] = await Promise.all([
    loadAccount(userId),
    listReviews(accessToken, location.google_account_name, location.google_location_name),
  ]);

  const mapped = remote.map(mapGoogleReview).filter((r) => r !== null);
  if (mapped.length === 0) return result;

  const { data: known } = await admin
    .from("reviews")
    .select("id, google_review_name, status, comment, rating")
    .in(
      "google_review_name",
      mapped.map((r) => r.google_review_name),
    );
  const knownByName = new Map((known ?? []).map((r) => [r.google_review_name as string, r]));

  for (const r of mapped) {
    const existing = knownByName.get(r.google_review_name);
    const answeredOnGoogle = Boolean(r.reply_text);

    if (existing) {
      // Avis déjà connu : on suit les changements faits côté Google (texte modifié, réponse ajoutée à la main).
      const patch: Record<string, unknown> = { rating: r.rating, comment: r.comment, reviewer_name: r.reviewer_name };
      if (answeredOnGoogle) {
        Object.assign(patch, { reply_text: r.reply_text, reply_published_at: r.reply_published_at, status: "published" });
      }
      await admin.from("reviews").update(patch).eq("id", existing.id);
      continue;
    }

    const { data: inserted, error } = await admin
      .from("reviews")
      .insert({
        user_id: userId,
        location_id: location.id,
        google_review_name: r.google_review_name,
        reviewer_name: r.reviewer_name,
        rating: r.rating,
        comment: r.comment,
        review_created_at: r.review_created_at,
        reply_text: r.reply_text,
        reply_published_at: r.reply_published_at,
        status: answeredOnGoogle ? "published" : "new",
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !inserted) continue; // doublon inséré en parallèle par une autre synchronisation
    result.imported += 1;

    if (answeredOnGoogle || options.initial) continue;

    try {
      const draft = await draftReview(userId, inserted.id);
      result.drafted += 1;
      const threshold = account.auto_publish_min_rating;
      if (threshold && threshold >= 4 && r.rating >= threshold) {
        await publishReview(userId, inserted.id, draft, accessToken);
        result.autoPublished += 1;
      } else {
        await notifyNewReview(account, location.title, {
          id: inserted.id,
          rating: r.rating,
          reviewer_name: r.reviewer_name,
          comment: r.comment,
        });
      }
    } catch (err) {
      // Un échec sur un avis ne doit pas bloquer les suivants : il reste « nouveau » dans le tableau de bord.
      console.error(`[sync] avis ${inserted.id} :`, err instanceof Error ? err.message : err);
    }
  }
  return result;
}

/** Synchronise tous les établissements Google d'un utilisateur. */
export async function syncUser(userId: string, options: { initial?: boolean } = {}): Promise<SyncResult> {
  const admin = createAdminClient();
  const { data: locations } = await admin
    .from("locations")
    .select("*")
    .eq("user_id", userId)
    .eq("is_demo", false)
    .returns<Location[]>();
  const total: SyncResult = { imported: 0, drafted: 0, autoPublished: 0 };
  if (!locations?.length) return total;
  const accessToken = await getAccessTokenFor(userId);
  for (const location of locations) {
    const r = await syncLocation(userId, location, { ...options, accessToken });
    total.imported += r.imported;
    total.drafted += r.drafted;
    total.autoPublished += r.autoPublished;
  }
  return total;
}
