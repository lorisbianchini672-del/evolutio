import Link from "next/link";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { TRIAL_DAYS } from "@/lib/config";
import { signUpAction } from "../actions";

export const metadata = { title: "Créer un compte" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">Créer un compte</h1>
        <p className="mt-1 text-sm text-stone-600">
          {TRIAL_DAYS} jours d&apos;essai, sans carte bancaire.
        </p>
      </div>
      <Notice params={params} />
      <form action={signUpAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            E-mail professionnel
          </label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Mot de passe
          </label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="hint">8 caractères au minimum.</p>
        </div>
        <SubmitButton className="btn btn-primary w-full">Créer mon compte</SubmitButton>
      </form>
      <p className="text-center text-sm text-stone-600">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="link">
          Se connecter
        </Link>
      </p>
    </>
  );
}
