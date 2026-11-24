import fs from "node:fs";
import path from "node:path";
import { PLANS, supabaseConfigured } from "./config";
import { createAdminClient } from "./supabase/admin";

// État de chaque service, pour l'assistant /installation. Ne renvoie jamais la valeur d'une clé.

export type StepState = "ok" | "todo" | "error";
export type Step = { state: StepState; detail: string };

export async function supabaseStep(): Promise<Step & { schemaMissing: boolean; sqlEditorUrl: string | null }> {
  const url = process.env.SUPABASE_URL ?? "";
  const ref = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/)?.[1];
  const sqlEditorUrl = ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : null;
  if (!supabaseConfigured()) {
    return { state: "todo", detail: "Collez l'adresse du projet et ses deux clés.", schemaMissing: false, sqlEditorUrl };
  }
  try {
    const { error } = await createAdminClient().from("accounts").select("id", { count: "exact", head: true });
    if (!error) {
      const { error: columnError } = await createAdminClient().from("accounts").select("insights_at").limit(1);
      if (columnError) {
        return {
          state: "error",
          detail: "Base connectée, mais le schéma est ancien. Relancez le script SQL ci-dessous pour le mettre à jour.",
          schemaMissing: true,
          sqlEditorUrl,
        };
      }
      return { state: "ok", detail: "Base connectée et tables en place.", schemaMissing: false, sqlEditorUrl };
    }
    const missing = error.code === "PGRST205" || error.code === "42P01" || /find the table|does not exist/i.test(error.message);
    if (missing) {
      return {
        state: "error",
        detail: "Clés valides, mais les tables n'existent pas encore. Lancez le script SQL ci-dessous.",
        schemaMissing: true,
        sqlEditorUrl,
      };
    }
    return { state: "error", detail: `Supabase a refusé la connexion : ${error.message || "clé invalide"}.`, schemaMissing: false, sqlEditorUrl };
  } catch (err) {
    return {
      state: "error",
      detail: `Projet injoignable : ${err instanceof Error ? err.message : "erreur réseau"}. Vérifiez l'adresse.`,
      schemaMissing: false,
      sqlEditorUrl,
    };
  }
}

export function stripeStep(): Step & { keyPresent: boolean; live: boolean; catalogReady: boolean } {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const live = key.startsWith("sk_live_") || key.startsWith("rk_live_");
  const catalogReady = Object.values(PLANS).every((plan) => Boolean(process.env[plan.priceEnv]));
  if (!key) {
    return { state: "todo", detail: "Sans Stripe, l'application reste en mode découverte : tout est ouvert, sans paiement.", keyPresent: false, live, catalogReady };
  }
  if (!catalogReady) {
    return { state: "error", detail: "Clé enregistrée. Il reste à créer les 3 formules : un clic suffit.", keyPresent: true, live, catalogReady };
  }
  return {
    state: "ok",
    detail: live ? "Stripe connecté en mode réel : les paiements sont encaissés." : "Stripe connecté en mode test : aucun vrai paiement.",
    keyPresent: true,
    live,
    catalogReady,
  };
}

export function simpleStep(keys: string[], okText: string, todoText: string): Step {
  return keys.every((key) => Boolean(process.env[key])) ? { state: "ok", detail: okText } : { state: "todo", detail: todoText };
}

/** Script SQL du schéma, affiché dans l'assistant pour être copié dans Supabase. */
export function schemaSql(): string {
  for (const base of [process.cwd(), path.join(process.cwd(), "..")]) {
    try {
      return fs.readFileSync(/*turbopackIgnore: true*/ path.join(base, "supabase", "schema.sql"), "utf8");
    } catch {
      // essai suivant
    }
  }
  return "-- Fichier supabase/schema.sql introuvable : ouvrez-le dans le dossier du projet.";
}
