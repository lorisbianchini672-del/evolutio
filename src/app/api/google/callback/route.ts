import { NextResponse, type NextRequest } from "next/server";
import { billingEnabled, siteUrl } from "@/lib/config";
import { encryptSecret } from "@/lib/crypto";
import { makeSlug } from "@/lib/demo";
import { hasAccess } from "@/lib/entitlement";
import {
  emailFromIdToken,
  enableReviewNotifications,
  exchangeCode,
  listAccounts,
  listLocations,
  type GoogleLocation,
} from "@/lib/google";
import { planOf } from "@/lib/plan";
import { syncUser } from "@/lib/reviews";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Subscription } from "@/lib/types";

export const maxDuration = 60;

function reviewUrlOf(location: GoogleLocation): string | null {
  if (location.metadata?.newReviewUri) return location.metadata.newReviewUri;
  if (location.metadata?.placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(location.metadata.placeId)}`;
  }
  return null;
}

// Retour de Google après consentement : on stocke le jeton chiffré, on importe les établissements et les avis.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const finish = (key: "ok" | "erreur", message: string) => {
    const response = NextResponse.redirect(`${siteUrl()}/app?${key}=${encodeURIComponent(message)}`);
    response.cookies.delete({ name: "g_state", path: "/api/google" });
    return response;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${siteUrl()}/connexion`);

  if (searchParams.get("error")) return finish("erreur", "Connexion Google annulée.");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expected = request.cookies.get("g_state")?.value;
  if (!code || !state || !expected || state !== expected) {
    return finish("erreur", "La demande de connexion a expiré. Relancez la connexion Google.");
  }

  const admin = createAdminClient();
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Subscription>();
  if (!hasAccess(subscription?.status, billingEnabled())) {
    return NextResponse.redirect(`${siteUrl()}/app/abonnement`);
  }
  const plan = planOf(subscription);

  let added = 0;
  let skipped = 0;
  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refreshToken) {
      throw new Error(
        "Google n'a pas fourni d'accès durable. Retirez l'application dans les autorisations de votre compte Google, puis reconnectez-vous.",
      );
    }

    const accounts = await listAccounts(tokens.accessToken);
    const found: { accountName: string; location: GoogleLocation }[] = [];
    for (const account of accounts) {
      for (const location of await listLocations(tokens.accessToken, account.name)) {
        found.push({ accountName: account.name, location });
      }
    }
    if (found.length === 0) throw new Error("Aucun établissement trouvé sur ce compte Google.");

    const { error: connectionError } = await admin.from("google_connections").upsert(
      {
        user_id: user.id,
        google_email: emailFromIdToken(tokens.idToken),
        refresh_token_enc: encryptSecret(tokens.refreshToken),
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (connectionError) throw new Error(`Enregistrement de la connexion impossible : ${connectionError.message}`);

    // Les établissements déjà connus gardent leur lien public (un QR code imprimé doit rester valable).
    const { data: existing } = await admin
      .from("locations")
      .select("id, google_location_name")
      .eq("user_id", user.id)
      .eq("is_demo", false);
    const known = new Map((existing ?? []).map((l) => [l.google_location_name as string, l.id as string]));
    let total = known.size;
    const usedAccounts = new Set<string>();

    for (const { accountName, location } of found) {
      const title = location.title?.trim() || "Établissement";
      const values = { google_account_name: accountName, title, review_url: reviewUrlOf(location) };
      const knownId = known.get(location.name);
      if (knownId) {
        await admin.from("locations").update(values).eq("id", knownId);
        usedAccounts.add(accountName);
      } else if (total < plan.maxLocations) {
        const { error } = await admin
          .from("locations")
          .insert({ user_id: user.id, google_location_name: location.name, slug: makeSlug(title), ...values });
        if (error) throw new Error(`Enregistrement de l'établissement impossible : ${error.message}`);
        total += 1;
        added += 1;
        usedAccounts.add(accountName);
      } else {
        skipped += 1;
      }
    }

    for (const accountName of usedAccounts) {
      try {
        await enableReviewNotifications(tokens.accessToken, accountName);
      } catch (err) {
        // Sans notification, la synchronisation planifiée prend le relais.
        console.error("[google] notifications :", err instanceof Error ? err.message : err);
      }
    }

    await syncUser(user.id, { initial: true });
  } catch (err) {
    return finish("erreur", err instanceof Error ? err.message : "Connexion Google impossible.");
  }

  const note = skipped
    ? ` ${skipped} autre(s) établissement(s) non importé(s) : la formule ${plan.name} en couvre ${plan.maxLocations}.`
    : "";
  return finish("ok", `Fiche Google connectée, ${added} établissement(s) ajouté(s) et avis importés.${note}`);
}
