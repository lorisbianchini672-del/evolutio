import type { Competitor } from "./types";

/** Concurrents qui viennent de passer devant (note strictement supérieure, alors qu'ils ne l'étaient pas). */
export function newlyAhead(competitors: Competitor[], ownRating: number | null): Competitor[] {
  if (ownRating === null) return [];
  return competitors.filter(
    (c) => c.rating !== null && c.rating > ownRating && (c.previous_rating === null || c.previous_rating <= ownRating),
  );
}
