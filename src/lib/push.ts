import webpush from "web-push";
import { siteUrl } from "./config";
import { createAdminClient } from "./supabase/admin";

// Notifications du téléphone (Web Push). Les clés VAPID sont générées une fois pour toutes
// en mode local ; en ligne, elles se règlent comme les autres variables d'environnement.

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function vapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY ?? "";
}

function subject(): string {
  if (process.env.VAPID_SUBJECT) return process.env.VAPID_SUBJECT;
  if (process.env.EMAIL_FROM) return `mailto:${process.env.EMAIL_FROM}`;
  const url = siteUrl();
  return url.startsWith("https://") ? url : "mailto:notifications@evolutio.invalid";
}

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  reviewId?: string;
  /** Affiche le bouton « Publier » dans la notification (Android, ordinateur). */
  quickPublish?: boolean;
};

type Row = { id: string; endpoint: string; p256dh: string; auth: string };

/** Envoie une notification sur tous les appareils de l'utilisateur. Les abonnements expirés sont supprimés. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0;
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .returns<Row[]>();
  if (!rows?.length) return 0;

  const options = {
    vapidDetails: {
      subject: subject(),
      publicKey: process.env.VAPID_PUBLIC_KEY as string,
      privateKey: process.env.VAPID_PRIVATE_KEY as string,
    },
    TTL: 60 * 60 * 24,
    urgency: "high" as const,
  };
  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, body, options);
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", row.id);
        } else {
          console.error("[push]", err instanceof Error ? err.message : err);
        }
      }
    }),
  );
  return sent;
}
