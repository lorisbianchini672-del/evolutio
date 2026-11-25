import { NextResponse, type NextRequest } from "next/server";
import { billingEnabled } from "@/lib/config";
import { hasAccess } from "@/lib/entitlement";
import { publishDraft } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";

// Bouton « Publier » d'une notification : publie la réponse proposée sans ouvrir l'application.
// Appelé par le service worker, avec le cookie de session de l'utilisateur.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Même origine uniquement : une autre page ne peut pas déclencher une publication.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Origine refusée." }, { status: 403 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const { data: subscription } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle<{ status: string }>();
  if (!hasAccess(subscription?.status, billingEnabled())) return NextResponse.json({ error: "Abonnement inactif." }, { status: 402 });

  const { id } = await params;
  try {
    const result = await publishDraft(user.id, id);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Publication impossible." }, { status: 500 });
  }
}
