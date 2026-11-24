"use client";

import Link from "next/link";

// Page affichée quand une erreur inattendue survient (souvent : une variable d'environnement manquante).
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <p className="text-sm text-stone-600">
        {process.env.NODE_ENV === "development"
          ? error.message
          : "Réessayez dans un instant. Si le problème continue, contactez le support."}
      </p>
      <div className="flex justify-center gap-2">
        <button className="btn btn-primary" onClick={reset}>
          Réessayer
        </button>
        <Link href="/" className="btn btn-secondary">
          Accueil
        </Link>
      </div>
    </main>
  );
}
