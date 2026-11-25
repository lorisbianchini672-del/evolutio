import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/copy-button";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { APP_NAME, siteUrl } from "@/lib/config";
import { ensureLocalEnv, isLocalMode } from "@/lib/local-env";
import { schemaSql, simpleStep, stripeStep, supabaseStep, type StepState } from "@/lib/setup";
import { saveKeysAction, stripeCatalogAction } from "./actions";

export const metadata = { title: "Installation", robots: { index: false } };
export const dynamic = "force-dynamic";

const PILL: Record<StepState, { label: string; cls: string }> = {
  ok: { label: "Connecté", cls: "pill pill-ok" },
  todo: { label: "À faire", cls: "pill pill-todo" },
  error: { label: "À terminer", cls: "pill pill-warn" },
};

function StepCard({ id, n, title, state, detail, children }: { id: string; n: number; title: string; state: StepState; detail: string; children?: ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-6 space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <span className="step-n">{n}</span>
        <h2 className="flex-1 text-xl font-semibold tracking-tight">{title}</h2>
        <span className={PILL[state].cls}>{PILL[state].label}</span>
      </header>
      <p className="text-stone-600">{detail}</p>
      {children}
    </section>
  );
}

function Field({ name, label, placeholder, type = "password" }: { name: string; label: string; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input className="input font-mono" id={name} name={name} type={type} placeholder={placeholder} autoComplete="off" spellCheck={false} />
    </div>
  );
}

