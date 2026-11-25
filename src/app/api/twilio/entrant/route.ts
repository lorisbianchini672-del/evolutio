import { NextResponse, type NextRequest } from "next/server";
import { normalizePhone } from "@/lib/alerts";
import { billingEnabled, siteUrl } from "@/lib/config";
import { hasAccess } from "@/lib/entitlement";
import { publishDraft } from "@/lib/reviews";
import { createAdminClient } from "@/lib/supabase/admin";
import { validTwilioSignature } from "@/lib/twilio-signature";

// Réponse du commerçant à une alerte SMS ou WhatsApp. « OUI » publie la réponse proposée
// pour le dernier avis signalé. À déclarer dans Twilio comme adresse des messages entrants.

function twiml(message: string) {
  const safe = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return new NextResponse("Twilio non configuré", { status: 404 });

  const form = await request.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") params[key] = value;
  });
  const url = `${siteUrl()}/api/twilio/entrant`;
  if (!validTwilioSignature(token, url, params, request.headers.get("x-twilio-signature") ?? "")) {
    return new NextResponse("Signature invalide", { status: 403 });
  }

  const from = normalizePhone((params.From ?? "").replace(/^whatsapp:/i, ""));
  const body = (params.Body ?? "").trim();
  if (!from) return twiml("Numéro non reconnu.");

  const admin = createAdminClient();
  const { data: accounts } = await admin
    .from("accounts")
    .select("id, alert_phone, last_alert_review_id")
    .neq("alert_channel", "none");
  const account = (accounts ?? []).find((a) => normalizePhone(a.alert_phone as string) === from) as
    | { id: string; last_alert_review_id: string | null }
    | undefined;
  if (!account) return twiml("Ce numéro n'est relié à aucun compte Evolutio.");

  if (!/^(oui|ok|yes|si|1|publier|valider)\b/i.test(body)) {
    return twiml(`Répondez OUI pour publier la réponse proposée, ou modifiez-la ici : ${siteUrl()}/app/rapide`);
  }
  if (!account.last_alert_review_id) return twiml("Aucun avis en attente de validation.");

  const { data: subscription } = await admin.from("subscriptions").select("status").eq("user_id", account.id).maybeSingle();
  if (!hasAccess(subscription?.status as string | undefined, billingEnabled())) {
    return twiml("Votre abonnement Evolutio n'est pas actif.");
  }

  try {
    const result = await publishDraft(account.id, account.last_alert_review_id);
    if (!result.ok) return twiml(`${result.reason} Ouvrez l'avis : ${siteUrl()}/app/rapide?avis=${account.last_alert_review_id}`);
    await admin.from("accounts").update({ last_alert_review_id: null }).eq("id", account.id);
    return twiml("C'est publié ✓ Votre réponse est en ligne sur Google.");
  } catch (err) {
    console.error("[twilio]", err instanceof Error ? err.message : err);
    return twiml(`Publication impossible pour le moment. Ouvrez l'avis : ${siteUrl()}/app/rapide`);
  }
}
