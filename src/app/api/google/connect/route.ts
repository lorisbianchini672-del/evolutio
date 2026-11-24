import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { billingEnabled, siteUrl } from "@/lib/config";
import { hasAccess } from "@/lib/entitlement";
import { buildAuthUrl, googleConfigured } from "@/lib/google";
import { createClient } from "@/lib/supabase/server";

// Départ de la connexion Google : on envoie l'utilisateur sur l'écran de consentement.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${siteUrl()}/connexion`);

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle<{ status: string }>();
  if (!hasAccess(subscription?.status, billingEnabled())) {
    return NextResponse.redirect(`${siteUrl()}/app/abonnement`);
  }
  if (!googleConfigured()) {
    const message = encodeURIComponent("La connexion Google n'est pas configurée sur ce serveur.");
    return NextResponse.redirect(`${siteUrl()}/app?erreur=${message}`);
  }

  // Jeton anti-falsification : Google nous le renvoie, on le compare au cookie.
  const state = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(buildAuthUrl(state));
  response.cookies.set("g_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: siteUrl().startsWith("https://"),
    maxAge: 600,
    path: "/api/google",
  });
  return response;
}
