import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { auditPlace, type Audit } from "@/lib/audit";
import { fetchPerformance, type PerformanceTotals } from "@/lib/google";
import { nearbySimilar, placeDetails, placesConfigured, searchPlaces, type PlaceDetails, type PlaceSummary } from "@/lib/places";
import { formatRating } from "@/lib/report";
import { getAccessTokenFor } from "@/lib/reviews";
import { requireSubscriber } from "@/lib/session";
import type { Competitor, GooglePost, Location } from "@/lib/types";
import {
  addCompetitorAction,
  deletePostAction,
  draftPostAction,
  publishPostAction,
  refreshCompetitorsAction,
  removeCompetitorAction,
  setMyPlaceAction,
} from "./actions";

export const metadata = { title: "Visibilité" };

type Params = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string {
  return typeof v === "string" ? v.trim().slice(0, 120) : "";
}

function delta(now: number, before: number): { text: string; up: boolean } | null {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return { text: `${pct > 0 ? "+" : ""}${pct} %`, up: pct >= 0 };
}

async function safe<T>(fn: () => Promise<T>): Promise<{ value: T | null; error: string | null }> {
  try {
    return { value: await fn(), error: null };
  } catch (err) {
    return { value: null, error: err instanceof Error ? err.message : "Indisponible." };
  }
}

/** Deux périodes de 28 jours ; Google publie les chiffres avec quelques jours de retard. */
function perfWindow() {
  const day = 86_400_000;
  const end = new Date(Date.now() - 3 * day);
  const start = new Date(end.getTime() - 27 * day);
  const prevEnd = new Date(start.getTime() - day);
  const prevStart = new Date(prevEnd.getTime() - 27 * day);
  return { start, end, prevStart, prevEnd };
}

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="score-ring" aria-label={`Score ${score} sur 100`}>
      <svg viewBox="0 0 80 80" width="96" height="96" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="url(#ring-g)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`}
          transform="rotate(-90 40 40)"
        />
        <defs>
          <linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f2d2a2" />
            <stop offset="1" stopColor="#e3a964" />
          </linearGradient>
        </defs>
      </svg>
      <span>
        <strong>{score}</strong>/100
      </span>
    </div>
  );
}

