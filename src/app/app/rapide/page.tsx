import Link from "next/link";
import { Notice } from "@/components/notice";
import { PushSetup } from "@/components/push-setup";
import { SubmitButton } from "@/components/submit-button";
import { pushConfigured, vapidPublicKey } from "@/lib/push";
import { requireSubscriber } from "@/lib/session";
import type { Location, Review } from "@/lib/types";
import { draftAction, ignoreAction, publishAction } from "../actions";

export const metadata = { title: "Réponse rapide" };

// Mode « réponse rapide » : un avis à la fois, pensé pour le pouce.
// Les avis les plus mal notés passent en premier, puis les plus récents.

function ago(iso: string): string {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "hier" : `il y a ${days} jours`;
}

export default async function QuickPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { supabase } = await requireSubscriber();
  const [{ data: queue }, { data: locations }] = await Promise.all([
    supabase
      .from("reviews")
      .select("*")
      .in("status", ["new", "drafted"])
      .order("rating", { ascending: true })
      .order("review_created_at", { ascending: false })
      .limit(50)
      .returns<Review[]>(),
    supabase.from("locations").select("id, title").returns<Pick<Location, "id" | "title">[]>(),
  ]);

  const list = queue ?? [];
  const wanted = typeof params.avis === "string" ? params.avis : "";
  const index = Math.max(0, list.findIndex((r) => r.id === wanted));
  const review = list[index];
  const next = list.length > 1 ? list[(index + 1) % list.length] : null;
  const title = new Map((locations ?? []).map((l) => [l.id, l.title]));

  if (!review) {
    return (
      <div className="quick-done">
        <Notice params={params} />
        <div className="quick-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h1 className="page-title">Tout est à jour.</h1>
        <p className="text-stone-600">Aucun avis n&apos;attend de réponse. On vous prévient dès qu&apos;un nouveau arrive.</p>
        {pushConfigured() && <PushSetup publicKey={vapidPublicKey()} compact />}
        <Link href="/app?vue=publies" className="btn btn-secondary">
          Voir les réponses publiées
        </Link>
      </div>
    );
  }

  const low = review.rating <= 3;
  return (
    <div className="quick">
      <div className="quick-top">
        <Link href="/app" className="quick-back" aria-label="Retour à la liste des avis">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.5 6l-6 6 6 6" />
          </svg>
        </Link>
        <p className="quick-count">
          <strong>{index + 1}</strong> / {list.length} à traiter
        </p>
        {next ? (
          <Link href={`/app/rapide?avis=${next.id}`} className="quick-skip">
            Passer
          </Link>
        ) : (
          <span />
        )}
      </div>
      <div className="quick-progress" aria-hidden="true">
        <span style={{ width: `${((index + 1) / list.length) * 100}%` }} />
      </div>

      <Notice params={params} />

      <article className={`card quick-card${low ? " is-low" : ""}`}>
        <header className="rv-head">
          <span className="rv-avatar" aria-hidden="true">
            {(review.reviewer_name ?? "?").trim().charAt(0).toUpperCase() || "?"}
          </span>
          <div className="rv-who">
            <p className="rv-name">{review.reviewer_name ?? "Client anonyme"}</p>
            <p className="rv-meta">
              {ago(review.review_created_at)} · {title.get(review.location_id) ?? "Établissement"}
            </p>
          </div>
          <span className={low ? "stars low" : "stars"} aria-label={`${review.rating} sur 5`}>
            {"★".repeat(review.rating)}
            <span className="off">{"★".repeat(5 - review.rating)}</span>
          </span>
        </header>
        {low && <p className="tag tag-warn">Avis à surveiller</p>}
        <p className="quick-text whitespace-pre-line">
          {review.comment ?? <span className="text-stone-500">Note laissée sans commentaire.</span>}
        </p>
      </article>

      <form className="quick-form">
        <input type="hidden" name="review_id" value={review.id} />
        <input type="hidden" name="retour" value="rapide" />
        <label className="reply-k" htmlFor="quick-text">
          {review.draft_text ? "Réponse proposée · modifiable" : "Votre réponse"}
        </label>
        <textarea
          key={review.draft_text ?? "vide"}
          id="quick-text"
          name="text"
          rows={6}
          maxLength={4000}
          className="input quick-input"
          defaultValue={review.draft_text ?? ""}
          placeholder="Touchez « Rédiger avec l'IA », ou écrivez votre réponse."
        />
        <div className="quick-bar">
          {review.draft_text ? (
            <SubmitButton formAction={publishAction} className="btn btn-primary quick-main">
              {review.is_demo ? "Marquer comme publiée" : "Publier sur Google"}
            </SubmitButton>
          ) : (
            <SubmitButton formAction={draftAction} className="btn btn-primary quick-main">
              Rédiger avec l&apos;IA
            </SubmitButton>
          )}
          <div className="quick-sub">
            {review.draft_text ? (
              <SubmitButton formAction={draftAction} className="btn btn-secondary">
                Autre version
              </SubmitButton>
            ) : (
              <SubmitButton formAction={publishAction} className="btn btn-secondary">
                Publier mon texte
              </SubmitButton>
            )}
            <SubmitButton formAction={ignoreAction} className="btn btn-quiet">
              Ignorer
            </SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
