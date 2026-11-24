import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { billingEnabled, PLAN_IDS, PLANS, TRIAL_DAYS } from "@/lib/config";
import { statusLabel } from "@/lib/entitlement";
import { requireAccount } from "@/lib/session";
import { getStripe, syncSubscription } from "@/lib/stripe";
import { checkoutAction, portalAction } from "../actions";

export const metadata = { title: "Abonnement" };

function formatDate(iso: string | null): string | null {
  return iso ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(iso)) : null;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { user, subscription, allowed } = await requireAccount();

  // Retour de Stripe Checkout : on enregistre l'abonnement tout de suite, sans attendre le webhook.
  const sessionId = typeof params.session_id === "string" ? params.session_id : null;
  if (sessionId && billingEnabled()) {
    let message = "Abonnement enregistré.";
    let key: "ok" | "erreur" = "ok";
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.client_reference_id !== user.id) throw new Error("Cette session de paiement appartient à un autre compte.");
      if (typeof session.subscription === "string") {
        await syncSubscription(await stripe.subscriptions.retrieve(session.subscription));
      }
    } catch (err) {
      key = "erreur";
      message = err instanceof Error ? err.message : "Vérification du paiement impossible.";
    }
    redirect(`/app/abonnement?${key}=${encodeURIComponent(message)}`);
  }

  const hasSubscription = Boolean(subscription?.stripe_subscription_id) && subscription?.status !== "canceled";
  const trialEnd = subscription?.status === "trialing" ? formatDate(subscription.trial_end) : null;
  const periodEnd = formatDate(subscription?.current_period_end ?? null);
  const firstTime = !subscription?.stripe_subscription_id;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Abonnement</h1>
      <Notice params={params} />

      {!billingEnabled() ? (
        <p className="card text-sm text-stone-700">
          Stripe n&apos;est pas encore configuré : l&apos;application tourne en mode découverte, sans paiement. Suivez
          l&apos;étape « Stripe » du guide d&apos;installation pour activer les abonnements.
        </p>
      ) : (
        <>
          <section className="card space-y-2">
            <p className="font-medium">
              {statusLabel(subscription?.status)}
              {subscription?.plan && subscription.plan in PLANS
                ? ` · formule ${PLANS[subscription.plan as keyof typeof PLANS].name}`
                : ""}
            </p>
            {trialEnd && <p className="text-sm text-stone-600">Fin de l&apos;essai le {trialEnd}. Sans carte enregistrée, l&apos;abonnement s&apos;arrête seul à cette date.</p>}
            {subscription?.status === "active" && periodEnd && (
              <p className="text-sm text-stone-600">
                {subscription.cancel_at_period_end ? `Résiliation prévue le ${periodEnd}.` : `Prochain renouvellement le ${periodEnd}.`}
              </p>
            )}
            {!allowed && <p className="text-sm text-stone-600">Choisissez une formule pour accéder à vos avis.</p>}
            {subscription?.stripe_customer_id && subscription.stripe_subscription_id && (
              <form action={portalAction}>
                <SubmitButton className="btn btn-secondary">Gérer la carte, les factures ou résilier</SubmitButton>
              </form>
            )}
          </section>

          {!hasSubscription && (
            <div className="grid gap-4 md:grid-cols-3">
              {PLAN_IDS.map((id) => {
                const plan = PLANS[id];
                return (
                  <form key={id} action={checkoutAction} className="card flex flex-col gap-4">
                    <input type="hidden" name="plan" value={id} />
                    <div>
                      <h2 className="font-semibold">{plan.name}</h2>
                      <p className="mt-1">
                        <span className="text-3xl font-semibold">{plan.priceEur} €</span>
                        <span className="text-sm text-stone-500"> HT / mois</span>
                      </p>
                    </div>
                    <ul className="flex-1 space-y-1.5 text-sm text-stone-700">
                      {plan.features.map((feature) => (
                        <li key={feature}>• {feature}</li>
                      ))}
                    </ul>
                    <SubmitButton className="btn btn-primary w-full">
                      {firstTime ? `Essayer ${TRIAL_DAYS} jours` : "Choisir cette formule"}
                    </SubmitButton>
                  </form>
                );
              })}
            </div>
          )}
          <p className="text-sm text-stone-500">Sans engagement. Paiement et factures gérés par Stripe.</p>
        </>
      )}
    </div>
  );
}