export default async function VisibilityPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { supabase, user, account } = await requireSubscriber();
  const [{ data: locations }, { data: competitors }, { data: posts }, { data: connection }, { data: ownReviews }] =
    await Promise.all([
      supabase.from("locations").select("*").order("is_demo").order("created_at").returns<Location[]>(),
      supabase.from("competitors").select("*").order("created_at").returns<Competitor[]>(),
      supabase.from("google_posts").select("*").order("created_at", { ascending: false }).limit(10).returns<GooglePost[]>(),
      supabase.from("google_connections").select("user_id").maybeSingle(),
      supabase.from("reviews").select("rating").eq("is_demo", false).limit(5000),
    ]);

  const list = locations ?? [];
  const location = list.find((l) => l.id === str(params.etab)) ?? list[0] ?? null;
  const places = placesConfigured();
  const ficheQuery = str(params.fiche);
  const rivalQuery = str(params.concurrent);

  // Audit de la fiche
  let details: PlaceDetails | null = null;
  let audit: Audit | null = null;
  let neighbours: PlaceSummary[] = [];
  let auditError: string | null = null;
  if (places && location?.place_id) {
    const res = await safe(async () => {
      const d = await placeDetails(location.place_id as string);
      const n = await nearbySimilar(d).catch(() => []);
      return { d, n };
    });
    if (res.value) {
      details = res.value.d;
      neighbours = res.value.n;
      audit = auditPlace(details, neighbours);
    } else auditError = res.error;
  }
  const ficheResults = places && ficheQuery ? await safe(() => searchPlaces(ficheQuery)) : null;
  const rivalResults = places && rivalQuery ? await safe(() => searchPlaces(rivalQuery)) : null;

  // Statistiques Google (fiche connectée)
  let perf: { now: PerformanceTotals; before: PerformanceTotals } | null = null;
  let perfError: string | null = null;
  if (connection && location?.google_location_name) {
    const res = await safe(async () => {
      const token = await getAccessTokenFor(user.id);
      const { start, end, prevStart, prevEnd } = perfWindow();
      const [now, before] = await Promise.all([
        fetchPerformance(token, location.google_location_name as string, start, end),
        fetchPerformance(token, location.google_location_name as string, prevStart, prevEnd),
      ]);
      return { now, before };
    });
    perf = res.value;
    perfError = res.error;
  }

  const ownAvg = ownReviews?.length
    ? Math.round((ownReviews.reduce((s, r) => s + (r.rating as number), 0) / ownReviews.length) * 10) / 10
    : null;
  const ownRating = details?.rating ?? ownAvg;
  const ownCount = details?.reviewCount ?? ownReviews?.length ?? 0;
  const keywords = account.insights?.keywords ?? [];
  const canPublishPosts = Boolean(location?.google_account_name && location?.google_location_name);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="page-title">Visibilité</h1>
        <p className="text-sm text-stone-600">Votre fiche Google, vos concurrents, et ce qui vous fait remonter.</p>
      </div>

      <Notice params={params} />

      {list.length > 1 && (
        <nav className="seg" aria-label="Établissement">
          {list.map((l) => (
            <Link key={l.id} href={`/app/visibilite?etab=${l.id}`} aria-current={l.id === location?.id ? "page" : undefined}>
              {l.title}
            </Link>
          ))}
        </nav>
      )}

      {/* ---- Audit ---- */}
      <section id="fiche" className="card report scroll-mt-20 space-y-4" aria-labelledby="t-fiche">
        <div>
          <p className="reply-k">Audit de la fiche</p>
          <h2 id="t-fiche" className="text-lg font-semibold">
            {details?.name ?? location?.title ?? "Votre fiche Google"}
          </h2>
        </div>
        {!places && (
          <p className="hint">
            L&apos;audit et le suivi des concurrents utilisent l&apos;API Google Places : ajoutez GOOGLE_PLACES_API_KEY dans
            l&apos;installation pour les activer.
          </p>
        )}
        {places && !location && <p className="text-sm text-stone-600">Ajoutez d&apos;abord un établissement.</p>}
        {places && location && !location.place_id && (
          <div className="space-y-3">
            <p className="text-sm text-stone-600">Retrouvons votre fiche : tapez le nom de votre établissement et la ville.</p>
            <form method="get" className="flex flex-wrap gap-2">
              {location && <input type="hidden" name="etab" value={location.id} />}
              <input className="input flex-1" name="fiche" defaultValue={ficheQuery || location.title} placeholder="Boulangerie des Halles Villeurbanne" />
              <button className="btn btn-secondary" type="submit">
                Chercher
              </button>
            </form>
            {ficheResults?.error && <p className="notice-error">{ficheResults.error}</p>}
            {ficheResults?.value && (
              <ul className="place-list">
                {ficheResults.value.map((p) => (
                  <li key={p.id}>
                    <div>
                      <strong>{p.name}</strong>
                      <span>
                        {p.address} · {formatRating(p.rating)} ★ · {p.reviewCount} avis
                      </span>
                    </div>
                    <form action={setMyPlaceAction}>
                      <input type="hidden" name="location_id" value={location.id} />
                      <input type="hidden" name="place_id" value={p.id} />
                      <SubmitButton className="btn btn-primary">C&apos;est moi</SubmitButton>
                    </form>
                  </li>
                ))}
                {!ficheResults.value.length && <li>Aucune fiche trouvée. Essayez avec la ville ou la rue.</li>}
              </ul>
            )}
          </div>
        )}
        {auditError && <p className="notice-error">{auditError}</p>}
        {audit && details && (
          <>
            <div className="audit-head">
              <ScoreRing score={audit.score} />
              <div className="space-y-1">
                <p className="report-since">
                  {audit.rank
                    ? `${audit.rank}${audit.rank === 1 ? "er" : "e"} sur ${neighbours.length + 1} établissements du même type autour de vous.`
                    : "Score calculé sur les informations publiques de votre fiche."}
                </p>
                {details.mapsUrl && (
                  <a className="link text-sm" href={details.mapsUrl} target="_blank" rel="noreferrer">
                    Voir la fiche sur Google Maps
                  </a>
                )}
              </div>
            </div>
            <ul className="audit-list">
              {audit.items.map((i) => (
                <li key={i.id} className={i.ok ? "ok" : "ko"}>
                  <span className="audit-dot" aria-hidden="true">
                    {i.ok ? "✓" : "!"}
                  </span>
                  <div>
                    <p>
                      <strong>{i.label}</strong> <span className="audit-pts">{i.points}/{i.max}</span>
                    </p>
                    {!i.ok && <p className="hint">{i.advice}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <p className="hint">Barème d&apos;Evolutio, fondé sur les bonnes pratiques des fiches Google : ce n&apos;est pas l&apos;algorithme de Google.</p>
          </>
        )}
      </section>

      {/* ---- Statistiques Google ---- */}
      <section className="card space-y-4" aria-labelledby="t-perf">
        <div>
          <p className="reply-k">28 derniers jours</p>
          <h2 id="t-perf" className="text-lg font-semibold">
            Ce que votre fiche vous a apporté
          </h2>
        </div>
        {!connection && <p className="text-sm text-stone-600">Connectez votre fiche Google pour voir vos appels, itinéraires et visites.</p>}
        {perfError && <p className="hint">Statistiques indisponibles pour l&apos;instant : {perfError}</p>}
        {perf && (
          <div className="report-grid">
            {(
              [
                ["views", "vues de la fiche"],
                ["calls", "appels"],
                ["directions", "demandes d'itinéraire"],
                ["website", "clics vers le site"],
              ] as const
            ).map(([key, label]) => {
              const d = delta(perf.now[key], perf.before[key]);
              return (
                <div key={key}>
                  <p className="report-n">
                    {perf.now[key]}
                    {d && <span className={d.up ? "up" : "down"}>{d.text}</span>}
                  </p>
                  <p className="report-l">{label}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- Concurrents ---- */}
      <section id="concurrents" className="card scroll-mt-20 space-y-4" aria-labelledby="t-rivals">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="reply-k">Votre rue</p>
            <h2 id="t-rivals" className="text-lg font-semibold">
              Vous face à vos concurrents
            </h2>
          </div>
          {(competitors ?? []).length > 0 && places && (
            <form action={refreshCompetitorsAction}>
              <SubmitButton className="btn btn-secondary">Mettre à jour</SubmitButton>
            </form>
          )}
        </div>
        <div className="rivals">
          <div className="rival is-me">
            <span className="rival-name">Vous</span>
            <span className="rival-rate">{formatRating(ownRating)} ★</span>
            <span className="rival-count">{ownCount} avis</span>
          </div>
          {(competitors ?? []).map((c) => {
            const ahead = ownRating !== null && c.rating !== null && c.rating > ownRating;
            const gained = c.previous_count !== null && c.review_count !== null ? c.review_count - c.previous_count : null;
            return (
              <div key={c.id} className={`rival${ahead ? " is-ahead" : ""}`}>
                <span className="rival-name">
                  {c.maps_url ? (
                    <a href={c.maps_url} target="_blank" rel="noreferrer">
                      {c.name}
                    </a>
                  ) : (
                    c.name
                  )}
                </span>
                <span className="rival-rate">{formatRating(c.rating)} ★</span>
                <span className="rival-count">
                  {c.review_count ?? "–"} avis{gained ? ` (+${gained})` : ""}
                </span>
                <form action={removeCompetitorAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="rival-x" aria-label={`Ne plus suivre ${c.name}`}>
                    ×
                  </button>
                </form>
              </div>
            );
          })}
        </div>
        {places ? (
          <>
            <form method="get" action="/app/visibilite#concurrents" className="flex flex-wrap gap-2">
              {location && <input type="hidden" name="etab" value={location.id} />}
              <input className="input flex-1" name="concurrent" defaultValue={rivalQuery} placeholder="Nom d'un concurrent et ville" />
              <button className="btn btn-secondary" type="submit">
                Ajouter
              </button>
            </form>
            {rivalResults?.error && <p className="notice-error">{rivalResults.error}</p>}
            {rivalResults?.value && (
              <ul className="place-list">
                {rivalResults.value.map((p) => (
                  <li key={p.id}>
                    <div>
                      <strong>{p.name}</strong>
                      <span>
                        {p.address} · {formatRating(p.rating)} ★ · {p.reviewCount} avis
                      </span>
                    </div>
                    <form action={addCompetitorAction}>
                      <input type="hidden" name="place_id" value={p.id} />
                      <SubmitButton className="btn btn-secondary">Suivre</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {!rivalResults && neighbours.length > 0 && (competitors ?? []).length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-stone-600">Autour de vous, du même type :</p>
                <ul className="place-list">
                  {neighbours.slice(0, 4).map((p) => (
                    <li key={p.id}>
                      <div>
                        <strong>{p.name}</strong>
                        <span>
                          {formatRating(p.rating)} ★ · {p.reviewCount} avis
                        </span>
                      </div>
                      <form action={addCompetitorAction}>
                        <input type="hidden" name="place_id" value={p.id} />
                        <SubmitButton className="btn btn-secondary">Suivre</SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="hint">Chaque semaine, Evolutio relit leurs chiffres et vous prévient si l&apos;un d&apos;eux passe devant vous.</p>
          </>
        ) : (
          <p className="hint">Le suivi des concurrents s&apos;active avec la clé Google Places.</p>
        )}
      </section>

      {/* ---- Publications Google ---- */}
      <section id="publications" className="card scroll-mt-20 space-y-4" aria-labelledby="t-posts">
        <div>
          <p className="reply-k">Référencement local</p>
          <h2 id="t-posts" className="text-lg font-semibold">
            Publications Google
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Une fiche qui publie régulièrement montre qu&apos;elle est vivante. Une idée en une ligne, l&apos;IA rédige.
          </p>
        </div>
        {location ? (
          <form action={draftPostAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="location_id" value={location.id} />
            <input className="input flex-1" name="idea" maxLength={500} placeholder="Ex. : galette des rois disponible dès samedi" required />
            <SubmitButton className="btn btn-primary">Rédiger</SubmitButton>
          </form>
        ) : (
          <p className="text-sm text-stone-600">Ajoutez d&apos;abord un établissement.</p>
        )}
        <div className="space-y-3">
          {(posts ?? []).map((p) => (
            <article key={p.id} className="post">
              {p.status === "published" ? (
                <>
                  <p className="reply-k">Publiée</p>
                  <p className="whitespace-pre-line text-[15px]">{p.text}</p>
                </>
              ) : (
                <form className="space-y-2">
                  <input type="hidden" name="post_id" value={p.id} />
                  <textarea className="input" name="text" rows={4} maxLength={1500} defaultValue={p.text} />
                  {p.status === "error" && p.error && <p className="hint">Dernier essai refusé : {p.error}</p>}
                  <div className="actions">
                    {canPublishPosts ? (
                      <SubmitButton formAction={publishPostAction}>Publier sur Google</SubmitButton>
                    ) : (
                      <CopyButton text={p.text} label="Copier le texte" />
                    )}
                    <SubmitButton formAction={deletePostAction} className="btn btn-quiet">
                      Supprimer
                    </SubmitButton>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* ---- Mots-clés ---- */}
      <section className="card space-y-3" aria-labelledby="t-keys">
        <div>
          <p className="reply-k">Les mots de vos clients</p>
          <h2 id="t-keys" className="text-lg font-semibold">
            Ce que Google lit dans vos avis
          </h2>
        </div>
        {keywords.length ? (
          <>
            <div className="chips">
              {keywords.map((k) => (
                <span key={k} className="chip-k">
                  {k}
                </span>
              ))}
            </div>
            <p className="hint">
              Reprenez ces expressions dans vos publications et votre description : ce sont les mots que vos futurs clients tapent.
            </p>
          </>
        ) : (
          <p className="text-sm text-stone-600">
            Lancez l&apos;analyse de vos avis dans{" "}
            <Link href="/app/analyse" className="link">
              Analyse
            </Link>{" "}
            pour faire apparaître les mots qui reviennent.
          </p>
        )}
      </section>
    </div>
  );
}
