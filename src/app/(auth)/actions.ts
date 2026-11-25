"use server";

import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/config";
import { attachReferral } from "@/lib/referral";
import { isLocalMode } from "@/lib/local-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function back(path: string, key: "ok" | "erreur", message: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signUpAction(formData: FormData) {
  const { email, password } = readCredentials(formData);
  if (!/^\S+@\S+\.\S+$/.test(email)) back("/inscription", "erreur", "Adresse e-mail invalide.");
  if (password.length < 8) back("/inscription", "erreur", "Le mot de passe doit contenir au moins 8 caractères.");

  const supabase = await createClient();
  if (isLocalMode()) {
    // En local, pas d'e-mail de confirmation à attendre : le compte est validé tout de suite.
    const { data: created, error: createError } = await createAdminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) back("/inscription", "erreur", createError.message);
    if (created.user) await attachReferral(created.user.id, formData.get("parrain")).catch(() => undefined);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) back("/connexion", "erreur", "Compte créé. Connectez-vous pour continuer.");
    redirect("/app");
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
  });
  if (error) back("/inscription", "erreur", error.message);
  if (data.user) await attachReferral(data.user.id, formData.get("parrain")).catch(() => undefined);
  if (data.session) redirect("/app"); // confirmation d'e-mail désactivée dans Supabase
  back("/inscription", "ok", "Compte créé. Ouvrez l'e-mail de confirmation que nous venons d'envoyer pour l'activer.");
}

export async function signInAction(formData: FormData) {
  const { email, password } = readCredentials(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) back("/connexion", "erreur", "E-mail ou mot de passe incorrect, ou compte pas encore confirmé.");
  redirect("/app");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(formData: FormData) {
  const { email } = readCredentials(formData);
  if (email) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/app/reglages`,
    });
  }
  // Même message que l'adresse existe ou non, pour ne pas révéler qui a un compte.
  back("/mot-de-passe", "ok", "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.");
}
