import { Resend } from "resend";
import { APP_NAME, siteUrl } from "./config";
import { formatRating, ratingDelta, type MonthlyReport } from "./report";

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
  return `<p><a href="${href}" style="display:inline-block;background:#15130f;color:#f3f0ea;padding:12px 20px;border-radius:999px;text-decoration:none">${label}</a></p>`;
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

/** Rapport mensuel envoyé au commerçant le 1er du mois. */
export function monthlyReportEmail(report: MonthlyReport, businessName: string) {
  const name = escapeHtml(businessName.trim() || "votre établissement");
  const delta = ratingDelta(report.average, report.previousAverage);
  const cell = (value: string, label: string) =>
    `<td style="padding:14px 12px;background:#f5f4f1;border-radius:12px;width:50%"><div style="font-size:26px;font-weight:700;color:#15130f">${value}</div><div style="font-size:13px;color:#6f6a60">${label}</div></td>`;
  const forces = report.insights?.forces.slice(0, 2).map((f) => `<li><strong>${escapeHtml(f.theme)}</strong> : ${escapeHtml(f.detail)}</li>`).join("") ?? "";
  const irritant = report.insights?.irritants[0];
  const since = report.sinceJoin;
  return {
    subject: `Votre mois de ${report.label} : ${report.received} avis, note ${formatRating(report.average)}`,
    html: layout(
      `<p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#b9783a">Rapport de ${escapeHtml(report.label)}</p>` +
        `<h1 style="font-size:24px;margin:4px 0 16px">${name}</h1>` +
        `<table role="presentation" cellspacing="8" style="width:100%;border-collapse:separate"><tr>` +
        cell(String(report.received), "avis reçus") +
        cell(`${formatRating(report.average)}${delta && delta !== "stable" ? ` <span style="font-size:14px;color:${delta.startsWith("+") ? "#1f7a4d" : "#b8574a"}">${delta}</span>` : ""}`, "note du mois") +
        `</tr><tr>` +
        cell(report.responseRate === null ? "–" : `${report.responseRate} %`, "avis répondus") +
        cell(String(report.googleClicks), "clients envoyés vers Google") +
        `</tr></table>` +
        (since.reviews
          ? `<p>Depuis votre arrivée sur ${escapeHtml(APP_NAME)} : <strong>${since.reviews} nouveaux avis</strong>${
              since.averageBefore === null
                ? ""
                : formatRating(since.averageBefore) === formatRating(since.averageNow)
                  ? `, note stable à ${formatRating(since.averageNow)}`
                  : `, note passée de ${formatRating(since.averageBefore)} à ${formatRating(since.averageNow)}`
            }.</p>`
          : "") +
        (forces ? `<p style="margin-bottom:4px"><strong>Ce que vos clients aiment</strong></p><ul style="margin-top:0">${forces}</ul>` : "") +
        (irritant ? `<p><strong>À surveiller</strong> : ${escapeHtml(irritant.theme)}. ${escapeHtml(irritant.detail)}</p>` : "") +
        (report.insights?.action ? `<p style="padding:12px 14px;border-left:3px solid #e3a964;background:#fbf4e2"><strong>L'action du mois</strong> : ${escapeHtml(report.insights.action)}</p>` : "") +
        button(`${siteUrl()}/app/analyse`, "Voir le détail") +
        `<p style="color:#78716c;font-size:13px">${escapeHtml(APP_NAME)} · Ce rapport se désactive dans Réglages.</p>`,
    ),
  };
}
