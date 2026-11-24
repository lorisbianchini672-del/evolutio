import { redirect } from "next/navigation";
import { billingEnabled } from "./config";
import { hasAccess } from "./entitlement";
import { createClient } from "./supabase/server";
import type { Account, Subscription } from "./types";

/** Utilisateur connecté, ou redirection vers la page de connexion. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  return { supabase, user };
}

/** Utilisateur connecté avec son compte et son abonnement. */
export async function requireAccount() {
  const { supabase, user } = await requireUser();
  const [{ data: account }, { data: subscription }] = await Promise.all([
    supabase.from("accounts").select("*").eq("id", user.id).maybeSingle<Account>(),
    supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle<Subscription>(),
  ]);
  if (!account) {
    throw new Error(
      "Compte introuvable. Le schéma supabase/schema.sql a-t-il bien été exécuté avant l'inscription ?",
    );
  }
  const allowed = hasAccess(subscription?.status, billingEnabled());
  return { supabase, user, account, subscription: subscription ?? null, allowed };
}

/** Comme requireAccount, mais renvoie vers la page d'abonnement si l'accès n'est pas ouvert. */
export async function requireSubscriber() {
  const ctx = await requireAccount();
  if (!ctx.allowed) redirect("/app/abonnement");
  return ctx;
}
