"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isPlanId, SECTORS, siteUrl, TONES, TRIAL_DAYS } from "@/lib/config";
import { aiConfigured, generateInsights } from "@/lib/ai";
import { normalizePhone, phoneAlertText, sendPhoneAlert } from "@/lib/alerts";
import { decryptSecret } from "@/lib/crypto";
import { addManualReview, clearDemoData, loadDemoData } from "@/lib/demo";
import { monthlyReportEmail, reviewRequestEmail, sendEmail } from "@/lib/email";
import { revokeToken } from "@/lib/google";
import { monthStartIso, planOf } from "@/lib/plan";
import { loadReport } from "@/lib/report";
import { draftReview, publishReview, syncUser } from "@/lib/reviews";
import { requireAccount, requireSubscriber } from "@/lib/session";
import { getStripe, priceIdFor } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Location } from "@/lib/types";

function go(path: string, key: "ok" | "erreur", message: string, hash = ""): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}${hash}`);
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "Une erreur est survenue.";
}

function inboxPath(formData: FormData): string {
  if (formData.get("retour") === "rapide") return "/app/rapide";
  const view = String(formData.get("vue") ?? "");
  return ["publies", "tous"].includes(view) ? `/app?vue=${view}` : "/app";
}

// ---- Avis ---------------------------------------------------------------------------------

export async function draftAction(formData: FormData) {
  const { user } = await requireSubscriber();
  const id = String(formData.get("review_id") ?? "");
  let error: string | null = null;
  try {
    await draftReview(user.id, id);
  } catch (err) {
    error = messageOf(err);
  }
  revalidatePath("/app");
  const back = inboxPath(formData);
  if (back === "/app/rapide") {
    if (error) go(`/app/rapide?avis=${encodeURIComponent(id)}`, "erreur", error);
    redirect(`/app/rapide?avis=${encodeURIComponent(id)}`);
  }
  if (error) go(back, "erreur", error);
  redirect(`${back}#avis-${id}`);
}

export async function publishAction(formData: FormData) {
  const { user } = await requireSubscriber();
  const id = String(formData.get("review_id") ?? "");
  const text = String(formData.get("text") ?? "");
  let error: string | null = null;
  try {
    await publishReview(user.id, id, text);
  } catch (err) {
    error = messageOf(err);
  }
  revalidatePath("/app");
  if (error) go(inboxPath(formData), "erreur", error);
  go(inboxPath(formData), "ok", "Réponse publiée.");
}

export async function ignoreAction(formData: FormData) {
  const { user } = await requireSubscriber();
  const id = String(formData.get("review_id") ?? "");
  await createAdminClient()
    .from("reviews")
    .update({ status: "ignored" })
    .eq("id", id)
    .eq("user_id", user.id)
    .neq("status", "published");
  revalidatePath("/app");
  redirect(inboxPath(formData));
}

export async function syncAction() {
  const { user } = await requireSubscriber();
  let error: string | null = null;
  let summary = "";
  try {
    const r = await syncUser(user.id);
    summary = `${r.imported} nouvel(s) avis importé(s), ${r.autoPublished} réponse(s) publiée(s) automatiquement.`;
  } catch (err) {
    error = messageOf(err);
  }
  revalidatePath("/app");
  if (error) go("/app", "erreur", error);
  go("/app", "ok", summary);
}

// ---- Analyse ------------------------------------------------------------------------------

export async function sendReportAction() {
  const { account } = await requireSubscriber();
  let error: string | null = null;
  try {
    const report = await loadReport(createAdminClient(), account, 1);
    const result = await sendEmail({ to: account.email, ...monthlyReportEmail(report, account.business_name) });
    if (!result.sent) throw new Error(result.error);
  } catch (err) {
    error = messageOf(err);
  }
  if (error) go("/app/analyse", "erreur", error);
  go("/app/analyse", "ok", `Rapport envoyé à ${account.email}.`);
}

export async function analyzeAction() {
  const { supabase, user, account } = await requireSubscriber();
  if (!aiConfigured()) go("/app/analyse", "erreur", "La synthèse a besoin de la clé d'IA (étape 3 de l'installation).");
  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating, comment")
    .not("comment", "is", null)
    .order("review_created_at", { ascending: false })
    .limit(60)
    .returns<{ rating: number; comment: string | null }[]>();
  if (!reviews || reviews.length < 5) go("/app/analyse", "erreur", "Il faut au moins 5 avis avec du texte pour une synthèse fiable.");

  let error: string | null = null;
  try {
    const insights = await generateInsights(account.business_name, reviews);
    if (!insights) throw new Error("L'IA n'a pas renvoyé de synthèse exploitable. Réessayez.");
    const { error: saveError } = await supabase
      .from("accounts")
      .update({ insights, insights_at: new Date().toISOString() })
      .eq("id", user.id);
    if (saveError) throw new Error(saveError.message);
  } catch (err) {
    error = messageOf(err);
  }
  revalidatePath("/app/analyse");
  if (error) go("/app/analyse", "erreur", error);
  go("/app/analyse", "ok", `Synthèse mise à jour à partir de ${reviews.length} avis.`);
}

