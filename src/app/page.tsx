import Link from "next/link";
import { HeroFeed } from "@/components/landing/hero-feed";
import { HeroReel } from "@/components/landing/hero-reel";
import { Lacquer } from "@/components/landing/lacquer";
import { LandingMotion } from "@/components/landing/motion";
import { Simulator } from "@/components/landing/simulator";
import { APP_NAME, PLAN_IDS, PLANS, TRIAL_DAYS } from "@/lib/config";

const TRADES = ["Boulangeries", "Restaurants", "Plombiers", "Instituts de beauté", "Agences immobilières", "Garages", "Fleuristes", "Coiffeurs", "Électriciens", "Caves à vin"];

const COMPARE = [
  { label: "Repère les nouveaux avis", gpt: "Non", evo: "Oui, avec alerte" },
  { label: "Publie sur votre fiche", gpt: "Copier-coller", evo: "Un clic, ou seul" },
  { label: "Garde votre ton", gpt: "À réexpliquer", evo: "Réglé une fois" },
  { label: "Vous apporte des avis", gpt: "Non", evo: "QR code, lien, e-mail" },
  { label: "Résume ce que disent vos clients", gpt: "Avis à coller un par un", evo: "Synthèse en un clic" },
];

const FAQ = [
  {
    q: "Triez-vous les clients pour n'envoyer que les satisfaits vers Google ?",
    a: "Non. Google interdit de ne solliciter que les clients contents ou de décourager les avis négatifs, et une fiche qui le fait risque le retrait de ses avis. Chaque client reçoit le même lien, avec la possibilité de vous écrire en privé.",
  },
  { q: "Puis-je relire avant publication ?", a: "Oui, c'est le réglage par défaut. La publication automatique est une option, réservée aux avis 4 et 5 étoiles." },
  {
    q: "Dois-je vous donner mon mot de passe Google ?",
    a: "Non. Vous autorisez Evolutio depuis l'écran de connexion officiel de Google, et vous pouvez retirer cet accès à tout moment depuis votre compte Google.",
  },
  { q: "Y a-t-il un engagement ?", a: `Aucun. L'essai dure ${TRIAL_DAYS} jours sans carte bancaire, puis l'abonnement est mensuel et se résilie en ligne.` },
];

/** Motif décoratif en forme de QR code (illustration, pas un vrai code). */
function qrCells(): boolean[] {
  const cells: boolean[] = [];
  for (let y = 0; y < 13; y++) {
    for (let x = 0; x < 13; x++) {
      const fx = x < 5 ? x : x - 8;
      const fy = y < 5 ? y : y - 8;
      const finder = (x < 5 || x > 7) && (y < 5 || y > 7) && !(x > 7 && y > 7);
      const separator = !finder && ((x === 5 && (y < 6 || y > 7)) || (y === 5 && (x < 6 || x > 7)) || (x === 7 && y < 6) || (y === 7 && x < 6));
      cells.push(finder ? fx === 0 || fx === 4 || fy === 0 || fy === 4 || (fx === 2 && fy === 2) : !separator && (x * 7 + y * 13 + x * y) % 5 < 2);
    }
  }
  return cells;
}

/** Logo d'Evolutio : un « e. », la réponse qui part. */
function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <rect x=".5" y=".5" width="31" height="31" rx="9.5" fill="#0d0d10" stroke="rgba(255,255,255,.12)" />
      <path d="M7.6 15.6H23.4A7.8 7.8 0 1 0 21.1 21.3" fill="none" stroke="#f3f0ea" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24.6" cy="24.4" r="1.9" fill="#a996f0" />
    </svg>
  );
}

const HEADLINE = ["Chaque", "avis", "mérite", "une"];

