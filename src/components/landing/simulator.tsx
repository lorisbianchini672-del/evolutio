"use client";

import { useState } from "react";

// Simulateur : on choisit une note, on voit l'avis, la réponse proposée et ce qu'Evolutio en fait.
// Exemple pour une boulangerie fictive.
const CASES: Record<number, { name: string; review: string; reply: string; title: string; text: string; warn: boolean }> = {
  5: {
    name: "Léa",
    review: "Le meilleur croissant du quartier, et toujours un sourire.",
    reply: "Bonjour Léa, quel beau compliment, merci ! Nous transmettons le sourire à toute l'équipe. À très vite pour le prochain croissant.\nL'équipe des Halles",
    title: "Peut partir seule",
    text: "Si vous activez la publication automatique, cette réponse est publiée sans attendre.",
    warn: false,
  },
  4: {
    name: "Hugo",
    review: "Très bon pain, mais un peu d'attente le samedi matin.",
    reply: "Bonjour Hugo, merci pour votre retour ! Le samedi matin est notre moment le plus chargé, nous travaillons à fluidifier la file. À bientôt.\nL'équipe des Halles",
    title: "Un clic, ou automatique",
    text: "Vous validez en un clic, ou vous laissez partir seules les réponses 4 et 5 étoiles.",
    warn: false,
  },
  3: {
    name: "Nadia",
    review: "Correct, sans plus. Le pain au chocolat était sec ce jour-là.",
    reply: "Bonjour Nadia, merci pour votre franchise. Un pain au chocolat sec, ce n'est pas notre standard. Venez nous en parler, ou écrivez-nous à contact@boulangerie-halles.fr.\nL'équipe des Halles",
    title: "Validation obligatoire",
    text: "Sous 4 étoiles, rien ne part sans vous. Vous recevez une alerte par e-mail.",
    warn: true,
  },
  2: {
    name: "Marc",
    review: "Commande oubliée pour l'anniversaire de ma fille. Très déçu.",
    reply: "Bonjour Marc, merci de nous l'avoir signalé, et nous sommes désolés pour ce moment gâché. Nous aimerions comprendre ce qui s'est passé : écrivez-nous à contact@boulangerie-halles.fr.\nL'équipe des Halles",
    title: "Alerte immédiate",
    text: "Brouillon prêt, alerte e-mail envoyée. Vous relisez avant toute publication.",
    warn: true,
  },
  1: {
    name: "Anonyme",
    review: "Nul.",
    reply: "Bonjour, merci d'avoir pris le temps de nous laisser un avis. Nous regrettons que votre visite vous ait déçu et aimerions en savoir plus : contact@boulangerie-halles.fr.\nL'équipe des Halles",
    title: "Alerte immédiate",
    text: "Même un avis sans détail reçoit une réponse sobre, sans se justifier en public.",
    warn: true,
  },
};

export function Simulator() {
  const [rating, setRating] = useState(2);
  const item = CASES[rating];
  return (
    <div className="sim">
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <p className="eyebrow">Essayez</p>
        <h2 id="t-demo" className="h-lg">
          Quelle note a laissé <span className="serif gold">votre client</span> ?
        </h2>
        <div className="rates" role="group" aria-label="Choisir la note de l'avis">
          {[5, 4, 3, 2, 1].map((n) => (
            <button
              key={n}
              type="button"
              className={n === rating ? "rate sel" : "rate"}
              aria-pressed={n === rating}
              aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
            >
              {n}★
            </button>
          ))}
        </div>
        <div key={`route-${rating}`} className={`route swap ${item.warn ? "warn" : "good"}`} role="status">
          <strong>{item.title}</strong>
          <span>{item.text}</span>
        </div>
      </div>
      <div key={`case-${rating}`} className="swap" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="bubble">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <strong>{item.name}</strong>
            <span aria-label={`${rating} sur 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= rating ? (rating <= 3 ? "st on low" : "st on") : "st"} style={{ fontSize: "1rem", color: n <= rating ? undefined : "rgba(255,255,255,.18)" }}>
                  ★
                </span>
              ))}
            </span>
          </div>
          <p style={{ lineHeight: 1.5, color: "#e6e2d8" }}>{item.review}</p>
        </div>
        <div className="bubble reply">
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--gold-deep)" }}>Réponse proposée par Evolutio</span>
          {item.reply}
        </div>
      </div>
    </div>
  );
}
