"use client";

import { useState } from "react";

/** Copie un texte dans le presse-papiers et le confirme sur le bouton. */
export function CopyButton({ text, label = "Copier", className = "btn btn-secondary" }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("done");
        } catch {
          setState("failed");
        }
        setTimeout(() => setState("idle"), 2500);
      }}
    >
      {state === "done" ? "Copié" : state === "failed" ? "Copie refusée : sélectionnez le texte" : label}
    </button>
  );
}

export function PrintButton({ label = "Imprimer", className = "btn btn-primary" }: { label?: string; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      {label}
    </button>
  );
}
