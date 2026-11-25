import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lacquer } from "@/components/landing/lacquer";
import { LiveDemo } from "@/components/landing/live-demo";
import { LandingMotion } from "@/components/landing/motion";
import { LogoMark } from "@/components/logo-mark";
import { APP_NAME, TRIAL_DAYS } from "@/lib/config";
import { tradeBySlug, TRADES } from "@/lib/trades";

export function generateStaticParams() {
  return TRADES.map((t) => ({ metier: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ metier: string }> }): Promise<Metadata> {
  const trade = tradeBySlug((await params).metier);
  if (!trade) return {};
  return {
    title: `${APP_NAME} pour les ${trade.plural} · Réponses aux avis Google`,
    description: trade.lead,
  };
}

export default async function TradePage({ params }: { params: Promise<{ metier: string }> }) {
  const trade = tradeBySlug((await params).metier);
  if (!trade) notFound();

  return (
    <div className="lp">
      <LandingMotion />
      <header className="lp-nav">
        <div className="wrap row">
          <Link href="/" className="logo" aria-label={`${APP_NAME}, accueil`}>
            <LogoMark />
          </Link>
          <nav className="links" aria-label="Navigation">
            <a href="#exemples">Exemples</a>
            <a href="#essai">Essayer</a>
            <Link href="/#tarifs">Tarifs</Link>
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
          <div className="wrap stack">
            <p className="eyebrow rise">{APP_NAME} pour les {trade.plural}</p>
            <h1 id="titre" className="h-xl rise" style={{ animationDelay: ".15s" }}>
              {trade.headline[0]}
              <br />
              <span className="serif shine">{trade.headline[1]}</span>
            </h1>
            <p className="lead rise" style={{ animationDelay: ".3s", maxWidth: 620 }}>
              {trade.lead}
            </p>
            <div className="cta-row rise" style={{ animationDelay: ".45s" }}>
              <Link href="/inscription" className="btn btn-light btn-lg">
                Essayer {TRIAL_DAYS} jours gratuitement
              </Link>
              <a href="#essai" className="btn btn-ghost-dark btn-lg">
                Tester sur un vrai avis
              </a>
            </div>
          </div>
        </section>

        <section aria-labelledby="t-pains">
          <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            <h2 id="t-pains" className="h-lg" data-rv>
              Les avis de votre métier, <span className="serif gold-deep">traités comme il faut.</span>
            </h2>
            <div className="pains">
              {trade.pains.map((p, i) => (
                <div key={p.title} className="pain" data-rv style={{ "--d": `${i * 0.08}s` } as React.CSSProperties}>
                  <h3 className="h-md">{p.title}</h3>
                  <p>{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="exemples" className="sec-dark" aria-labelledby="t-ex" style={{ scrollMarginTop: 52 }}>
          <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            <div data-rv style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p className="eyebrow">Exemples</p>
              <h2 id="t-ex" className="h-lg">
                Trois avis, <span className="serif gold">trois réponses.</span>
              </h2>
              <p className="lead">Des exemples rédigés pour illustrer le ton d&apos;Evolutio dans votre métier.</p>
            </div>
            <div className="examples">
              {trade.examples.map((ex, i) => (
                <article key={ex.name} className="example" data-rv style={{ "--d": `${i * 0.08}s` } as React.CSSProperties}>
                  <header>
                    <strong>{ex.name}</strong>
                    <span className={ex.rating <= 3 ? "ex-stars low" : "ex-stars"} aria-label={`${ex.rating} sur 5`}>
                      {"★".repeat(ex.rating)}
                      <i>{"★".repeat(5 - ex.rating)}</i>
                    </span>
                  </header>
                  <p className="ex-review">« {ex.review} »</p>
                  <div className="ex-reply">
                    <p className="ex-k">Réponse d&apos;{APP_NAME}</p>
                    <p>{ex.reply}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="essai" className="sec-dark" aria-label="Essai en direct" style={{ paddingTop: 0, scrollMarginTop: 52 }}>
          <div className="wrap" data-rv>
            <LiveDemo defaultSector={trade.sector} />
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
            <Link href="/inscription" className="btn btn-light btn-lg">
              Essayer {TRIAL_DAYS} jours gratuitement
            </Link>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
          <Link href="/">
            © {new Date().getFullYear()} {APP_NAME}
          </Link>
          <span>Service indépendant, sans lien avec Google.</span>
        </div>
      </footer>
    </div>
  );
}
