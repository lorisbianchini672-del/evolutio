import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import { AppNav } from "@/components/app-nav";
import { LogoMark } from "@/components/logo-mark";
import { APP_NAME, billingEnabled } from "@/lib/config";
import { isLocalMode } from "@/lib/local-env";
import { requireAccount } from "@/lib/session";

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { account, subscription } = await requireAccount();
  const trialDays = subscription?.status === "trialing" ? daysLeft(subscription.trial_end) : null;

  return (
    <div className="appx">
      <div className="appx-glow" aria-hidden="true" />

      <header className="appx-bar">
        <div className="appx-bar-in">
          <Link href="/app" className="appx-logo" aria-label={`${APP_NAME}, avis`}>
            <LogoMark size={32} />
          </Link>
          <AppNav variant="title" />
          <AppNav variant="top" />
          <span className="appx-email">{account.email}</span>
          <form action={signOutAction}>
            <button className="appx-out" type="submit" aria-label="Se déconnecter">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 5.5h-7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h7" />
                <path d="M11 12h9M17 8.5l3.5 3.5-3.5 3.5" />
              </svg>
              <span>Déconnexion</span>
            </button>
          </form>
        </div>
      </header>

      <main className="appx-main">
        {!billingEnabled() && (
          <p className="notice-info">
            Mode découverte : Stripe n&apos;est pas encore connecté, tout est ouvert sans paiement.{" "}
            {isLocalMode() && (
              <Link href="/installation#stripe" className="link">
                Connecter Stripe
              </Link>
            )}
          </p>
        )}
        {trialDays !== null && (
          <p className="notice-info">
            Essai gratuit : {trialDays} jour{trialDays > 1 ? "s" : ""} restant
            {trialDays > 1 ? "s" : ""}.{" "}
            <Link href="/app/abonnement" className="link">
              Ajouter un moyen de paiement
            </Link>
          </p>
        )}
        {children}
      </main>

      <AppNav variant="bottom" />
    </div>
  );
}
