import type Stripe from "stripe";
import { isPlanId, PLANS } from "./config";
import { cleanReferralCode, newReferralCode } from "./referral-code";
import { createAdminClient } from "./supabase/admin";

export { cleanReferralCode, newReferralCode };

// Parrainage : un commerçant en recommande un autre. Quand le filleul paie sa première facture,
// chacun reçoit un mois de sa propre formule en crédit Stripe (déduit de la facture suivante).

export const REFERRAL_REWARD_MONTHS = 1;

/** Code de parrainage du compte, créé au premier affichage. */
export async function ensureReferralCode(accountId: string, current: string | null): Promise<string> {
  if (current) return current;
  const admin = createAdminClient();
  for (let i = 0; i < 5; i++) {
    const code = newReferralCode();
    const { error } = await admin.from("accounts").update({ referral_code: code }).eq("id", accountId).is("referral_code", null);
    if (!error) {
      const { data } = await admin.from("accounts").select("referral_code").eq("id", accountId).single();
      return (data?.referral_code as string) ?? code;
    }
  }
  throw new Error("Code de parrainage indisponible.");
}

/** À l'inscription : rattache le nouveau compte à son parrain. Sans effet si le code est inconnu. */
export async function attachReferral(newUserId: string, rawCode: unknown): Promise<void> {
  const code = cleanReferralCode(rawCode);
  if (!code) return;
  const admin = createAdminClient();
  const { data: parent } = await admin.from("accounts").select("id").eq("referral_code", code).maybeSingle();
  if (!parent || parent.id === newUserId) return;
  await admin.from("accounts").update({ referred_by: parent.id }).eq("id", newUserId).is("referred_by", null);
}

/**
 * Appelé par le webhook Stripe à chaque facture payée. Récompense une seule fois,
 * à la première facture réellement payée du filleul.
 */
export async function rewardReferralOnInvoice(stripe: Stripe, invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.amount_paid || invoice.amount_paid <= 0) return;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const admin = createAdminClient();
  const { data: sub } = await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  if (!sub) return;
  const { data: child } = await admin
    .from("accounts")
    .select("id, referred_by, referral_rewarded_at")
    .eq("id", sub.user_id)
    .maybeSingle();
  if (!child?.referred_by || child.referral_rewarded_at) return;

  // On marque d'abord : un webhook rejoué ne crédite jamais deux fois.
  const { data: marked } = await admin
    .from("accounts")
    .update({ referral_rewarded_at: new Date().toISOString() })
    .eq("id", child.id)
    .is("referral_rewarded_at", null)
    .select("id");
  if (!marked?.length) return;

  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, stripe_customer_id, plan")
    .in("user_id", [child.id, child.referred_by]);
  for (const s of subs ?? []) {
    if (!s.stripe_customer_id || !isPlanId(s.plan)) continue;
    const cents = PLANS[s.plan].priceEur * 100 * REFERRAL_REWARD_MONTHS;
    await stripe.customers.createBalanceTransaction(s.stripe_customer_id as string, {
      amount: -cents,
      currency: "eur",
      description: s.user_id === child.id ? "Parrainage Evolutio : mois offert (filleul)" : "Parrainage Evolutio : mois offert (parrain)",
    });
  }
}
