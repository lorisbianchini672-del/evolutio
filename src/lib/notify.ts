import { phoneAlertText, sendPhoneAlert } from "./alerts";
import { siteUrl } from "./config";
import { newReviewAlert, sendEmail } from "./email";
import { sendPushToUser } from "./push";
import { createAdminClient } from "./supabase/admin";
import type { Account } from "./types";

type NewReview = {
  id: string;
  rating: number;
  reviewer_name: string | null;
  comment: string | null;
  draft?: string;
  /** La relecture automatique n'a rien trouvé : la réponse peut être publiée sans ouvrir l'app. */
  draftSafe?: boolean;
};

/**
 * Prévient le commerçant qu'un avis attend sa validation, sur tous les canaux qu'il a choisis :
 * notification du téléphone (toujours, si un appareil est abonné), e-mail, et SMS ou WhatsApp
 * pour les avis de 1 à 3 étoiles. Un canal en panne n'empêche pas les autres.
 */
export async function notifyNewReview(account: Account, locationTitle: string, review: NewReview): Promise<void> {
  const url = `${siteUrl()}/app/rapide?avis=${review.id}`;
  const low = review.rating <= 3;
  const snippet = (review.comment ?? "Note sans commentaire.").replace(/\s+/g, " ").trim();

  const tasks: Promise<unknown>[] = [
    sendPushToUser(account.id, {
      title: `${low ? "À traiter · " : ""}Avis ${review.rating}★ · ${locationTitle}`,
      body: `${review.reviewer_name ? `${review.reviewer_name} : ` : ""}${snippet.slice(0, 120)}\nRéponse prête, publiez en un geste.`,
      url: `/app/rapide?avis=${review.id}`,
      tag: `avis-${review.id}`,
      reviewId: review.id,
      quickPublish: Boolean(review.draft && review.draftSafe),
    }),
  ];
  if (account.alert_email) {
    const mail = newReviewAlert({ locationTitle, rating: review.rating, reviewer: review.reviewer_name, comment: review.comment });
    tasks.push(sendEmail({ to: account.email, ...mail }));
  }
  if (low && account.alert_channel !== "none") {
    tasks.push(
      sendPhoneAlert(
        account,
        phoneAlertText({
          locationTitle,
          rating: review.rating,
          reviewer: review.reviewer_name,
          comment: review.comment,
          url,
          draft: review.draft && review.draftSafe ? review.draft : undefined,
        }),
      ).then(async (r) => {
        if (!r.sent) {
          console.warn("[alerte téléphone]", r.error);
          return;
        }
        // Sert à la réponse « OUI » par SMS/WhatsApp : c'est cet avis-là qui sera publié.
        await createAdminClient().from("accounts").update({ last_alert_review_id: review.id }).eq("id", account.id);
      }),
    );
  }
  const results = await Promise.allSettled(tasks);
  for (const r of results) if (r.status === "rejected") console.error("[notification]", r.reason);
}
