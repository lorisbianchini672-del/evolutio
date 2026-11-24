// Crée dans Stripe les 3 formules et leurs prix mensuels, puis (si le site est en ligne) le webhook.
// Usage : npm run stripe:setup            (clé de test)
//         npm run stripe:setup -- --live  (clé réelle, à lancer une seule fois au moment d'encaisser)
// Le script peut être relancé sans risque : il réutilise ce qui existe déjà.
import Stripe from "stripe";

const PLANS = [
  { id: "essentiel", name: "Essentiel", amount: 1900, env: "STRIPE_PRICE_ESSENTIEL" },
  { id: "pro", name: "Pro", amount: 3900, env: "STRIPE_PRICE_PRO" },
  { id: "multi", name: "Multi", amount: 7900, env: "STRIPE_PRICE_MULTI" },
];
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const key = process.env.STRIPE_SECRET_KEY;
const appName = "Evolutio";
const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
const live = process.argv.includes("--live");

if (!key) {
  console.error("STRIPE_SECRET_KEY est vide dans .env.local. Copiez la clé secrète depuis Stripe > Développeurs > Clés API.");
  process.exit(1);
}
if (key.startsWith("sk_live_") && !live) {
  console.error("Clé réelle détectée. Utilisez d'abord une clé de test (sk_test_...), ou ajoutez --live en connaissance de cause.");
  process.exit(1);
}

const stripe = new Stripe(key);
const lines = [];

for (const plan of PLANS) {
  const lookupKey = `evolutio_${plan.id}_mensuel`;
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  let price = existing.data[0];
  if (!price) {
    const product = await stripe.products.create({
      name: `${appName} ${plan.name}`,
      metadata: { plan: plan.id },
    });
    price = await stripe.prices.create({
      product: product.id,
      currency: "eur",
      unit_amount: plan.amount,
      recurring: { interval: "month" },
      lookup_key: lookupKey,
      tax_behavior: "exclusive", // prix affichés hors taxes
      metadata: { plan: plan.id },
    });
    console.log(`Créé   : ${plan.name} à ${plan.amount / 100} € HT par mois`);
  } else {
    console.log(`Existe : ${plan.name} (${price.id})`);
  }
  lines.push(`${plan.env}=${price.id}`);
}

if (siteUrl.startsWith("https://")) {
  const url = `${siteUrl}/api/stripe/webhook`;
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  if (endpoints.data.some((endpoint) => endpoint.url === url)) {
    console.log(`Existe : webhook ${url} (son secret reste visible dans Stripe > Développeurs > Webhooks)`);
  } else {
    const endpoint = await stripe.webhookEndpoints.create({ url, enabled_events: WEBHOOK_EVENTS });
    console.log(`Créé   : webhook ${url}`);
    lines.push(`STRIPE_WEBHOOK_SECRET=${endpoint.secret}`);
  }
} else {
  console.log(
    "Site en local : pas de webhook créé. Pour tester, lancez « stripe listen --forward-to localhost:3000/api/stripe/webhook » et copiez le secret affiché dans STRIPE_WEBHOOK_SECRET.",
  );
}

console.log("\nCopiez ces lignes dans .env.local (et dans les variables d'environnement de l'hébergeur) :\n");
console.log(lines.join("\n"));
console.log("\nDernière étape, dans Stripe : Paramètres > Facturation > Portail client > Enregistrer, pour activer la page de résiliation.");
