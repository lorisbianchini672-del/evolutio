import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { aiConfigured } from "@/lib/ai";
import { emailConfigured } from "@/lib/email";
import { formatRating, loadReport, ratingDelta } from "@/lib/report";
import { requireSubscriber } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeAction, sendReportAction } from "../actions";

export const metadata = { title: "Analyse" };

type Row = {
  rating: number;
  status: string;
  review_created_at: string;
  reply_published_at: string | null;
  location_id: string;
  is_demo: boolean;
};

/** Délai moyen entre l'avis et la réponse publiée, en heures. */
function averageDelayHours(rows: Row[]): number | null {
  const delays = rows
    .filter((r) => r.status === "published" && r.reply_published_at)
    .map((r) => (new Date(r.reply_published_at as string).getTime() - new Date(r.review_created_at).getTime()) / 3_600_000)
    .filter((h) => h >= 0 && h < 24 * 365);
  return delays.length ? delays.reduce((a, b) => a + b, 0) / delays.length : null;
}

function formatDelay(hours: number | null): string {
  if (hours === null) return "–";
  if (hours < 1) return "< 1 h";
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} j`;
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card stat flex flex-col gap-1">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {hint && <p className="stat-hint">{hint}</p>}
    </div>
  );
}

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { supabase, account } = await requireSubscriber();
  const report = await loadReport(createAdminClient(), account, 0);
  const delta = ratingDelta(report.average, report.previousAverage);
  const { data } = await supabase
    .from("reviews")
    .select("rating, status, review_created_at, reply_published_at, location_id, is_demo")
    .order("review_created_at", { ascending: false })
    .limit(1000)
    .returns<Row[]>();
  const reviews = data ?? [];
  const { data: locationRows } = await supabase.from("locations").select("id, title").order("created_at");
  const perLocation = (locationRows ?? [])
    .map((l) => {
      const rows = reviews.filter((r) => r.location_id === l.id);
      const done = rows.filter((r) => r.status === "published").length;
      return {
        id: l.id as string,
        title: l.title as string,
        count: rows.length,
        average: rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : null,
        rate: rows.length ? Math.round((done / rows.length) * 100) : null,
        delay: averageDelayHours(rows),
      };
    })
    .filter((l) => l.count > 0)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  const delayHours = averageDelayHours(reviews);
  const total = reviews.length;
  const average = total ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
  const answered = reviews.filter((r) => r.status === "published").length;
  const pending = reviews.filter((r) => r.status === "new" || r.status === "drafted").length;
  const answerRate = total ? Math.round((answered / total) * 100) : 0;

  const byStar = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }));
  const maxStar = Math.max(1, ...byStar.map((s) => s.count));

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return { key, label: MONTHS[d.getUTCMonth()], count: reviews.filter((r) => r.review_created_at.startsWith(key)).length };
  });
  const maxMonth = Math.max(1, ...months.map((m) => m.count));

  const insights = account.insights;
  const insightsDate = account.insights_at
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(account.insights_at))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Analyse</h1>
        <p className="mt-1 text-sm text-stone-600">Vos avis en chiffres, et ce que vos clients disent vraiment.</p>
      </div>
      <Notice params={params} />

      {total === 0 ? (
        <p className="card text-stone-600">Aucun avis pour l&apos;instant. Connectez votre fiche Google ou chargez les avis d&apos;exemple depuis l&apos;onglet Avis.</p>
      ) : (
        <>
          <section className="card report space-y-4" aria-labelledby="t-report">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="reply-k">Rapport du mois · en cours</p>
                <h2 id="t-report" className="text-xl font-semibold capitalize">
                  {report.label}
                </h2>
              </div>
              {emailConfigured() && (
                <form action={sendReportAction}>
                  <SubmitButton className="btn btn-secondary">M&apos;envoyer le rapport du mois dernier</SubmitButton>
                </form>
              )}
            </div>
            <div className="report-grid">
              <div>
                <p className="report-n">{report.received}</p>
                <p className="report-l">avis reçus</p>
              </div>
              <div>
                <p className="report-n">
                  {formatRating(report.average)}
                  {delta && delta !== "stable" && <span className={delta.startsWith("+") ? "up" : "down"}>{delta}</span>}
                </p>
                <p className="report-l">note du mois</p>
              </div>
              <div>
                <p className="report-n">{report.responseRate === null ? "–" : `${report.responseRate} %`}</p>
                <p className="report-l">avis répondus</p>
              </div>
              <div>
                <p className="report-n">{report.googleClicks}</p>
                <p className="report-l">clients envoyés vers Google</p>
              </div>
            </div>
            {report.sinceJoin.reviews > 0 && (
              <p className="report-since">
                Depuis votre arrivée : <strong>{report.sinceJoin.reviews} nouveaux avis</strong>
                {report.sinceJoin.averageBefore !== null &&
                  (formatRating(report.sinceJoin.averageBefore) === formatRating(report.sinceJoin.averageNow) ? (
                    <>
                      , note stable à <strong>{formatRating(report.sinceJoin.averageNow)}</strong>
                    </>
                  ) : (
                    <>
                      , note passée de <strong>{formatRating(report.sinceJoin.averageBefore)}</strong> à{" "}
                      <strong>{formatRating(report.sinceJoin.averageNow)}</strong>
                    </>
                  ))}
                .
              </p>
            )}
            {insights?.action && (
              <p className="report-action">
                <span>L&apos;action du mois</span>
                {insights.action}
              </p>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Stat label="Note moyenne" value={average.toFixed(1).replace(".", ",")} hint={`sur ${total} avis`} />
            <Stat label="Taux de réponse" value={`${answerRate} %`} hint={`${answered} réponses publiées`} />
            <Stat label="Délai de réponse" value={formatDelay(delayHours)} hint={pending ? `${pending} avis en attente` : "tout est à jour"} />
            <Stat label="Avis ce mois-ci" value={String(months[5].count)} hint={`${months[4].count} le mois dernier`} />
          </div>

          {perLocation.length > 1 && (
            <section className="card space-y-3" aria-labelledby="t-locs">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 id="t-locs" className="font-semibold">
                  Vos établissements
                </h2>
                <p className="hint">Classés par note moyenne</p>
              </div>
              <div className="loc-table" role="table" aria-label="Comparatif des établissements">
                <div className="loc-row loc-head" role="row">
                  <span role="columnheader">Établissement</span>
                  <span role="columnheader">Note</span>
                  <span role="columnheader">Avis</span>
                  <span role="columnheader">Réponses</span>
                  <span role="columnheader">Délai</span>
                </div>
                {perLocation.map((l, i) => (
                  <div key={l.id} className="loc-row" role="row">
                    <span role="cell">
                      <b>{i + 1}.</b> {l.title}
                    </span>
                    <span role="cell">{l.average === null ? "–" : l.average.toFixed(1).replace(".", ",")} ★</span>
                    <span role="cell">{l.count}</span>
                    <span role="cell">{l.rate === null ? "–" : `${l.rate} %`}</span>
                    <span role="cell">{formatDelay(l.delay)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <a href="/api/export/avis" className="btn btn-secondary">
              Exporter tous les avis (CSV)
            </a>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card space-y-4" aria-labelledby="t-stars">
              <h2 id="t-stars" className="font-semibold">Répartition des notes</h2>
              <div className="space-y-2.5">
                {byStar.map(({ star, count }) => (
                  <div key={star} className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                    <span className="text-stone-600">{star} ★</span>
                    <span className="bar-track">
                      <span className={star <= 3 ? "bar bar-low" : "bar"} style={{ width: `${(count / maxStar) * 100}%` }} />
                    </span>
                    <span className="text-right tabular-nums text-stone-600">{count}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="card space-y-4" aria-labelledby="t-months">
              <h2 id="t-months" className="font-semibold">Avis reçus sur 6 mois</h2>
              <div className="flex h-40 items-end gap-3">
                {months.map((m) => (
                  <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-xs tabular-nums text-stone-600">{m.count}</span>
                    <span className="col" style={{ height: `${Math.max(3, (m.count / maxMonth) * 100)}%` }} />
                    <span className="text-xs text-stone-500">{m.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      <section className="card space-y-4" aria-labelledby="t-insights">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="t-insights" className="font-semibold">Ce que disent vos clients</h2>
            <p className="text-sm text-stone-500">
              {insightsDate ? `Synthèse par IA du ${insightsDate}.` : "Synthèse par IA de vos derniers avis : forces, irritants, et une action à mener."}
            </p>
          </div>
          <form action={analyzeAction}>
            <SubmitButton className={insights ? "btn btn-secondary" : "btn btn-primary"}>
              {insights ? "Mettre à jour la synthèse" : "Analyser mes avis"}
            </SubmitButton>
          </form>
        </div>
        {!aiConfigured() && <p className="notice-info">La synthèse a besoin de la clé d&apos;IA (étape 3 de l&apos;installation).</p>}
        {insights && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="eyebrow-ok">Forces</p>
              <ul className="space-y-2">
                {insights.forces.map((item) => (
                  <li key={item.theme} className="insight">
                    <span className="font-medium">{item.theme}</span>
                    <span className="text-sm text-stone-600">{item.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="eyebrow-warn">Irritants</p>
              {insights.irritants.length ? (
                <ul className="space-y-2">
                  {insights.irritants.map((item) => (
                    <li key={item.theme} className="insight">
                      <span className="font-medium">{item.theme}</span>
                      <span className="text-sm text-stone-600">{item.detail}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-stone-600">Aucun irritant récurrent dans ces avis.</p>
              )}
            </div>
            {(insights.keywords ?? []).length > 0 && (
              <div className="md:col-span-2 space-y-2">
                <p className="eyebrow-ok">Les mots de vos clients</p>
                <div className="chips">
                  {(insights.keywords ?? []).map((k) => (
                    <span key={k} className="chip-k">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {insights.action && (
              <p className="notice-ok md:col-span-2">
                <span className="font-medium">À faire ce mois-ci : </span>
                {insights.action}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
