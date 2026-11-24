import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { extractLocationNames } from "@/lib/google-map";
import { syncLocation } from "@/lib/reviews";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Location } from "@/lib/types";

export const maxDuration = 60;

function tokenValid(received: string | null): boolean {
  const expected = process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Reçoit les notifications « nouvel avis » poussées par Google Pub/Sub.
// L'abonnement Pub/Sub doit pointer vers /api/google/pubsub?token=<GOOGLE_PUBSUB_VERIFICATION_TOKEN>.
export async function POST(request: NextRequest) {
  if (!tokenValid(request.nextUrl.searchParams.get("token"))) {
    return new NextResponse("Jeton invalide", { status: 401 });
  }

  let payload = "";
  try {
    const body = (await request.json()) as { message?: { data?: string; attributes?: Record<string, string> } };
    const data = body.message?.data ? Buffer.from(body.message.data, "base64").toString("utf8") : "";
    payload = `${data} ${JSON.stringify(body.message?.attributes ?? {})}`;
  } catch {
    return new NextResponse(null, { status: 204 }); // message illisible : on l'acquitte pour éviter les renvois en boucle
  }

  // La notification désigne l'établissement, pas le contenu de l'avis : on relit les avis via l'API.
  const names = extractLocationNames(payload);
  if (names.length > 0) {
    const { data: locations } = await createAdminClient()
      .from("locations")
      .select("*")
      .in("google_location_name", names)
      .returns<Location[]>();
    for (const location of locations ?? []) {
      try {
        await syncLocation(location.user_id, location);
      } catch (err) {
        // On acquitte quand même : la synchronisation planifiée rattrapera cet établissement.
        console.error(`[pubsub] ${location.google_location_name} :`, err instanceof Error ? err.message : err);
      }
    }
  }
  return new NextResponse(null, { status: 204 });
}
