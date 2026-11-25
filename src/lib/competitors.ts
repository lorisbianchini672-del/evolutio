import { placeDetails, placesConfigured } from "./places";
import { createAdminClient } from "./supabase/admin";
import type { Competitor } from "./types";

export const MAX_COMPETITORS = 5;

/** Relit la note et le nombre d'avis des concurrents suivis, en gardant la valeur précédente pour l'écart. */
export async function refreshCompetitors(userId: string): Promise<Competitor[]> {
  if (!placesConfigured()) return [];
  const admin = createAdminClient();
  const { data } = await admin.from("competitors").select("*").eq("user_id", userId).returns<Competitor[]>();
  const updated: Competitor[] = [];
  for (const c of data ?? []) {
    try {
      const p = await placeDetails(c.place_id);
      const patch = {
        name: p.name,
        rating: p.rating,
        review_count: p.reviewCount,
        previous_rating: c.rating,
        previous_count: c.review_count,
        maps_url: p.mapsUrl,
        updated_at: new Date().toISOString(),
      };
      await admin.from("competitors").update(patch).eq("id", c.id);
      updated.push({ ...c, ...patch });
    } catch (err) {
      console.error(`[concurrents] ${c.place_id} :`, err instanceof Error ? err.message : err);
      updated.push(c);
    }
  }
  return updated;
}
