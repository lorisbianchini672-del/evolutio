import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { APP_NAME, CONTACT_EMAIL, PLANS, supportWhatsappUrl } from "@/lib/config";

export const metadata: Metadata = {
  title: `Agences et partenaires · ${APP_NAME}`,
  description: "Agences web, consultants, réseaux de commerçants : proposez Evolutio à vos clients.",
};

export default function PartnersPage() {
  const contact = CONTACT_EMAIL
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Partenariat Evolutio")}`
    : supportWhatsappUrl("Bonjour, je souhaite devenir partenaire d'Evolutio.");
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="wrap row">
          <Link href="/" className="logo" aria-label={`${APP_NAME}, accueil`}>
            <LogoMark />
          </Link>
          <span style={{ flex: 1 }} />
          <Link href="/connexion">Connexion</Link>
          <Link href="/inscription" className="cta">
            Essai gratuit
          </Link>
        </div>
      </header>
      <main>
        <section className="hero sec-dark" aria-labelledby="titre" style={{ paddingBottom: 48 }}>
          <div className="wrap stack">
            <p className="eyebrow">Agences, consultants, réseaux de commerçants</p>
            <h1 id="titre" className="h-xl">
              Vos clients, <br />
              <span className="serif shine">plus aucun avis sans réponse.</span>
            </h1>
            <p className="lead" style={{ maxWidth: 600 }}>
              Vous gérez la présence en ligne de commerces, de cabinets ou d&apos;une enseigne ? Proposez-leur {APP_NAME} :
              ils gagnent du temps, vous gagnez un service récurrent à valoriser.
            </p>
          </div>
        </section>
        <section className="sec-dark" style={{ paddingTop: 0 }} aria-label="Ce que nous proposons">
          <div className="wrap">
            <div className="rules">
              <div>
                <b>Plusieurs établissements, un seul compte</b>
                <p>
                  La formule {PLANS.multi.name} regroupe les fiches, les avis et les analyses de plusieurs établissements, avec
                  un comparatif entre eux.
                </p>
              </div>
              <div>
                <b>Un lien partenaire</b>
                <p>Chaque commerçant inscrit avec votre lien vous est rattaché. Les conditions se définissent avec vous.</p>
              </div>
              <div>
                <b>Audit gratuit pour prospecter</b>
                <p>
                  Notre{" "}
                  <Link href="/audit" className="gold">
                    audit de fiche
                  </Link>{" "}
                  note n&apos;importe quel établissement sur 100 : un premier rendez-vous tout trouvé.
                </p>
              </div>
              <div>
                <b>Export et rapports</b>
                <p>Export CSV des avis et rapport mensuel par e-mail : de quoi rendre compte à vos clients chaque mois.</p>
              </div>
            </div>
            <div className="cta-row" style={{ marginTop: 40 }}>
              {contact ? (
                <a className="btn btn-light btn-lg" href={contact}>
                  Devenir partenaire
                </a>
              ) : (
                <Link className="btn btn-light btn-lg" href="/inscription">
                  Créer un compte
                </Link>
              )}
            </div>
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
