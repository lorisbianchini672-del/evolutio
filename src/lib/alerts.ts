import type { Account } from "./types";

// Alertes SMS et WhatsApp pour les avis négatifs, envoyées avec Twilio.
// Sans clés Twilio, rien n'est envoyé : l'alerte e-mail et la notification du téléphone restent actives.

export function smsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM);
}

export function whatsappConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

/** Met un numéro au format international (+33…). Renvoie null s'il n'est pas exploitable. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s.\-()]/g, "");
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  if (/^00\d{8,15}$/.test(digits)) return `+${digits.slice(2)}`;
  if (/^0[1-9]\d{8}$/.test(digits)) return `+33${digits.slice(1)}`;
  return null;
}

export function phoneAlertText(input: {
  locationTitle: string;
  rating: number;
  reviewer: string | null;
  comment: string | null;
  url: string;
  draft?: string;
}): string {
  const stars = "★".repeat(input.rating) + "☆".repeat(5 - input.rating);
  const quote = input.comment ? ` « ${input.comment.replace(/\s+/g, " ").trim().slice(0, 140)}${input.comment.length > 140 ? "…" : ""} »` : "";
  const head = `Evolutio : avis ${stars} pour ${input.locationTitle}${input.reviewer ? ` (${input.reviewer})` : ""}.${quote}`;
  if (input.draft) {
    const draft = input.draft.replace(/\s+/g, " ").trim();
    return `${head}\n\nRéponse proposée : « ${draft.slice(0, 320)}${draft.length > 320 ? "…" : ""} »\n\nRépondez OUI pour la publier, ou modifiez-la ici : ${input.url}`;
  }
  return `${head} Réponse prête : ${input.url}`;
}

/** Envoie l'alerte sur le canal choisi par le commerçant. Renvoie une erreur lisible plutôt que de lever. */
export async function sendPhoneAlert(
  account: Pick<Account, "alert_channel" | "alert_phone">,
  text: string,
): Promise<{ sent: boolean; error?: string }> {
  if (account.alert_channel === "none") return { sent: false, error: "Aucun canal choisi." };
  return sendPhoneMessage(account.alert_channel, account.alert_phone, text);
}

/** Envoie un SMS ou un message WhatsApp avec Twilio. */
export async function sendPhoneMessage(
  channel: "sms" | "whatsapp",
  phone: string,
  text: string,
): Promise<{ sent: boolean; error?: string }> {
  const to = normalizePhone(phone);
  if (!to) return { sent: false, error: "Numéro de téléphone invalide." };
  const whatsapp = channel === "whatsapp";
  if (whatsapp ? !whatsappConfigured() : !smsConfigured()) {
    return { sent: false, error: `${whatsapp ? "WhatsApp" : "SMS"} non configuré : ajoutez les clés Twilio dans l'installation.` };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID as string;
  const from = whatsapp ? `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}` : (process.env.TWILIO_SMS_FROM as string);
  const body = new URLSearchParams({ To: whatsapp ? `whatsapp:${to}` : to, From: from, Body: text.slice(0, 1500) });
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { message?: string } | null;
      return { sent: false, error: detail?.message ?? `Twilio a refusé l'envoi (${res.status}).` };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Envoi impossible." };
  }
}

/** Message de demande d'avis envoyé au client du commerçant. Le même pour tous les clients (règles Google). */
export function reviewRequestText(businessName: string, link: string): string {
  return `${businessName} vous remercie de votre visite. Votre avis, quel qu'il soit, nous aide beaucoup : ${link}`;
}
