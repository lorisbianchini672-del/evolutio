import { NextResponse, type NextRequest } from "next/server";
import { sendPushToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Abonnement d'un appareil aux notifications : POST l'enregistre, DELETE le retire.
// PUT envoie une notification d'essai sur les appareils de l'utilisateur.

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

type Sub = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

export async function POST(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const sub = (await request.json().catch(() => null)) as Sub | null;
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";
  if (!endpoint.startsWith("https://") || !p256dh || !auth || endpoint.length > 1000) {
    return NextResponse.json({ error: "Abonnement invalide." }, { status: 400 });
  }
  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert({ user_id: userId, endpoint, p256dh, auth }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const { endpoint } = ((await request.json().catch(() => null)) ?? {}) as { endpoint?: string };
  if (endpoint) await createAdminClient().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
  return NextResponse.json({ ok: true });
}

export async function PUT() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const sent = await sendPushToUser(userId, {
    title: "Evolutio est prêt",
    body: "Vous serez prévenu ici à chaque nouvel avis, réponse déjà rédigée.",
    url: "/app/rapide",
    tag: "essai",
  });
  return NextResponse.json({ sent });
}
