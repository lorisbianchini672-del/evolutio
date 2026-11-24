import { billingEnabled, isPlanId, PLANS, type Plan } from "./config";
import type { Subscription } from "./types";

/** Formule appliquée au compte. Sans Stripe (mode découverte), on ouvre les limites les plus larges. */
export function planOf(subscription: Pick<Subscription, "plan"> | null): Plan {
  if (!billingEnabled()) return PLANS.multi;
  return isPlanId(subscription?.plan) ? PLANS[subscription.plan] : PLANS.essentiel;
}

export function monthStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
