import QRCode from "qrcode";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { siteUrl } from "@/lib/config";
import { emailConfigured } from "@/lib/email";
import { monthStartIso, planOf } from "@/lib/plan";
import { requireSubscriber } from "@/lib/session";
import type { Feedback, Location } from "@/lib/types";
import { sendRequestAction } from "../actions";

export const metadata = { title: "Collecte d'avis" };

export default async function CollectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { supabase, subscription } = await requireSubscriber();
  const plan = planOf(subscription);

  const [{ data: locations }, { count: sentThisMonth }, { data: feedback }] = await Promise.all([
    supabase.from("locations").select("*").order("created_at").returns<Location[]>(),
    supabase.from("review_requests").select("id", { count: "exact", head: true }).gte("sent_at", monthStartIso()),
    supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(30).returns<Feedback[]>(),
  ]);

  const cards = await Promise.all(
    (locations ?? []).map(async (location) => {
      const link = `${siteUrl()}/r/${location.slug}`;
      return { location, link, qr: await QRCode.toDataURL(link, { width: 480, margin: 2 }) };
    }),
  );
  const titles = new Map((locations ?? []).map((l) => [l.id, l.title]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Collecte d&apos;avis</h1>
        <p className="text-sm text-stone-600">
          Un seul lien pour tous vos clients, satisfaits ou non : c&apos;est la règle fixée par Google, et c&apos;est ce
          qui protège votre fiche.
        </p>
      </div>

      <Notice params={params} />

      {cards.length === 0 && (
        <p className="card text-sm text-stone-600">
          Connectez votre fiche Google ou chargez les avis d&apos;exemple depuis l&apos;onglet Avis pour créer votre
          page de collecte.
        </p>
      )}

      {cards.map(({ location, link, qr }) => (
        <section key={location.id} className="card grid gap-6 md:grid-cols-[12rem_1fr]">
          <div className="space-y-2 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR code vers la page d'avis de ${location.title}`} className="qr mx-auto w-44" />
            <a href={qr} download={`qr-avis-${location.slug}.png`} className="btn btn-secondary w-full">
              Télécharger le QR code
            </a>
            <a href={`/r/${location.slug}/affiche`} target="_blank" rel="noreferrer" className="btn btn-secondary w-full">
              Affiche à imprimer
            </a>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="font-semibold">{location.title}</h2>
              <p className="mt-1 text-sm text-stone-600">Lien à partager, à imprimer sur un ticket ou à poser en caisse :</p>
              <a href={link} className="break-all text-sm link" target="_blank" rel="noreferrer">
                {link}
              </a>
              {!location.review_url && (
                <p className="notice-info mt-3">
                  Établissement de démonstration : le bouton « Laisser un avis sur Google » s&apos;activera une fois la
                  vraie fiche connectée.
                </p>
              )}
            </div>

            <form action={sendRequestAction} className="space-y-3 border-t border-stone-200 pt-4">
              <input type="hidden" name="location_id" value={location.id} />
              <div>
                <label className="label" htmlFor={`recipient-${location.id}`}>
                  Demander un avis par e-mail
                </label>
                <input
                  className="input"
                  id={`recipient-${location.id}`}
                  name="recipient"
                  type="email"
                  placeholder="client@exemple.fr"
                  required
                />
              </div>
              <label className="flex items-start gap-2 text-sm text-stone-700">
                <input type="checkbox" name="is_customer" className="mt-1" required />
                <span>Cette personne est cliente de mon établissement et m&apos;a donné son adresse.</span>
              </label>
              <SubmitButton className="btn btn-primary">Envoyer la demande</SubmitButton>
              <p className="hint">
                Une seule demande par client. {sentThisMonth ?? 0} envoyée{(sentThisMonth ?? 0) > 1 ? "s" : ""} ce mois-ci
                sur {plan.emailRequestsPerMonth} (formule {plan.name}).
                {!emailConfigured() && " L'envoi d'e-mails n'est pas encore configuré (Resend)."}
              </p>
            </form>
          </div>
        </section>
      ))}

      <section className="card space-y-3">
        <h2 className="font-semibold">Messages privés reçus</h2>
        <p className="text-sm text-stone-600">
          Tout visiteur de la page de collecte peut vous écrire directement, en plus ou à la place d&apos;un avis public.
        </p>
        {feedback?.length ? (
          <ul className="divide-y divide-stone-200">
            {feedback.map((item) => (
              <li key={item.id} className="space-y-1 py-3 text-sm">
                <p className="whitespace-pre-line text-stone-800">{item.message}</p>
                <p className="text-stone-500">
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(item.created_at))} ·{" "}
                  {titles.get(item.location_id) ?? "Établissement"}
                  {item.contact ? ` · ${item.contact}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">Aucun message pour l&apos;instant.</p>
        )}
      </section>
    </div>
  );
}
