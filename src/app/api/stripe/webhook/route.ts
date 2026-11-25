import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { rewardReferralOnInvoice } from "@/lib/referral";
import { getStripe, syncSubscription } from "@/lib/stripe";

// Stripe appelle cette adresse à chaque changement d'abonnement (essai, paiement, échec, résiliation).
// C'est la seule voie par laquelle l'état d'un abonnement entre dans la base.
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new NextResponse("Webhook non configuré", { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    // La signature se vérifie sur le corps brut, d'où request.text().
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new NextResponse("Signature invalide", { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
      case "checkout.session.completed": {
        const session = event.data.object;
        if (typeof session.subscription === "string") {
          await syncSubscription(await stripe.subscriptions.retrieve(session.subscription));
        }
        break;
      }
      case "invoice.paid":
        await rewardReferralOnInvoice(stripe, event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    // Réponse 500 : Stripe renverra l'événement plus tard.
    console.error("[stripe] webhook :", err instanceof Error ? err.message : err);
    return new NextResponse("Erreur de traitement", { status: 500 });
  }
  return NextResponse.json({ received: true });
}