// ---- Démonstration ------------------------------------------------------------------------

export async function loadDemoAction() {
  const { user, account } = await requireSubscriber();
  let error: string | null = null;
  try {
    await loadDemoData(user.id, account.business_name);
  } catch (err) {
    error = messageOf(err);
  }
  revalidatePath("/app");
  if (error) go("/app", "erreur", error);
  redirect("/app");
}

export async function addManualReviewAction(formData: FormData) {
  const { user, account } = await requireSubscriber();
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 4000);
  const reviewer = String(formData.get("reviewer_name") ?? "").trim().slice(0, 80);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) go("/app", "erreur", "Choisissez une note de 1 à 5.");

  let error: string | null = null;
  let id = "";
  try {
    id = await addManualReview(user.id, account.business_name, {
      reviewer_name: reviewer || null,
      rating,
      comment: comment || null,
    });
    await draftReview(user.id, id);
  } catch (err) {
    error = messageOf(err);
  }
  revalidatePath("/app");
  if (error) go("/app", "erreur", error);
  redirect(`/app#avis-${id}`);
}

export async function clearDemoAction() {
  const { user } = await requireAccount();
  await clearDemoData(user.id);
  revalidatePath("/app");
  go("/app/reglages", "ok", "Données de démonstration supprimées.");
}

// ---- Collecte d'avis ----------------------------------------------------------------------

export async function sendRequestAction(formData: FormData) {
  const { user, account, subscription } = await requireSubscriber();
  const admin = createAdminClient();
  const locationId = String(formData.get("location_id") ?? "");
  const recipient = String(formData.get("recipient") ?? "").trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(recipient)) go("/app/collecte", "erreur", "Adresse e-mail invalide.");
  if (formData.get("is_customer") !== "on") {
    go("/app/collecte", "erreur", "Confirmez que cette personne est bien cliente de votre établissement.");
  }

  const { data: location } = await admin
    .from("locations")
    .select("*")
    .eq("id", locationId)
    .eq("user_id", user.id)
    .maybeSingle<Location>();
  if (!location) go("/app/collecte", "erreur", "Établissement introuvable.");
  if (!location.review_url) {
    go("/app/collecte", "erreur", "Connectez d'abord la fiche Google : sans elle, la page de collecte n'a pas de lien d'avis.");
  }

  const plan = planOf(subscription);
  const { count } = await admin
    .from("review_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("sent_at", monthStartIso());
  if ((count ?? 0) >= plan.emailRequestsPerMonth) {
    go("/app/collecte", "erreur", `Quota du mois atteint (${plan.emailRequestsPerMonth} demandes avec la formule ${plan.name}).`);
  }

  // Une seule demande par client et par établissement : la contrainte unique de la base fait foi.
  const { data: row, error: insertError } = await admin
    .from("review_requests")
    .insert({ user_id: user.id, location_id: location.id, recipient })
    .select("id")
    .single<{ id: string }>();
  if (insertError || !row) go("/app/collecte", "erreur", "Cette adresse a déjà reçu une demande d'avis pour cet établissement.");

  const businessName = account.business_name.trim() || location.title;
  const mail = reviewRequestEmail({ businessName, link: `${siteUrl()}/r/${location.slug}` });
  const result = await sendEmail({ to: recipient, ...mail, replyTo: account.email, fromName: businessName });
  if (!result.sent) {
    await admin.from("review_requests").delete().eq("id", row.id);
    go("/app/collecte", "erreur", result.error ?? "Envoi impossible.");
  }
  revalidatePath("/app/collecte");
  go("/app/collecte", "ok", `Demande d'avis envoyée à ${recipient}.`);
}

// ---- Réglages -----------------------------------------------------------------------------

