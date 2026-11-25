"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isLocalMode, writeLocalEnv } from "@/lib/local-env";
import { ensureStripeCatalog } from "@/lib/stripe";

// Actions de l'assistant d'installation. Elles n'existent qu'en mode local, sur l'ordinateur du créateur :
// en ligne, les clés se règlent dans les variables d'environnement de l'hébergeur.

const ALLOWED = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_PUBSUB_TOPIC",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_SMS_FROM",
  "TWILIO_WHATSAPP_FROM",
  "GOOGLE_PLACES_API_KEY",
];

function done(key: "ok" | "erreur", message: string, anchor = ""): never {
  redirect(`/installation?${key}=${encodeURIComponent(message)}${anchor}`);
}

async function assertLocal(): Promise<void> {
  const host = (await headers()).get("host") ?? "";
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  if (!isLocalMode() || !local) {
    done("erreur", "Les réglages ne se modifient ici qu'en local. En ligne, utilisez les variables d'environnement de l'hébergeur.");
  }
}

export async function saveKeysAction(formData: FormData) {
  await assertLocal();
  const anchor = `#${String(formData.get("section") ?? "")}`;
  const updates: Record<string, string> = {};
  for (const key of ALLOWED) {
    const value = String(formData.get(key) ?? "").trim();
    if (value) updates[key] = value;
  }
  if (Object.keys(updates).length === 0) done("erreur", "Aucune valeur saisie.", anchor);

  if (updates.SUPABASE_URL) {
    updates.SUPABASE_URL = updates.SUPABASE_URL.replace(/\/+$/, "");
    if (!/^https?:\/\/[a-z0-9.:-]+$/i.test(updates.SUPABASE_URL)) {
      done("erreur", "L'adresse Supabase doit ressembler à https://abcdefgh.supabase.co", anchor);
    }
  }
  if (updates.STRIPE_SECRET_KEY) {
    if (!/^(sk|rk)_(test|live)_/.test(updates.STRIPE_SECRET_KEY)) {
      done("erreur", "La clé Stripe attendue est la clé secrète, qui commence par sk_test_ (ou sk_live_).", anchor);
    }
    if (/_live_/.test(updates.STRIPE_SECRET_KEY) && formData.get("live_ok") !== "on") {
      done("erreur", "Clé réelle détectée. Cochez la case de confirmation, ou utilisez d'abord une clé de test (sk_test_).", anchor);
    }
  }
  for (const key of ["TWILIO_SMS_FROM", "TWILIO_WHATSAPP_FROM"]) {
    if (updates[key]) {
      updates[key] = updates[key].replace(/[\s.\-()]/g, "").replace(/^whatsapp:/i, "");
      if (!/^\+\d{8,15}$/.test(updates[key])) done("erreur", "Les numéros Twilio s'écrivent au format international : +33…", anchor);
    }
  }
  if (updates.EMAIL_FROM && !/^\S+@\S+\.\S+$/.test(updates.EMAIL_FROM)) {
    done("erreur", "L'adresse d'expédition doit être une adresse e-mail.", anchor);
  }

  try {
    writeLocalEnv(updates);
  } catch (err) {
    done("erreur", err instanceof Error ? err.message : "Enregistrement impossible.", anchor);
  }
  done("ok", "Réglages enregistrés.", anchor);
}

export async function stripeCatalogAction() {
  await assertLocal();
  let error: string | null = null;
  try {
    writeLocalEnv(await ensureStripeCatalog());
  } catch (err) {
    error = err instanceof Error ? err.message : "Stripe a refusé la demande.";
  }
  if (error) done("erreur", `Création des formules impossible : ${error}`, "#stripe");
  done("ok", "Formules, prix et page de gestion d'abonnement créés dans Stripe.", "#stripe");
}
