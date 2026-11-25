import Link from "next/link";
import { Notice } from "@/components/notice";
import { Onboarding } from "@/components/onboarding";
import { PushSetup } from "@/components/push-setup";
import { SubmitButton } from "@/components/submit-button";
import { aiConfigured } from "@/lib/ai";
import { googleConfigured } from "@/lib/google";
import { checkReply, type GuardWarning } from "@/lib/guard";
import { onboardingSteps } from "@/lib/onboarding";
import { pushConfigured, vapidPublicKey } from "@/lib/push";
import { recentReplies } from "@/lib/reviews";
import { requireSubscriber } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Location, Review } from "@/lib/types";
import {
  addManualReviewAction,
  draftAction,
  ignoreAction,
  loadDemoAction,
  publishAction,
  syncAction,
} from "./actions";

export const metadata = { title: "Avis" };

type View = "a-traiter" | "publies" | "tous";

const VIEWS: { id: View; label: string }[] = [
  { id: "a-traiter", label: "À traiter" },
  { id: "publies", label: "Publiés" },
  { id: "tous", label: "Tous" },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className={rating <= 3 ? "stars low" : "stars"} aria-label={`${rating} sur 5`}>
      {"★".repeat(rating)}
      <span className="off">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

function ReviewCard({
  review,
  locationTitle,
  view,
  warnings,
}: {
  review: Review;
  locationTitle: string;
  view: View;
  warnings: GuardWarning[];
}) {
  const published = review.status === "published";
  return (
    <article id={`avis-${review.id}`} className="card rv scroll-mt-20 space-y-4">
      <header className="rv-head">
        <span className="rv-avatar" aria-hidden="true">
          {(review.reviewer_name ?? "?").trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="rv-who">
          <p className="rv-name">{review.reviewer_name ?? "Client anonyme"}</p>
          <p className="rv-meta">
            {formatDate(review.review_created_at)} · {locationTitle}
          </p>
        </div>
        <Stars rating={review.rating} />
      </header>

      {(review.is_demo || review.status === "ignored") && (
        <div className="flex flex-wrap gap-1.5">
          {review.is_demo && <span className="tag">Démonstration</span>}
          {review.status === "ignored" && <span className="tag">Ignoré</span>}
        </div>
      )}

      <p className="rv-text whitespace-pre-line">
        {review.comment ?? <span className="text-stone-500">Note laissée sans commentaire.</span>}
      </p>

      {published ? (
        <div className="reply">
          <p className="reply-k">Réponse publiée</p>
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{review.reply_text}</p>
        </div>
      ) : (
        <form className="space-y-3">
          <input type="hidden" name="review_id" value={review.id} />
          <input type="hidden" name="vue" value={view} />
          <label className="sr-only" htmlFor={`text-${review.id}`}>
            Réponse
          </label>
          <textarea
            key={review.draft_text ?? "vide"}
            id={`text-${review.id}`}
            name="text"
            rows={4}
            maxLength={4000}
            className="input"
            defaultValue={review.draft_text ?? ""}
            placeholder="Cliquez sur « Rédiger avec l'IA » ou écrivez votre réponse."
          />
          {warnings.length > 0 && (
            <ul className="guard" aria-label="Points à vérifier avant de publier">
              {warnings.map((w) => (
                <li key={w.code}>{w.message}</li>
              ))}
            </ul>
          )}
          <div className="actions">
            <SubmitButton formAction={publishAction}>
              {review.is_demo ? "Marquer comme publiée" : "Publier sur Google"}
            </SubmitButton>
            <SubmitButton formAction={draftAction} className="btn btn-secondary">
              {review.draft_text ? "Proposer une autre réponse" : "Rédiger avec l'IA"}
            </SubmitButton>
            {review.status !== "ignored" && (
              <SubmitButton formAction={ignoreAction} className="btn btn-quiet">
                Ignorer
              </SubmitButton>
            )}
          </div>
          {review.is_demo && (
            <p className="hint">Avis de démonstration : rien n&apos;est envoyé à Google.</p>
          )}
        </form>
      )}
    </article>
  );
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { supabase, user, account } = await requireSubscriber();
  const view: View = params.vue === "publies" ? "publies" : params.vue === "tous" ? "tous" : "a-traiter";

  let reviewsQuery = supabase.from("reviews").select("*").order("review_created_at", { ascending: false }).limit(100);
  if (view === "publies") reviewsQuery = reviewsQuery.eq("status", "published");
  if (view === "a-traiter") reviewsQuery = reviewsQuery.in("status", ["new", "drafted"]);

  const [{ data: locations }, { data: connection }, { data: reviews }, { count: todoCount }, recent, onboarding] = await Promise.all([
    supabase.from("locations").select("*").order("created_at").returns<Location[]>(),
    createAdminClient()
      .from("google_connections")
      .select("google_email")
      .eq("user_id", user.id)
      .maybeSingle<{ google_email: string | null }>(),
    reviewsQuery.returns<Review[]>(),
    supabase.from("reviews").select("id", { count: "exact", head: true }).in("status", ["new", "drafted"]),
    recentReplies(user.id),
    onboardingSteps(account),
  ]);

  const titles = new Map((locations ?? []).map((l) => [l.id, l.title]));
  const hasLocations = Boolean(locations?.length);
  const googleReady = googleConfigured();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="page-title">Avis</h1>
          <p className="text-sm text-stone-600">
            {todoCount ?? 0} avis en attente de réponse
            {connection?.google_email ? ` · fiche Google connectée (${connection.google_email})` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(todoCount ?? 0) > 0 && (
            <Link href="/app/rapide" className="btn btn-primary">
              Répondre en mode rapide
            </Link>
          )}
          {connection && (
            <form action={syncAction}>
              <SubmitButton className="btn btn-secondary">Vérifier les nouveaux avis</SubmitButton>
            </form>
          )}
        </div>
      </div>

      {onboarding && <Onboarding steps={onboarding} />}

      {pushConfigured() && <PushSetup publicKey={vapidPublicKey()} compact />}

      <Notice params={params} />

      {!aiConfigured() && (
        <p className="notice-info">
          Clé d&apos;IA absente (ANTHROPIC_API_KEY) : les brouillons utilisent un modèle de réponse générique.
        </p>
      )}

      {!connection && (
        <section className="card space-y-3">
          <h2 className="font-semibold">{hasLocations ? "Passez aux vrais avis" : "Pour commencer"}</h2>
          <p className="text-sm text-stone-600">
            Connectez votre fiche d&apos;établissement Google pour importer vos avis et publier vos réponses en un clic.
            {!hasLocations && " Vous pouvez aussi découvrir l'outil tout de suite avec des avis d'exemple."}
          </p>
          <div className="flex flex-wrap gap-2">
            {googleReady ? (
              <a href="/api/google/connect" className="btn btn-primary">
                Connecter ma fiche Google
              </a>
            ) : (
              <span className="btn btn-secondary cursor-not-allowed opacity-60" aria-disabled="true">
                Connexion Google à configurer
              </span>
            )}
            {!hasLocations && (
              <form action={loadDemoAction}>
                <SubmitButton className="btn btn-secondary">Essayer avec des avis d&apos;exemple</SubmitButton>
              </form>
            )}
          </div>
          {!googleReady && (
            <p className="hint">
              Les identifiants Google (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) ne sont pas renseignés. Voir le guide
              d&apos;installation, étape « Google ».
            </p>
          )}
        </section>
      )}

      <details className="card">
        <summary className="cursor-pointer font-medium">Tester sur un avis copié à la main</summary>
        <p className="mt-2 text-sm text-stone-600">
          Collez un avis réel pour voir la réponse proposée. Pratique pour une démonstration ; l&apos;avis reste dans
          l&apos;établissement de démonstration et rien n&apos;est publié.
        </p>
        <form action={addManualReviewAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_8rem]">
          <div>
            <label className="label" htmlFor="reviewer_name">
              Prénom de l&apos;auteur (facultatif)
            </label>
            <input className="input" id="reviewer_name" name="reviewer_name" maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="rating">
              Note
            </label>
            <select className="input" id="rating" name="rating" defaultValue="5">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} étoile{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="comment">
              Texte de l&apos;avis
            </label>
            <textarea className="input" id="comment" name="comment" rows={3} maxLength={4000} />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton className="btn btn-secondary">Proposer une réponse</SubmitButton>
          </div>
        </form>
      </details>

      {hasLocations && (
        <>
          <nav className="seg" aria-label="Filtrer les avis">
            {VIEWS.map((v) => (
              <Link
                key={v.id}
                href={v.id === "a-traiter" ? "/app" : `/app?vue=${v.id}`}
                aria-current={view === v.id ? "page" : undefined}
              >
                {v.label}
                {v.id === "a-traiter" && (todoCount ?? 0) > 0 && <span className="seg-n">{todoCount}</span>}
              </Link>
            ))}
          </nav>

          <div className="space-y-4">
            {(reviews ?? []).map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                locationTitle={titles.get(review.location_id) ?? "Établissement"}
                view={view}
                warnings={
                  review.status !== "published" && review.draft_text
                    ? checkReply(review.draft_text, {
                        sector: account.sector,
                        privateContact: account.private_contact,
                        signature: account.signature,
                        recentReplies: recent,
                      })
                    : []
                }
              />
            ))}
            {!reviews?.length && (
              <p className="card text-sm text-stone-600">
                {view === "a-traiter" ? "Aucun avis en attente. Tout est à jour." : "Aucun avis dans cette vue."}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
