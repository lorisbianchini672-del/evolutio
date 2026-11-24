import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { APP_NAME } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFeedbackAction } from "./actions";

export const metadata: Metadata = { title: "Votre avis", robots: { index: false } };

// Page publique ouverte par le QR code ou le lien de collecte.
// Tous les visiteurs voient exactement la même chose : le lien vers Google et le message privé.
// Il n'y a volontairement aucune question préalable sur la satisfaction (interdit par les règles Google).
export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { data: location } = await createAdminClient()
    .from("locations")
    .select("title, review_url")
    .eq("slug", slug)
    .maybeSingle<{ title: string; review_url: string | null }>();
  if (!location) notFound();

  return (
    <div className="appx">
      <div className="appx-glow" aria-hidden="true" />
      <main className="appx-solo gap-5">
      <div className="text-center">
        <h1 className="page-title">{location.title}</h1>
        <p className="mt-2 text-stone-600">Merci de votre visite. Votre avis nous aide, quel qu&apos;il soit.</p>
      </div>

      <section className="card space-y-4 text-center">
        <p className="stars stars-lg" aria-hidden="true">
          ★★★★★
        </p>
        {location.review_url ? (
          <a href={location.review_url} className="btn btn-primary btn-xl w-full" rel="noreferrer">
            Laisser un avis sur Google
          </a>
        ) : (
          <p className="notice-info">Le lien vers Google sera actif dès que la fiche de l&apos;établissement sera connectée.</p>
        )}
        <p className="text-sm text-stone-500">Cela prend moins d&apos;une minute.</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Un mot à nous dire directement ?</h2>
        {query.merci ? (
          <p className="notice-ok" role="status">
            Message transmis à l&apos;établissement. Merci.
          </p>
        ) : (
          <form action={sendFeedbackAction} className="space-y-3">
            <input type="hidden" name="slug" value={slug} />
            {query.erreur && (
              <p className="notice-error" role="alert">
                Écrivez votre message avant de l&apos;envoyer.
              </p>
            )}
            <div>
              <label className="label" htmlFor="message">
                Votre message (privé, non publié)
              </label>
              <textarea className="input" id="message" name="message" rows={4} maxLength={2000} required />
            </div>
            <div>
              <label className="label" htmlFor="contact">
                E-mail ou téléphone pour être recontacté (facultatif)
              </label>
              <input className="input" id="contact" name="contact" maxLength={160} />
            </div>
            <div className="hidden" aria-hidden="true">
              <label htmlFor="site_web">Ne pas remplir</label>
              <input id="site_web" name="site_web" tabIndex={-1} autoComplete="off" />
            </div>
            <SubmitButton className="btn btn-secondary w-full">Envoyer à l&apos;établissement</SubmitButton>
          </form>
        )}
      </section>

      <p className="text-center text-xs text-stone-400">Page fournie par {APP_NAME}</p>
      </main>
    </div>
  );
}