export default function LandingPage() {
  return (
    <div className="lp">
      <LandingMotion />

      <header className="lp-nav">
        <div className="wrap row">
          <Link href="/" className="logo" aria-label={`${APP_NAME}, accueil`}>
            <LogoMark />
          </Link>
          <nav className="links" aria-label="Navigation principale">
            <a href="#fonctions">Fonctions</a>
            <a href="#demo">Démonstration</a>
            <a href="#etapes">Mise en route</a>
            <a href="#tarifs">Tarifs</a>
            <a href="#questions">Questions</a>
          </nav>
          <Link href="/connexion">Connexion</Link>
          <Link href="/inscription" className="cta">
            Essai gratuit
          </Link>
        </div>
      </header>

      <main>
        <section className="hero sec-dark" aria-labelledby="titre">
          <Lacquer className="lacquer" />
          <div className="hero-veil" aria-hidden="true" />
          <div className="halo" aria-hidden="true" />
          <div className="wrap stack">
            <p className="eyebrow rise" style={{ animationDelay: "0s" }}>
              Réponses et collecte d&apos;avis Google
            </p>
            <h1 id="titre" className="h-xl">
              {HEADLINE.map((word, i) => (
                <span key={word}>
                  <span className="word" style={{ animationDelay: `${0.08 + i * 0.11}s` }}>
                    {word}
                  </span>{" "}
                </span>
              ))}
              <span className="word" style={{ animationDelay: "0.55s" }}>
                <span className="serif shine">réponse.</span>
              </span>
            </h1>
            <p className="lead rise" style={{ animationDelay: "0.8s", maxWidth: 640 }}>
              {APP_NAME} la rédige dans votre ton, vous alerte quand un client est déçu et vous aide à récolter de
              nouveaux avis. Dans les règles de Google.
            </p>
            <div className="cta-row rise" style={{ animationDelay: "0.95s" }}>
              <Link href="/inscription" className="btn btn-light btn-lg">
                Essayer {TRIAL_DAYS} jours gratuitement
              </Link>
              <a href="#demo" className="btn btn-ghost-dark btn-lg">
                Voir une réponse
              </a>
            </div>
            <p className="fine rise" style={{ animationDelay: "1.05s" }}>
              Sans carte bancaire. Sans engagement.
            </p>
          </div>
          <div className="rise" style={{ animationDelay: "1.1s" }}>
            <HeroReel />
          </div>
          <div className="stage rise" style={{ animationDelay: "1.3s" }}>
            <HeroFeed />
          </div>
        </section>

        <section aria-label="Pour quels métiers" style={{ paddingBlock: "clamp(48px, 6vw, 80px)" }}>
          <div className="marquee-mask">
            <div className="marquee" aria-hidden="true">
              {[...TRADES, ...TRADES].map((trade, i) => (
                <span key={`${trade}-${i}`}>
                  {trade}
                  <b>★</b>
                </span>
              ))}
            </div>
          </div>
          <p className="sr-only">Pour les {TRADES.join(", ").toLowerCase()}.</p>
        </section>

        <section aria-label="Pourquoi répondre" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <p className="manifesto">
              Un avis sans réponse, c&apos;est une conversation laissée en plan. Vos futurs clients lisent les avis, et
              vos réponses aussi. {APP_NAME} fait en sorte qu&apos;aucune ne reste en attente, sans que vous y passiez
              vos soirées.
            </p>
          </div>
        </section>

        <section id="fonctions" aria-labelledby="t-fonctions" style={{ paddingTop: 0, scrollMarginTop: 70 }}>
          <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 44 }}>
            <div data-rv style={{ maxWidth: 780, display: "flex", flexDirection: "column", gap: 14 }}>
              <p className="eyebrow">Fonctions</p>
              <h2 id="t-fonctions" className="h-lg">
                Tout pour plus d&apos;avis. <span className="serif gold-deep">Rien</span> qui mette votre fiche en danger.
              </h2>
            </div>
            <div className="tiles">
              <article className="tile wide" data-rv>
                <div className="tones" aria-hidden="true">
                  <span className="tone" style={{ animationDelay: "0s" }}>Chaleureux</span>
                  <span className="tone" style={{ animationDelay: "2s" }}>Professionnel</span>
                  <span className="tone" style={{ animationDelay: "4s" }}>Décontracté</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h3 className="h-md">Des réponses dans votre ton, pas dans celui d&apos;un robot.</h3>
                  <p style={{ maxWidth: "52ch" }}>
                    Chaque réponse reprend un détail de l&apos;avis, dans la langue du client, avec votre signature.
                    Aucune promesse que vous n&apos;avez pas faite.
                  </p>
                </div>
              </article>

              <article className="tile dark" data-rv style={{ "--d": "0.08s" } as React.CSSProperties}>
                <div style={{ position: "relative", height: 96 }} aria-hidden="true">
                  <svg className="bell" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#a996f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
                  </svg>
                  <span className="chip chip-warn toast" style={{ position: "absolute", left: 66, top: 12 }}>
                    Avis 2★ à traiter
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h3 className="h-md">Les avis négatifs d&apos;abord.</h3>
                  <p>Alerte immédiate, brouillon calme déjà prêt, invitation à poursuivre en privé.</p>
                </div>
              </article>

              <article className="tile goldy" data-rv>
                <div className="qr" aria-hidden="true">
                  <div className="cells">
                    {qrCells().map((on, i) => (
                      <i key={i} className={on ? "on" : undefined} />
                    ))}
                  </div>
                  <span className="scan" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h3 className="h-md">QR code et affiche prête à imprimer.</h3>
                  <p>À poser en caisse. Le client scanne et arrive sur votre page d&apos;avis.</p>
                </div>
              </article>

              <article className="tile" data-rv style={{ "--d": "0.08s" } as React.CSSProperties}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-hidden="true">
                  {[0, 0.5, 1].map((delay, i) => (
                    <div key={delay} className="mail">
                      <span style={{ flex: 1 }}>client-{i + 1}@exemple.fr</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a996f0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path pathLength={1} d="M5 12.5l4.5 4.5L19 7.5" style={{ animationDelay: `${delay}s` }} />
                      </svg>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h3 className="h-md">Demandes par e-mail.</h3>
                  <p>Une demande unique après la prestation. Jamais de relance, jamais de spam.</p>
                </div>
              </article>

              <article className="tile" data-rv style={{ "--d": "0.16s" } as React.CSSProperties}>
                <div aria-hidden="true" style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 96 }}>
                  {[38, 52, 46, 70, 64, 92].map((h, i) => (
                    <span key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "8px 8px 0 0", background: i === 5 ? "var(--gold)" : "rgba(255,255,255,.12)" }} />
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h3 className="h-md">Ce que disent vos clients, en clair.</h3>
                  <p>Note moyenne, taux de réponse, et une synthèse de vos forces et de vos irritants.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="demo" className="sec-dark" aria-labelledby="t-demo" style={{ scrollMarginTop: 52 }}>
          <div className="wrap" data-rv>
            <Simulator />
          </div>
        </section>

        <section id="etapes" aria-labelledby="t-etapes" style={{ scrollMarginTop: 52 }}>
          <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 56 }}>
            <div data-rv style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 14 }}>
              <p className="eyebrow">Mise en route</p>
              <h2 id="t-etapes" className="h-lg">
                Trois minutes de réglage. <span className="serif gold-deep">Puis plus rien</span> à surveiller.
              </h2>
            </div>
            <ol className="steps" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {[
                { t: "Connectez votre fiche Google", d: "Vous autorisez l'accès depuis l'écran officiel de Google. Aucun mot de passe à nous confier." },
                { t: "Réglez votre ton", d: "Votre métier, votre signature, le contact à proposer quand un client est déçu." },
                { t: "Validez en un clic", d: "Chaque réponse vous attend, prête. Sous 4 étoiles, rien ne part sans vous." },
              ].map((step, i) => (
                <li key={step.t} className="step" data-rv style={{ "--d": `${i * 0.1}s`, display: "flex", flexDirection: "column", gap: 14 } as React.CSSProperties}>
                  <span className="num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="h-md">{step.t}</h3>
                  <p className="lead" style={{ fontSize: "1.05rem" }}>
                    {step.d}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="t-compare" style={{ paddingTop: 0 }}>
          <div className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 40, alignItems: "center" }}>
            <div data-rv style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p className="eyebrow">Et ChatGPT, alors ?</p>
              <h2 id="t-compare" className="h-lg">
                Rédiger, tout le monde sait. <span className="serif gold-deep">Ne rien oublier</span>, c&apos;est autre chose.
              </h2>
            </div>
            <div className="cmp" role="table" aria-label="Comparaison avec ChatGPT" data-rv>
              <div className="cmp-row head" role="row">
                <span role="columnheader" />
                <span role="columnheader">ChatGPT</span>
                <span role="columnheader">{APP_NAME}</span>
              </div>
              {COMPARE.map((row) => (
                <div key={row.label} className="cmp-row" role="row">
                  <span role="rowheader">{row.label}</span>
                  <span role="cell" className="no">{row.gpt}</span>
                  <span role="cell" className="yes">{row.evo}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="tarifs" aria-labelledby="t-tarifs" style={{ paddingTop: 0, scrollMarginTop: 70 }}>
          <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 44 }}>
            <div data-rv style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
              <p className="eyebrow">Tarifs</p>
              <h2 id="t-tarifs" className="h-lg">
                Simple, mensuel, <span className="serif gold-deep">sans engagement.</span>
              </h2>
              <p className="lead">Prix hors taxes. {TRIAL_DAYS} jours d&apos;essai sur chaque formule.</p>
            </div>
            <div className="plans">
              {PLAN_IDS.map((id, i) => {
                const plan = PLANS[id];
                const hot = id === "pro";
                return (
                  <div key={id} className={hot ? "plan hot" : "plan"} data-rv style={{ "--d": `${i * 0.08}s` } as React.CSSProperties}>
                    <h3 className="h-md">{plan.name}</h3>
                    <p>
                      <span className="price">{plan.priceEur} €</span>
                      <span style={{ color: hot ? "#a8a398" : "var(--mute)" }}> HT / mois</span>
                    </p>
                    <ul>
                      {plan.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <Link href="/inscription" className={hot ? "btn btn-light" : "btn btn-primary"}>
                      Commencer l&apos;essai
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="questions" aria-labelledby="t-questions" style={{ paddingTop: 0, scrollMarginTop: 70 }}>
          <div className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 40 }}>
            <h2 id="t-questions" className="h-lg" data-rv>
              Questions <span className="serif gold-deep">fréquentes.</span>
            </h2>
            <div data-rv>
              {FAQ.map((item) => (
                <details key={item.q}>
                  <summary>
                    {item.q}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="sec-dark final" aria-labelledby="t-final" style={{ position: "relative", overflow: "hidden", textAlign: "center" }}>
          <div className="mesh" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="wrap" data-rv style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
            <h2 id="t-final" className="h-xl">
              Plus aucun avis <br />
              <span className="serif shine">sans réponse.</span>
            </h2>
            <p className="lead" style={{ maxWidth: 520 }}>
              Connectez votre fiche, réglez votre ton, et laissez {APP_NAME} s&apos;occuper du reste.
            </p>
            <Link href="/inscription" className="btn btn-light btn-lg">
              Essayer {TRIAL_DAYS} jours gratuitement
            </Link>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
          <span>
            © {new Date().getFullYear()} {APP_NAME}
          </span>
          <span>Service indépendant, sans lien avec Google.</span>
        </div>
      </footer>
    </div>
  );
}
