"use client";

import { useState } from "react";

/** Partage un lien avec la feuille de partage du téléphone (WhatsApp, SMS…), ou le copie. */
export function ShareLink({ url, text, label = "Partager mon lien" }: { url: string; text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={async () => {
        try {
          if (navigator.share) {
            await navigator.share({ title: "Evolutio", text, url });
            return;
          }
          await navigator.clipboard.writeText(`${text} ${url}`);
          setDone(true);
          window.setTimeout(() => setDone(false), 2500);
        } catch {
          // partage annulé par l'utilisateur
        }
      }}
    >
      {done ? "Lien copié" : label}
    </button>
  );
}
