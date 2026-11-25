import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Bouton « Laisser un avis sur Google » de la page de collecte : on compte le clic, puis on envoie vers Google.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: location } = await admin
    .from("locations")
    .select("id, user_id, review_url")
    .eq("slug", slug)
    .maybeSingle<{ id: string; user_id: string; review_url: string | null }>();
  if (!location?.review_url || !/^https:\/\//.test(location.review_url)) {
    return NextResponse.redirect(new URL(`/r/${encodeURIComponent(slug)}`, request.url));
  }
  await admin
    .from("collect_events")
    .insert({ user_id: location.user_id, location_id: location.id, kind: "google_click" })
    .then(
      () => undefined,
      () => undefined,
    );
  return NextResponse.redirect(location.review_url, 303);
}