export default async function SetupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  ensureLocalEnv();
  const params = await searchParams;
  const local = isLocalMode();
  const supabase = await supabaseStep();
  // En ligne, cette page ne sert qu'à démarrer : une fois la base connectée, elle disparaît.
  if (!local && supabase.state === "ok") notFound();

  const stripe = stripeStep();
  const ai = simpleStep(["ANTHROPIC_API_KEY"], "Rédaction par IA active.", "Sans clé, les brouillons utilisent une réponse type.");
  const email = simpleStep(["RESEND_API_KEY", "EMAIL_FROM"], "Envoi d'e-mails actif.", "Sans Resend, ni alertes ni demandes d'avis par e-mail.");
  const google = simpleStep(
    ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    "Identifiants Google enregistrés. La connexion des fiches fonctionne dès que Google a approuvé l'accès à son API.",
    "À faire en dernier : Google doit d'abord approuver votre accès à l'API Business Profile.",
  );
  const twilio = simpleStep(
    ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
    "Twilio connecté : les alertes SMS ou WhatsApp des avis négatifs sont actives.",
    "Facultatif. Les alertes SMS et WhatsApp des avis de 1 à 3 étoiles. Sans Twilio, l'e-mail et la notification du téléphone suffisent.",
  );
  const sql = supabase.schemaMissing ? schemaSql() : "";
  const ready = supabase.state === "ok";

  return (
    <div className="appx">
      <div className="appx-glow" aria-hidden="true" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-12">
      <div className="space-y-3">
        <Link href="/" className="brand">
          {APP_NAME}
        </Link>
        <h1 className="display-2">Installation</h1>
        <p className="max-w-2xl text-lg text-stone-600">
          Cinq branchements, dans l&apos;ordre. Seul le premier est obligatoire pour ouvrir un compte ; les autres
          s&apos;ajoutent quand vous voulez.
        </p>
      </div>

      <Notice params={params} />

      {!local && (
        <p className="notice-info">
          Site en ligne : les clés se règlent dans les variables d&apos;environnement de votre hébergeur (noms indiqués
          sous chaque étape), puis redéployez.
        </p>
      )}

      {ready && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium">La base est prête : vous pouvez créer votre compte.</p>
          <Link href="/inscription" className="btn btn-primary">
            Créer mon compte
          </Link>
        </div>
      )}

      <StepCard id="supabase" n={1} title="Supabase : comptes et base de données" state={supabase.state} detail={supabase.detail}>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-600">
          <li>
            Créez un projet gratuit sur{" "}
            <a className="link" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
              supabase.com
            </a>
            , région Europe.
          </li>
          <li>Ouvrez Project Settings, puis API : l&apos;adresse du projet et les deux clés s&apos;y trouvent.</li>
        </ol>
        {local ? (
          <form action={saveKeysAction} className="space-y-3">
            <input type="hidden" name="section" value="supabase" />
            <Field name="SUPABASE_URL" label="Adresse du projet (Project URL)" placeholder="https://abcdefgh.supabase.co" type="url" />
            <Field name="SUPABASE_ANON_KEY" label="Clé publique (anon ou publishable)" />
            <Field name="SUPABASE_SERVICE_ROLE_KEY" label="Clé secrète (service_role ou secret)" />
            <SubmitButton>Enregistrer et tester</SubmitButton>
          </form>
        ) : (
          <p className="hint">Variables : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY</p>
        )}
        {supabase.schemaMissing && (
          <div className="space-y-3 rounded-2xl border border-stone-200 p-4">
            <p className="font-medium">Créer les tables</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-600">
              <li>Copiez le script.</li>
              <li>Ouvrez l&apos;éditeur SQL de votre projet, collez, cliquez sur Run.</li>
              <li>Revenez ici et cliquez sur Revérifier.</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={sql} label="Copier le script SQL" className="btn btn-primary" />
              {supabase.sqlEditorUrl && (
                <a className="btn btn-secondary" href={supabase.sqlEditorUrl} target="_blank" rel="noreferrer">
                  Ouvrir l&apos;éditeur SQL
                </a>
              )}
              <Link className="btn btn-secondary" href="/installation#supabase">
                Revérifier
              </Link>
            </div>
            <textarea className="input h-40 font-mono text-xs" readOnly value={sql} aria-label="Script SQL du schéma" />
          </div>
        )}
      </StepCard>

      <StepCard id="stripe" n={2} title="Stripe : abonnements" state={stripe.state} detail={stripe.detail}>
        {local ? (
          <>
            {!stripe.keyPresent && (
              <form action={saveKeysAction} className="space-y-3">
                <input type="hidden" name="section" value="stripe" />
                <p className="text-sm text-stone-600">
                  Dans Stripe, restez en mode test : Développeurs, Clés API, puis copiez la clé secrète.
                </p>
                <Field name="STRIPE_SECRET_KEY" label="Clé secrète Stripe" placeholder="sk_test_…" />
                <label className="flex items-start gap-2 text-sm text-stone-600">
                  <input type="checkbox" name="live_ok" className="mt-1" />
                  <span>J&apos;utilise volontairement une clé réelle (sk_live_) : de vrais paiements seront encaissés.</span>
                </label>
                <SubmitButton>Enregistrer la clé</SubmitButton>
              </form>
            )}
            {stripe.keyPresent && (
              <form action={stripeCatalogAction} className="space-y-2">
                <SubmitButton className={stripe.catalogReady ? "btn btn-secondary" : "btn btn-primary"}>
                  {stripe.catalogReady ? "Revérifier les formules dans Stripe" : "Créer les 3 formules dans Stripe"}
                </SubmitButton>
                <p className="hint">
                  Crée Essentiel (19 €), Pro (39 €), Multi (79 €) et la page de gestion d&apos;abonnement. Rien n&apos;est
                  créé deux fois.
                </p>
              </form>
            )}
          </>
        ) : (
          <p className="hint">
            Variables : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ESSENTIEL, STRIPE_PRICE_PRO,
            STRIPE_PRICE_MULTI, STRIPE_PORTAL_CONFIG. Webhook à pointer vers {siteUrl()}/api/stripe/webhook
          </p>
        )}
      </StepCard>

      <StepCard id="ia" n={3} title="IA : rédaction des réponses" state={ai.state} detail={ai.detail}>
        {local ? (
          <form action={saveKeysAction} className="space-y-3">
            <input type="hidden" name="section" value="ia" />
            <Field name="ANTHROPIC_API_KEY" label="Clé API Anthropic" placeholder="sk-ant-…" />
            <SubmitButton className="btn btn-secondary">Enregistrer</SubmitButton>
          </form>
        ) : (
          <p className="hint">Variable : ANTHROPIC_API_KEY</p>
        )}
      </StepCard>

      <StepCard id="emails" n={4} title="Resend : e-mails" state={email.state} detail={email.detail}>
        {local ? (
          <form action={saveKeysAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="section" value="emails" />
            <Field name="RESEND_API_KEY" label="Clé API Resend" placeholder="re_…" />
            <Field name="EMAIL_FROM" label="Adresse d'expédition" placeholder="avis@votredomaine.fr" type="email" />
            <div className="sm:col-span-2">
              <SubmitButton className="btn btn-secondary">Enregistrer</SubmitButton>
            </div>
          </form>
        ) : (
          <p className="hint">Variables : RESEND_API_KEY, EMAIL_FROM</p>
        )}
      </StepCard>

      <StepCard id="google" n={5} title="Google Business Profile" state={google.state} detail={google.detail}>
        <p className="text-sm text-stone-600">
          Adresse de redirection à déclarer dans Google Cloud :{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">{siteUrl()}/api/google/callback</code>
        </p>
        {local ? (
          <form action={saveKeysAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="section" value="google" />
            <Field name="GOOGLE_CLIENT_ID" label="Identifiant client OAuth" type="text" />
            <Field name="GOOGLE_CLIENT_SECRET" label="Secret client OAuth" />
            <div className="sm:col-span-2">
              <SubmitButton className="btn btn-secondary">Enregistrer</SubmitButton>
            </div>
          </form>
        ) : (
          <p className="hint">Variables : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY, CRON_SECRET</p>
        )}
      </StepCard>

      <StepCard id="twilio" n={6} title="Twilio : SMS et WhatsApp (facultatif)" state={twilio.state} detail={twilio.detail}>
        {local ? (
          <form action={saveKeysAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="section" value="twilio" />
            <Field name="TWILIO_ACCOUNT_SID" label="Account SID" placeholder="AC…" type="text" />
            <Field name="TWILIO_AUTH_TOKEN" label="Auth Token" />
            <Field name="TWILIO_SMS_FROM" label="Numéro d'envoi SMS" placeholder="+33…" type="text" />
            <Field name="TWILIO_WHATSAPP_FROM" label="Numéro WhatsApp Twilio" placeholder="+14155238886" type="text" />
            <p className="hint sm:col-span-2">
              Pour WhatsApp, commencez avec le « sandbox » de Twilio. En production, Meta impose un modèle de message
              validé pour les messages envoyés en premier.
            </p>
            <div className="sm:col-span-2">
              <SubmitButton className="btn btn-secondary">Enregistrer</SubmitButton>
            </div>
          </form>
        ) : (
          <p className="hint">Variables : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM, TWILIO_WHATSAPP_FROM</p>
        )}
      </StepCard>

      {local && (
        <p className="hint">
          Les clés sont enregistrées dans le fichier .env.local du dossier du projet, sur cet ordinateur uniquement.
          Elles ne sont jamais réaffichées ici.
        </p>
      )}
    </main>
    </div>
  );
}
