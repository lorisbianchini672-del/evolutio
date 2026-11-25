import { NextResponse, type NextRequest } from "next/server";
import { refreshCompetitors } from "@/lib/competitors";
import { newlyAhead } from "@/lib/rivals";
import { billingEnabled, siteUrl } from "@/lib/config";
import { sendEmail } from "@/lib/email";
import { placeDetails } from "@/lib/places";
import { sendPushToUser } from "@/lib/push";
import { hasAccess } from "@/lib/entitlement";
import { syncUser } from "@/lib/reviews";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

// Rattrapage planifié (voir vercel.json) : relit les avis de tous les comptes connectés,
// au cas où une notification Pub/Sub ne serait pas arrivée.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const admin = createAdminClient();
  const [{ data: connections }, { data: subscriptions }] = await Promise.all([
    admin.from("google_connections").select("user_id"),
    admin.from("subscriptions").select("user_id, status"),
  ]);
  const statusByUser = new Map((subscriptions ?? []).map((s) => [s.user_id as string, s.status as string]));

  const summary = { accounts: 0, imported: 0, drafted: 0, autoPublished: 0, errors: 0 };
  for (const { user_id } of connections ?? []) {
    if (!hasAccess(statusByUser.get(user_id), billingEnabled())) continue; // abonnement arrêté : on ne synchronise plus
    summary.accounts += 1;
    try {
      const r = await syncUser(user_id);
      summary.imported += r.imported;
      summary.drafted += r.drafted;
      summary.autoPublished += r.autoPublished;
    } catch (err) {
      summary.errors += 1;
      console.error(`[cron] ${user_id} :`, err instanceof Error ? err.message : err);
    }
  }
  // Une fois par semaine et par compte : chiffres des concurrents, alerte si l'un d'eux passe devant.
  const weekAgo = new Date(Date.now() - 6 * 86_400_000).toISOString();
  const { data: stale } = await admin.from("competitors").select("user_id").lt("updated_at", weekAgo);
  const rivalsChecked = new Set<string>();
  for (const { user_id } of stale ?? []) {
    const userId = user_id as string;
    if (rivalsChecked.has(userId) || !hasAccess(statusByUser.get(userId), billingEnabled())) continue;
    rivalsChecked.add(userId);
    try {
      await checkRivals(userId);
    } catch (err) {
      console.error(`[cron concurrents] ${userId} :`, err instanceof Error ? err.message : err);
    }
  }
  return NextResponse.json({ ...summary, rivalsChecked: rivalsChecked.size });
}

async function checkRivals(userId: string) {
  const admin = createAdminClient();
  const competitors = await refreshCompetitors(userId);
  const [{ data: location }, { data: reviews }, { data: account }] = await Promise.all([
    admin.from("locations").select("place_id").eq("user_id", userId).not("place_id", "is", null).limit(1).maybeSingle(),
    admin.from("reviews").select("rating").eq("user_id", userId).eq("is_demo", false).limit(5000),
    admin.from("accounts").select("email, alert_email").eq("id", userId).maybeSingle(),
  ]);
  let own: number | null = null;
  if (location?.place_id) own = (await placeDetails(location.place_id as string).catch(() => null))?.rating ?? null;
  if (own === null && reviews?.length) own = reviews.reduce((s, r) => s + (r.rating as number), 0) / reviews.length;
  const ahead = newlyAhead(competitors, own);
  if (!ahead.length) return;
  const names = ahead.map((c) => `${c.name} (${String(c.rating).replace(".", ",")} ★)`).join(", ");
  await sendPushToUser(userId, {
    title: "Un concurrent passe devant vous",
    body: `${names}. Demandez des avis cette semaine : QR code et demandes en un geste.`,
    url: "/app/visibilite#concurrents",
    tag: "concurrents",
  }).catch(() => 0);
  if (account?.alert_email) {
    await sendEmail({
      to: account.email as string,
      subject: "Un concurrent vient de passer devant vous sur Google",
      html: `<p>${names.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")} a désormais une meilleure note que vous sur Google.</p><p>Le levier le plus rapide : demander un avis à chacun de vos clients cette semaine, avec le QR code et les demandes par e-mail ou SMS.</p><p><a href="${siteUrl()}/app/visibilite#concurrents">Voir le comparatif</a></p>`,
    }).catch(() => undefined);
  }
}
