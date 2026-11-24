// Conversion d'un avis tel que renvoyé par l'API Google Business Profile vers le format de la base.
// Fonctions pures, testées dans tests/.

export type GoogleReview = {
  name?: string; // accounts/{a}/locations/{l}/reviews/{r}
  reviewId?: string;
  reviewer?: { displayName?: string; isAnonymous?: boolean };
  starRating?: string; // ONE … FIVE
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: { comment?: string; updateTime?: string };
};

export type MappedReview = {
  google_review_name: string;
  reviewer_name: string | null;
  rating: number;
  comment: string | null;
  review_created_at: string;
  reply_text: string | null;
  reply_published_at: string | null;
};

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export function mapGoogleReview(raw: GoogleReview): MappedReview | null {
  const rating = STARS[raw.starRating ?? ""];
  if (!raw.name || !rating) return null;
  const comment = cleanComment(raw.comment);
  return {
    google_review_name: raw.name,
    reviewer_name: raw.reviewer?.isAnonymous ? null : raw.reviewer?.displayName?.trim() || null,
    rating,
    comment,
    review_created_at: raw.createTime ?? new Date().toISOString(),
    reply_text: raw.reviewReply?.comment?.trim() || null,
    reply_published_at: raw.reviewReply?.comment ? raw.reviewReply.updateTime ?? null : null,
  };
}

/** Google ajoute parfois une traduction automatique après le texte d'origine : on garde l'original. */
export function cleanComment(comment: string | undefined): string | null {
  if (!comment) return null;
  const original = comment.match(/\(Original\)\s*([\s\S]*)$/);
  const text = (original ? original[1] : comment.split("\n\n(Translated by Google)")[0]).trim();
  return text || null;
}

/** Retrouve les établissements cités dans une notification Pub/Sub, quel que soit le nom exact du champ. */
export function extractLocationNames(payload: string): string[] {
  const found = payload.match(/locations\/[A-Za-z0-9_-]+/g) ?? [];
  return [...new Set(found)];
}
