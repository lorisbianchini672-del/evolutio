"use client";

import { useState } from "react";

// Calculateur : ce que coûtent les avis sans réponse, avec des hypothèses affichées et modifiables.

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

export function Calculator() {
  const [perMonth, setPerMonth] = useState(12);
  const [unanswered, setUnanswered] = useState(60);
  const [minutes, setMinutes] = useState(5);

  const silentPerYear = Math.round(perMonth * 12 * (unanswered / 100));
  const hoursPerYear = (perMonth * 12 * minutes) / 60;
  const lowPerYear = Math.round(perMonth * 12 * 0.15);

  return (
    <div className="calc">
      <div className="calc-in">
        <label className="calc-field">
          <span>
            Avis reçus par mois <strong>{perMonth}</strong>
          </span>
          <input type="range" min={1} max={80} value={perMonth} onChange={(e) => setPerMonth(Number(e.target.value))} />
        </label>
        <label className="calc-field">
          <span>
            Part restée sans réponse aujourd&apos;hui <strong>{unanswered} %</strong>
          </span>
          <input type="range" min={0} max={100} step={5} value={unanswered} onChange={(e) => setUnanswered(Number(e.target.value))} />
        </label>
        <label className="calc-field">
          <span>
            Minutes pour rédiger une réponse à la main <strong>{minutes} min</strong>
          </span>
          <input type="range" min={1} max={15} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
        </label>
      </div>
      <div className="calc-out">
        <div>
          <p className="calc-n">{fmt(silentPerYear)}</p>
          <p className="calc-l">avis laissés sans réponse en un an, lus par chacun de vos futurs clients</p>
        </div>
        <div>
          <p className="calc-n">{hoursPerYear < 10 ? hoursPerYear.toFixed(1).replace(".", ",") : fmt(hoursPerYear)} h</p>
          <p className="calc-l">de rédaction par an, ramenées à une relecture de quelques secondes</p>
        </div>
        <div>
          <p className="calc-n">≈ {fmt(lowPerYear)}</p>
          <p className="calc-l">avis de 1 à 3 étoiles par an qui méritent une réponse soignée, et vite</p>
        </div>
        <p className="calc-hyp">Hypothèse affichée : environ 15 % d&apos;avis de 1 à 3 étoiles. Ajustez les curseurs avec vos chiffres.</p>
      </div>
    </div>
  );
}
