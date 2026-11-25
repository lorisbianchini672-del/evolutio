import { createAdminClient } from "./supabase/admin";
import type { Account } from "./types";

export type OnboardingStep = { id: string; label: string; hint: string; href: string; done: boolean };

/**
 * Les 5 gestes qui font qu'un commerçant garde l'outil. Renvoie null quand tout est fait
 * (ou que le guide a été masqué) : il disparaît alors de la boîte de réception.
 */
export async function onboardingSteps(account: Account): Promise<OnboardingStep[] | null> {
  if (account.onboarding_done) return null;
  const admin = createAdminClient();
  const [{ count: google }, { count: push }, { count: visits }, { count: published }] = await Promise.all([
    admin.from("google_connections").select("user_id", { count: "exact", head: true }).eq("user_id", account.id),
    admin.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", account.id),
    admin.from("collect_events").select("id", { count: "exact", head: true }).eq("user_id", account.id).eq("kind", "visit"),
    admin.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", account.id).eq("status", "published"),
  ]);
  const steps: OnboardingStep[] = [
    {
      id: "ton",
      label: "Votre ton et votre signature",
      hint: "2 minutes : nom, ton, signature, contact pour les clients déçus.",
      href: "/app/reglages",
      done: Boolean(account.business_name.trim() && (account.signature.trim() || account.private_contact.trim())),
    },
    {
      id: "google",
      label: "Connecter la fiche Google",
      hint: "Vos avis arrivent seuls, et vous publiez en un geste.",
      href: "/app",
      done: (google ?? 0) > 0,
    },
    {
      id: "notif",
      label: "Activer les notifications",
      hint: "Sur ce téléphone, pour être prévenu à chaque avis.",
      href: "/app/reglages",
      done: (push ?? 0) > 0,
    },
    {
      id: "qr",
      label: "Poser le QR code au comptoir",
      hint: "Imprimez l'affiche : vos clients laissent un avis en 10 secondes.",
      href: "/app/collecte",
      done: (visits ?? 0) > 0,
    },
    {
      id: "reponse",
      label: "Publier votre première réponse",
      hint: "Le mode rapide vous montre l'avis et la réponse prête.",
      href: "/app/rapide",
      done: (published ?? 0) > 0,
    },
  ];
  return steps.every((s) => s.done) ? null : steps;
}
