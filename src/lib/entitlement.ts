// Règles d'accès selon l'état de l'abonnement Stripe. Fonctions pures, testées dans tests/.

const ACTIVE_STATUSES = new Set(["trialing", "active"]);

export function hasAccess(status: string | null | undefined, billingOn: boolean): boolean {
  if (!billingOn) return true; // mode découverte : Stripe pas encore branché
  return ACTIVE_STATUSES.has(status ?? "");
}

export function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case "trialing":
      return "Essai gratuit en cours";
    case "active":
      return "Abonnement actif";
    case "past_due":
      return "Paiement en échec";
    case "canceled":
      return "Abonnement résilié";
    case "unpaid":
      return "Impayé";
    case "paused":
      return "Abonnement en pause";
    default:
      return "Aucun abonnement";
  }
}
