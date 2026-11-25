import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { auditPlace } from "@/lib/audit";
import { APP_NAME, TRIAL_DAYS } from "@/lib/config";
import { nearbySimilar, placeDetails, placesConfigured, searchPlaces } from "@/lib/places";
import { createLimiter } from "@/lib/rate-limit";

export const metadata: Metadata = {
  title: `Audit gratuit de votre fiche Google · ${APP_NAME}`,
  description: "Votre note, vos avis, vos photos, vos concurrents : le diagnostic de votre fiche Google en 10 secondes, gratuit.",
};

// Audit gratuit, sans compte : la porte d'entrée commerciale. Limité pour maîtriser le coût de l'API Places.
const perVisitor = createLimiter(8, 60 * 60_000);
const global = createLimiter(400, 24 * 60 * 60_000);

type Params = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim().slice(0, 120) : "");

export default async function AuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = str(params.q);
  const placeId = str(params.fiche);
  const enabled = placesConfigured();

  let error: string | null = null;
  let results: Awaited<ReturnType<typeof searchPlaces>> = [];
  let report: { audit: ReturnType<typeof auditPlace>; details: Awaited<ReturnType<typeof placeDetails>>; rivals: Awaited<ReturnType<typeof nearbySimilar>> } | null = null;

  if (enabled && (q || placeId)) {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "inconnu";
    if (!perVisitor(ip) || !global("tous")) {
      error = "Beaucoup d'audits d'un coup : réessayez dans un moment.";
    } else {
      try {
        if (placeId) {
          const details = await placeDetails(placeId);
          const rivals = await nearbySimilar(details).catch(() => []);
          report = { audit: auditPlace(details, rivals), details, rivals };
        } else {
          results = await searchPlaces(q);
          if (!results.length) error = "Aucune fiche trouvée. Ajoutez la ville ou la rue.";
        }
      } catch {
        error = "Le diagnostic n'a pas pu être fait. Réessayez dans un instant.";
      }
    }
  }

  const weak = report?.audit.items.filter((i) => !i.ok) ?? [];

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
        <section className="hero sec-dark" aria-labelledby="titre" style={{ paddingBottom: 40 }}>
          <div className="wrap stack">
            <p className="eyebrow">Audit gratuit · sans inscription</p>
            <h1 id="titre" className="h-xl">
              Votre fiche Google, <br />
              <span className="serif shine">notée sur 100.</span>
            </h1>
            <p className="lead" style={{ maxWidth: 560 }}>
              Note, avis, photos, horaires, et votre place face aux établissements du même type autour de vous.
            </p>
            {enabled ? (
              <form method="get" className="audit-form">
                <input
                  className="live-input"
                  name="q"
                  defaultValue={q}
                  placeholder="Nom de l'établissement et ville"
                  aria-label="Nom de l'établissement et ville"
                  required
                />
                <button type="submit" className="btn btn-light btn-lg">
                  Lancer l&apos;audit
                </button>
              </form>
            ) : (
              <p className="lead">L&apos;audit gratuit sera bientôt disponible.</p>
            )}
          </div>
        </section>

        {(error || results.length > 0 || report) && (
          <section className="sec-dark" style={{ paddingTop: 0 }} aria-live="polite">
            <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {error && <p className="live-error">{error}</p>}

              {results.length > 0 && (
                <div className="audit-pick">
                  <p className="eyebrow">Quelle est votre fiche ?</p>
                  {results.map((p) => (
                    <Link key={p.id} href={`/audit?fiche=${encodeURIComponent(p.id)}`} className="trade-link">
                      <span>
                        <strong>{p.name}</strong>
                        <br />
                        <small style={{ color: "#a8a398" }}>{p.address}</small>
                      </span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              )}

              {report && (
                <div className="audit-card">
                  <div className="audit-top">
                    <div className="audit-score">
                      <strong>{report.audit.score}</strong>
                      <span>/100</span>
                    </div>
                    <div>
                      <h2 className="h-md">{report.details.name}</h2>
                      <p style={{ color: "#a8a398" }}>{report.details.address}</p>
                      {report.audit.rank && (
                        <p style={{ marginTop: 8 }}>
                          <strong className="gold">
                            {report.audit.rank}
                            {report.audit.rank === 1 ? "er" : "e"} sur {report.rivals.length + 1}
                          </strong>{" "}
                          établissements du même type autour de vous.
                        </p>
                      )}
                    </div>
                  </div>
                  <ul className="audit-items">
                    {report.audit.items.map((i) => (
                      <li key={i.id} className={i.ok ? "ok" : "ko"}>
                        <span aria-hidden="true">{i.ok ? "✓" : "!"}</span>
                        <div>
                          <strong>{i.label}</strong>
                          {!i.ok && <p>{i.advice}</p>}
                        </div>
                        <em>
                          {i.points}/{i.max}
                        </em>
                      </li>
                    ))}
                  </ul>
                  {report.rivals.length > 0 && (
                    <div className="audit-rivals">
                      <p className="eyebrow">Autour de vous</p>
                      {[{ id: report.details.id, name: `${report.details.name} (vous)`, rating: report.details.rating, reviewCount: report.details.reviewCount }, ...report.rivals]
                        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount)
                        .map((p) => (
                          <div key={p.id} className={p.id === report!.details.id ? "me" : ""}>
                            <span>{p.name}</span>
                            <span>
                              {p.rating ? p.rating.toFixed(1).replace(".", ",") : "–"} ★ · {p.reviewCount} avis
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                  <div className="audit-cta">
                    <p>
                      {weak.length
                        ? `${weak.length} point${weak.length > 1 ? "s" : ""} à corriger. ${APP_NAME} s'occupe des avis : réponses prêtes, demandes d'avis, suivi des concurrents.`
                        : `Belle fiche. ${APP_NAME} vous aide à rester devant : réponses prêtes et suivi des concurrents.`}
                    </p>
                    <Link href="/inscription" className="btn btn-light btn-lg">
                      Essayer {TRIAL_DAYS} jours gratuitement
                    </Link>
                    <p className="fine">Sans carte bancaire. Sans engagement.</p>
                  </div>
                  <p className="fine">
                    Barème d&apos;{APP_NAME} fondé sur les informations publiques de la fiche ; ce n&apos;est pas l&apos;algorithme de Google.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
