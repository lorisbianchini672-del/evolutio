import { Resend } from "resend";
import { APP_NAME, siteUrl } from "./config";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Mail = { to: string; subject: string; html: string; replyTo?: string; fromName?: string };

/** Envoie un e-mail. Sans clé Resend, l'envoi est ignoré et signalé dans les journaux. */
export async function sendEmail(mail: Mail): Promise<{ sent: boolean; error?: string }> {
  if (!emailConfigured()) {
    console.warn(`[email] Resend non configuré, e-mail non envoyé : ${mail.subject}`);
    return { sent: false, error: "Envoi d'e-mails non configuré (RESEND_API_KEY, EMAIL_FROM)." };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const address = process.env.EMAIL_FROM as string;
  const from = mail.fromName ? `${mail.fromName.replace(/[<>"]/g, "")} <${address}>` : address;
  const { error } = await resend.emails.send({
    from,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    replyTo: mail.replyTo,
  });
  return error ? { sent: false, error: error.message } : { sent: true };
}

function layout(body: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1c1917;max-width:520px">${body}</div>`;
}

function button(href: string, label: string): string {
  return `<p><a href="${href}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none">${label}</a></p>`;
}

/** Alerte envoyée au commerçant quand un avis attend sa validation. */
export function newReviewAlert(input: { locationTitle: string; rating: number; reviewer: string | null; comment: string | null }) {
  const stars = "★".repeat(input.rating) + "☆".repeat(5 - input.rating);
  const urgent = input.rating <= 3;
  return {
    subject: `${urgent ? "Avis à traiter" : "Nouvel avis"} ${input.rating}/5 pour ${input.locationTitle}`,
    html: layout(
      `<p><strong>${escapeHtml(input.locationTitle)}</strong> a reçu un avis ${stars}${
        input.reviewer ? ` de ${escapeHtml(input.reviewer)}` : ""
      }.</p>` +
        (input.comment ? `<blockquote style="margin:12px 0;padding-left:12px;border-left:3px solid #d6d3d1">${escapeHtml(input.comment)}</blockquote>` : "") +
        `<p>Un brouillon de réponse vous attend.</p>` +
        button(`${siteUrl()}/app`, "Relire et publier") +
        `<p style="color:#78716c;font-size:13px">${escapeHtml(APP_NAME)}</p>`,
    ),
  };
}

/**
 * Demande d'avis envoyée à un client du commerçant.
 * Le même lien part vers tous les clients : aucun tri selon la satisfaction (règles Google).
 */
export function reviewRequestEmail(input: { businessName: string; link: string }) {
  const name = escapeHtml(input.businessName);
  return {
    subject: `Votre avis sur ${input.businessName}`,
    html: layout(
      `<p>Bonjour,</p><p>Merci d'avoir fait appel à ${name}. Votre avis, quel qu'il soit, nous aide à nous améliorer et aide d'autres clients à choisir.</p>` +
        button(input.link, "Donner mon avis") +
        `<p style="color:#78716c;font-size:13px">Vous recevez ce message unique parce que vous avez été client de ${name}. Aucun autre message ne suivra. Pour toute demande concernant vos données, répondez simplement à cet e-mail.</p>`,
    ),
  };
}
