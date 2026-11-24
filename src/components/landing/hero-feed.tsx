"use client";

import { useEffect, useState } from "react";

// Démonstration animée du héros : un avis arrive, les étoiles s'allument, la réponse s'écrit.
// Les avis et les établissements sont des exemples.
const FEED = [
  {
    name: "Camille R.",
    place: "Boulangerie des Halles",
    rating: 5,
    review: "Accueil adorable et pain encore tiède à 7 h. C'est devenu mon arrêt du matin.",
    reply:
      "Bonjour Camille, merci pour ce joli message ! Le pain tiède dès l'ouverture, c'est notre petite fierté. À demain matin peut-être ?\nL'équipe des Halles",
  },
  {
    name: "Thomas B.",
    place: "Garage du Parc",
    rating: 2,
    review: "Quarante minutes d'attente alors que j'avais rendez-vous, et personne pour s'excuser.",
    reply:
      "Bonjour Thomas, merci d'avoir pris le temps de nous écrire. Attendre quarante minutes malgré un rendez-vous, ce n'est pas ce que nous voulons pour vous. Pouvons-nous en parler ? Écrivez-nous à contact@garageduparc.fr.\nLe Garage du Parc",
  },
  {
    name: "Inès M.",
    place: "Atelier Sève",
    rating: 4,
    review: "Très beau travail sur ma coupe, équipe aux petits soins. Un peu d'attente à l'arrivée.",
    reply:
      "Bonjour Inès, merci beaucoup ! Ravie que la coupe vous plaise. Nous prenons note pour l'attente à l'arrivée, et serons heureuses de vous revoir.\nL'Atelier Sève",
  },
];

const TICK = 40;
const TYPE_START = 1300;
const PER_CHAR = 22;
const HOLD = 3200;

export function HeroFeed() {
  const [{ index, time }, setState] = useState({ index: 0, time: 0 });
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Lecture de la préférence du système au montage : pas d'animation, tout le texte d'un coup.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStill(true);
      return;
    }
    const timer = setInterval(() => {
      setState((s) => {
        const total = TYPE_START + FEED[s.index].reply.length * PER_CHAR + HOLD;
        return s.time + TICK > total ? { index: (s.index + 1) % FEED.length, time: 0 } : { index: s.index, time: s.time + TICK };
      });
    }, TICK);
    return () => clearInterval(timer);
  }, []);

  const item = FEED[index];
  const t = still ? Number.MAX_SAFE_INTEGER : time;
  const lit = Math.max(0, Math.min(item.rating, Math.floor((t - 200) / 150)));
  const typed = Math.max(0, Math.min(item.reply.length, Math.floor((t - TYPE_START) / PER_CHAR)));
  const done = typed >= item.reply.length;
  const low = item.rating <= 3;

  return (
    <div className="window" role="img" aria-label="Aperçu animé : un avis Google arrive et Evolutio rédige la réponse">
      <div className="window-bar">
        <i />
        <i />
        <i />
        <span style={{ marginLeft: 10 }}>Avis · {item.place}</span>
        <div className="dots">
          {FEED.map((f, k) => (
            <span key={f.name} className={k === index ? "on" : undefined} />
          ))}
        </div>
      </div>
      <div className="window-grid">
        <div className="pane">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="avatar">{item.name.charAt(0)}</span>
            <div>
              <div style={{ fontWeight: 600 }}>{item.name}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--mute)" }}>Nouvel avis Google · à l&apos;instant</div>
            </div>
          </div>
          <div aria-hidden="true">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={n <= lit ? (low ? "st on low" : "st on") : "st"}>
                ★
              </span>
            ))}
          </div>
          <p style={{ fontSize: "1.08rem", lineHeight: 1.5 }}>{item.review}</p>
          {low && t > 1000 && <span className="chip chip-warn pop">Alerte envoyée au gérant</span>}
        </div>
        <div className="pane">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "0.78rem", color: "var(--mute)" }}>
            <span style={{ fontWeight: 600, color: "var(--gold-deep)" }}>Réponse proposée</span>
            <span>Ton chaleureux</span>
          </div>
          <p style={{ whiteSpace: "pre-line", lineHeight: 1.55, flex: 1 }}>
            {item.reply.slice(0, typed)}
            {t > TYPE_START && !done && <span className="caret" />}
          </p>
          <div style={{ minHeight: 30, display: "flex", justifyContent: "flex-end" }}>
            {done && (
              <span className={`chip pop ${low ? "chip-warn" : "chip-ok"}`}>
                {low ? "En attente de votre validation" : "Publiée automatiquement"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
