import Stripe from "stripe";
import { APP_NAME, isPlanId, PLANS, type PlanId } from "./config";
import { ensureLocalEnv } from "./local-env";
import { createAdminClient } from "./supabase/admin";

let client: { key: string; stripe: Stripe } | null = null;

export function getStripe(): Stripe {
  ensureLocalEnv();
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe n'est pas connecté : renseignez la clé dans l'assistant d'installation.");
  if (client?.key !== key) client = { key, stripe: new Stripe(key) };
  return client.stripe;
}

/**
 * Crée dans Stripe ce dont l'application a besoin, sans passer par le tableau de bord :
 * les 3 formules et leurs prix mensuels, puis la page de gestion d'abonnement (portail client).
 * Peut être relancée sans risque : ce qui existe déjà est réutilisé.
 */
export async function ensureStripeCatalog(): Promise<Record<string, string>> {
  const stripe = getStripe();
  const settings: Record<string, string> = {};
  const products: { product: string; prices: string[] }[] = [];

  for (const plan of Object.values(PLANS)) {
    const lookupKey = `evolutio_${plan.id}_mensuel`;
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    let price = existing.data[0];
    if (!price) {
      const product = await stripe.products.create({ name: `${APP_NAME} ${plan.name}`, metadata: { plan: plan.id } });
      price = await stripe.prices.create({
        product: product.id,
        currency: "eur",
        unit_amount: plan.priceEur * 100,
        recurring: { interval: "month" },
        lookup_key: lookupKey,
        tax_behavior: "exclusive", // prix affichés hors taxes
        metadata: { plan: plan.id },
      });
    }
    settings[plan.priceEnv] = price.id;
    products.push({ product: typeof price.product === "string" ? price.product : price.product.id, prices: [price.id] });
  }

  if (!process.env.STRIPE_PORTAL_CONFIG) {
    const portal = await stripe.billingPortal.configurations.create({
      business_profile: { headline: `${APP_NAME} · Gérer mon abonnement` },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price"],
          proration_behavior: "create_prorations",
          products,
        },
      },
    });
    settings.STRIPE_PORTAL_CONFIG = portal.id;
  }
  return settings;
}

export function priceIdFor(plan: PlanId): string {
  const id = process.env[PLANS[plan].priceEnv];
  if (!id) {
    throw new Error(`${PLANS[plan].priceEnv} manquante : créez les formules depuis l'assistant d'installation.`);
  }
  return id;
}

export function planForPrice(priceId: string | undefined): PlanId | null {
  if (!priceId) return null;
  for (const plan of Object.values(PLANS)) {
    if (process.env[plan.priceEnv] === priceId) return plan.id;
  }
  return null;
}

function toIso(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/** Recopie l'état d'un abonnement Stripe dans la table subscriptions. Seule source d'écriture de cette table. */
export async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const admin = createAdminClient();
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const item = subscription.items.data[0];
  const metaPlan = subscription.metadata?.plan;
  const plan = planForPrice(item?.price?.id) ?? (isPlanId(metaPlan) ? metaPlan : null);

  const values = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan,
    status: subscription.status,
    trial_end: toIso(subscription.trial_end),
    current_period_end: toIso(item?.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  const userId = subscription.metadata?.user_id;
  if (userId) {
    const { error } = await admin.from("subscriptions").upsert({ user_id: userId, ...values }, { onConflict: "user_id" });
    if (error) throw new Error(`Écriture de l'abonnement impossible : ${error.message}`);
    return;
  }
  const { error } = await admin.from("subscriptions").update(values).eq("stripe_customer_id", customerId);
  if (error) throw new Error(`Écriture de l'abonnement impossible : ${error.message}`);
}
