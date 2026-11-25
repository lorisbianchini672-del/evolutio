"use client";

import { useEffect, useRef, useState } from "react";

const SECTOR_CHOICES = [
  ["commerce", "Commerce"],
  ["restaurant", "Restaurant"],
  ["boulangerie", "Boulangerie"],
  ["coiffure", "Coiffure"],
  ["garage", "Garage, location"],
  ["artisan", "Artisan"],
  ["beaute", "Institut de beauté"],
  ["immobilier", "Immobilier"],
] as const;

/** Démo en direct : le visiteur colle un vrai avis, l'IA propose la réponse, mot à mot. */
export function LiveDemo({ defaultSector = "commerce" }: { defaultSector?: string }) {
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(2);
  const [sector, setSector] = useState(defaultSector);
  const [reply, setReply] = useState("");
  const [shown, setShown] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const out = useRef<HTMLDivElement>(null);

  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearInterval(timer.current);
    },
    [],
  );

  function reveal(text: string) {
    if (timer.current) window.clearInterval(timer.current);
    setReply(text);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text);
      return;
    }
    let i = 0;
    setShown("");
    timer.current = window.setInterval(() => {
      i = Math.min(text.length, i + 3);
      setShown(text.slice(0, i));
      if (i >= text.length && timer.current) window.clearInterval(timer.current);
    }, 16);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("busy");
    setError("");
    setReply("");
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review, rating, sector }),
      });
      const data = (await res.json()) as { reply?: string; ai?: boolean; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error ?? "Réessayez dans un instant.");
      setNote(data.ai ? "Rédigée à l'instant par l'IA d'Evolutio." : "Réponse type : l'IA n'est pas encore branchée sur ce serveur.");
      reveal(data.reply);
      setState("done");
      window.setTimeout(() => out.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Réessayez dans un instant.");
      setState("idle");
    }
  }

  return (
    <div className="live">
      <div className="live-head">
        <p className="eyebrow">En direct</p>
        <h3 className="h-md">
          Collez un <span className="serif gold">vrai avis</span>. Voyez la réponse.
        </h3>
        <p className="live-sub">Un avis de votre fiche Google, ou d&apos;un concurrent. Rien n&apos;est enregistré.</p>
      </div>
      <form className="live-form" onSubmit={submit}>
        <textarea
          className="live-input"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          maxLength={800}
          rows={4}
          required
          placeholder="Exemple : Accueil sympathique, mais 30 minutes d'attente et personne pour s'excuser…"
          aria-label="Texte de l'avis"
        />
        <div className="live-row">
          <div className="live-stars" role="radiogroup" aria-label="Note de l'avis">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                className={n <= rating ? "on" : ""}
                onClick={() => setRating(n)}
              >
                ★
              </button>
            ))}
          </div>
          <select className="live-select" value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Votre métier">
            {SECTOR_CHOICES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-light live-go" disabled={state === "busy" || review.trim().length < 3}>
            {state === "busy" ? "Rédaction…" : "Voir la réponse"}
          </button>
        </div>
        {error && (
          <p className="live-error" role="alert">
            {error}
          </p>
        )}
      </form>
      <div ref={out} className={`live-out${reply ? " is-on" : ""}`} aria-live="polite">
        {reply && (
          <>
            <p className="live-k">Réponse proposée</p>
            <p className="live-reply">
              {shown}
              {shown.length < reply.length && <span className="caret" />}
            </p>
            <p className="live-note">{note}</p>
          </>
        )}
      </div>
    </div>
  );
}
