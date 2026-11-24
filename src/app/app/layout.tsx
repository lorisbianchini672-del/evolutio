import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import { APP_NAME, billingEnabled } from "@/lib/config";
import { isLocalMode } from "@/lib/local-env";
import { requireAccount } from "@/lib/session";

const NAV = [
  { href: "/app", label: "Avis" },
  { href: "/app/analyse", label: "Analyse" },
  { href: "/app/collecte", label: "Collecte" },
  { href: "/app/reglages", label: "Réglages" },
  { href: "/app/abonnement", label: "Abonnement" },
];

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { account, subscription } = await requireAccount();
  const trialDays = subscription?.status === "trialing" ? daysLeft(subscription.trial_end) : null;

  return (
    <>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/app" className="brand">
            {APP_NAME}
          </Link>
          <nav className="flex flex-1 gap-1 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-full px-3.5 py-1.5 text-stone-700 hover:bg-stone-100">
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="hidden text-sm text-stone-500 sm:inline">{account.email}</span>
          <form action={signOutAction}>
            <button className="btn btn-quiet" type="submit">
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
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
            Essai gratuit : {trialDays} jour{trialDays > 1 ? "s" : ""} restant{trialDays > 1 ? "s" : ""}.{" "}
            <Link href="/app/abonnement" className="font-medium underline">
              Ajouter un moyen de paiement
            </Link>
          </p>
        )}
        {children}
      </main>
    </>
  );
}