export async function saveSettingsAction(formData: FormData) {
  const { supabase, user } = await requireAccount();
  const text = (name: string, max: number) => String(formData.get(name) ?? "").trim().slice(0, max);
  const sector = text("sector", 30);
  const tone = text("tone", 30);
  const auto = text("auto_publish", 2);
  const channel = text("alert_channel", 10);
  if (["sms", "whatsapp"].includes(channel) && !normalizePhone(text("alert_phone", 30))) {
    go("/app/reglages", "erreur", "Pour les alertes SMS ou WhatsApp, indiquez un numéro valide (exemple : 06 12 34 56 78).");
  }

  const { error } = await supabase
    .from("accounts")
    .update({
      business_name: text("business_name", 120),
      sector: sector in SECTORS ? sector : "commerce",
      tone: tone in TONES ? tone : "chaleureux",
      signature: text("signature", 120),
      private_contact: text("private_contact", 160),
      extra_instructions: text("extra_instructions", 600),
      auto_publish_min_rating: auto === "4" ? 4 : auto === "5" ? 5 : null,
      alert_email: formData.get("alert_email") === "on",
      alert_channel: ["sms", "whatsapp"].includes(channel) ? channel : "none",
      alert_phone: text("alert_phone", 30),
      report_email: formData.get("report_email") === "on",
    })
    .eq("id", user.id);
  revalidatePath("/app", "layout");
  if (error) go("/app/reglages", "erreur", error.message);
  go("/app/reglages", "ok", "Réglages enregistrés.");
}

export async function testPhoneAlertAction() {
  const { account } = await requireAccount();
  if (account.alert_channel !== "none" && !normalizePhone(account.alert_phone)) {
    go("/app/reglages", "erreur", "Numéro de téléphone invalide. Exemple : 06 12 34 56 78.");
  }
  const result = await sendPhoneAlert(
    account,
    phoneAlertText({
      locationTitle: account.business_name.trim() || "votre établissement",
      rating: 2,
      reviewer: "Exemple",
      comment: "Ceci est un message d'essai : vos alertes fonctionnent.",
      url: `${siteUrl()}/app/rapide`,
    }),
  );
  if (!result.sent) go("/app/reglages", "erreur", result.error ?? "Envoi impossible.");
  go("/app/reglages", "ok", "Alerte d'essai envoyée.");
}

export async function updatePasswordAction(formData: FormData) {
  const { supabase } = await requireAccount();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) go("/app/reglages", "erreur", "Le mot de passe doit contenir au moins 8 caractères.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) go("/app/reglages", "erreur", error.message);
  go("/app/reglages", "ok", "Mot de passe modifié.");
}

export async function disconnectGoogleAction() {
  const { user } = await requireAccount();
  const admin = createAdminClient();
  const { data } = await admin
    .from("google_connections")
    .select("refresh_token_enc")
    .eq("user_id", user.id)
    .maybeSingle<{ refresh_token_enc: string }>();
  if (data) {
    try {
      await revokeToken(decryptSecret(data.refresh_token_enc));
    } catch {
      // Jeton illisible ou déjà révoqué : on supprime quand même la connexion locale.
    }
  }
  await admin.from("google_connections").delete().eq("user_id", user.id);
  await admin.from("locations").delete().eq("user_id", user.id).eq("is_demo", false);
  revalidatePath("/app", "layout");
  go("/app/reglages", "ok", "Compte Google déconnecté. Les avis importés ont été supprimés.");
}

// ---- Abonnement ---------------------------------------------------------------------------

export async function checkoutAction(formData: FormData) {
  const { user, account, subscription } = await requireAccount();
  const plan = formData.get("plan");
  if (!isPlanId(plan)) go("/app/abonnement", "erreur", "Formule inconnue.");

  let url: string | null = null;
  let error: string | null = null;
  try {
    const stripe = getStripe();
    let customerId = subscription?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: account.email, metadata: { user_id: user.id } });
      customerId = customer.id;
      await createAdminClient()
        .from("subscriptions")
        .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
    }
    // L'essai gratuit n'est accordé qu'une fois, au premier abonnement.
    const firstSubscription = !subscription?.stripe_subscription_id;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceIdFor(plan), quantity: 1 }],
      subscription_data: {
        metadata: { user_id: user.id, plan },
        ...(firstSubscription
          ? {
              trial_period_days: TRIAL_DAYS,
              trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } },
            }
          : {}),
      },
      payment_method_collection: firstSubscription ? "if_required" : "always",
      allow_promotion_codes: true,
      locale: "fr",
      success_url: `${siteUrl()}/app/abonnement?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/app/abonnement`,
    });
    url = session.url;
  } catch (err) {
    error = messageOf(err);
  }
  if (error || !url) go("/app/abonnement", "erreur", error ?? "Stripe n'a pas renvoyé de page de paiement.");
  redirect(url);
}

export async function portalAction() {
  const { subscription } = await requireAccount();
  if (!subscription?.stripe_customer_id) go("/app/abonnement", "erreur", "Aucun abonnement à gérer pour l'instant.");
  let url: string | null = null;
  let error: string | null = null;
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      ...(process.env.STRIPE_PORTAL_CONFIG ? { configuration: process.env.STRIPE_PORTAL_CONFIG } : {}),
      return_url: `${siteUrl()}/app/abonnement`,
    });
    url = session.url;
  } catch (err) {
    error = messageOf(err);
  }
  if (error || !url) go("/app/abonnement", "erreur", error ?? "Portail Stripe indisponible.");
  redirect(url);
}
