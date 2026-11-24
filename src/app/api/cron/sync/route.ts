import { NextResponse, type NextRequest } from "next/server";
import { billingEnabled } from "@/lib/config";
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
  return NextResponse.json(summary);
}
