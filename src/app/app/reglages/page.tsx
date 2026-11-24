import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { SECTORS, TONES } from "@/lib/config";
import { googleConfigured } from "@/lib/google";
import { requireAccount } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearDemoAction, disconnectGoogleAction, saveSettingsAction, updatePasswordAction } from "../actions";

export const metadata = { title: "Réglages" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { supabase, user, account } = await requireAccount();
  const [{ data: connection }, { count: demoCount }] = await Promise.all([
    createAdminClient()
      .from("google_connections")
      .select("google_email, connected_at")
      .eq("user_id", user.id)
      .maybeSingle<{ google_email: string | null; connected_at: string }>(),
    supabase.from("locations").select("id", { count: "exact", head: true }).eq("is_demo", true),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="page-title">Réglages</h1>
      <Notice params={params} />

      <form action={saveSettingsAction} className="card space-y-5">
        <h2 className="font-semibold">Votre établissement et le ton des réponses</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="business_name">
              Nom de l&apos;établissement
            </label>
            <input className="input" id="business_name" name="business_name" defaultValue={account.business_name} maxLength={120} />
          </div>
          <div>
            <label className="label" htmlFor="sector">
              Secteur
            </label>
            <select className="input" id="sector" name="sector" defaultValue={account.sector}>
              {Object.entries(SECTORS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tone">
              Ton
            </label>
            <select className="input" id="tone" name="tone" defaultValue={account.tone}>
              {Object.entries(TONES).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="signature">
              Signature
            </label>
            <input className="input" id="signature" name="signature" defaultValue={account.signature} maxLength={120} placeholder="L'équipe de la Boulangerie Martin" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="private_contact">
            Contact proposé en cas d&apos;avis négatif
          </label>
          <input className="input" id="private_contact" name="private_contact" defaultValue={account.private_contact} maxLength={160} placeholder="contact@monetablissement.fr ou 04 00 00 00 00" />
          <p className="hint">La réponse invite le client mécontent à poursuivre en privé par ce moyen.</p>
        </div>
        <div>
          <label className="label" htmlFor="extra_instructions">
            Consignes particulières
          </label>
          <textarea className="input" id="extra_instructions" name="extra_instructions" rows={3} maxLength={600} defaultValue={account.extra_instructions} placeholder="Exemple : toujours vouvoyer, ne jamais parler des prix." />
        </div>

        <div className="grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="auto_publish">
              Publication automatique
            </label>
            <select className="input" id="auto_publish" name="auto_publish" defaultValue={account.auto_publish_min_rating?.toString() ?? ""}>
              <option value="">Jamais : je valide chaque réponse</option>
              <option value="5">Avis 5 étoiles uniquement</option>
              <option value="4">Avis 4 et 5 étoiles</option>
            </select>
            <p className="hint">Les avis de 3 étoiles et moins attendent toujours votre validation.</p>
          </div>
          <label className="flex items-start gap-2 self-center text-sm text-stone-700">
            <input type="checkbox" name="alert_email" defaultChecked={account.alert_email} className="mt-1" />
            <span>M&apos;alerter par e-mail quand un avis attend ma validation</span>
          </label>
        </div>
        <SubmitButton>Enregistrer</SubmitButton>
      </form>

      <section className="card space-y-3">
        <h2 className="font-semibold">Fiche Google</h2>
        {connection ? (
          <>
            <p className="text-sm text-stone-700">
              Connectée{connection.google_email ? ` avec ${connection.google_email}` : ""}.
            </p>
            <form action={disconnectGoogleAction}>
              <SubmitButton
                className="btn btn-secondary"
                confirmMessage="Déconnecter Google ? Les avis importés seront supprimés de l'application (ils restent sur Google)."
              >
                Déconnecter
              </SubmitButton>
            </form>
          </>
        ) : googleConfigured() ? (
          <a href="/api/google/connect" className="btn btn-primary">
            Connecter ma fiche Google
          </a>
        ) : (
          <p className="text-sm text-stone-600">La connexion Google n&apos;est pas encore configurée sur ce serveur.</p>
        )}
      </section>

      {(demoCount ?? 0) > 0 && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Données de démonstration</h2>
          <form action={clearDemoAction}>
            <SubmitButton className="btn btn-secondary" confirmMessage="Supprimer les avis de démonstration ?">
              Supprimer les avis d&apos;exemple
            </SubmitButton>
          </form>
        </section>
      )}

      <form action={updatePasswordAction} className="card space-y-4">
        <h2 className="font-semibold">Mot de passe</h2>
        <div className="max-w-sm">
          <label className="label" htmlFor="password">
            Nouveau mot de passe
          </label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <SubmitButton className="btn btn-secondary">Changer le mot de passe</SubmitButton>
      </form>
    </div>
  );
}
