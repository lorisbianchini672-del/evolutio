import Link from "next/link";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { signInAction } from "../actions";

export const metadata = { title: "Connexion" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <h1 className="text-xl font-semibold">Connexion</h1>
      <Notice params={params} />
      <form action={signInAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            E-mail
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
            autoComplete="current-password"
            required
          />
        </div>
        <SubmitButton className="btn btn-primary w-full">Se connecter</SubmitButton>
      </form>
      <div className="flex justify-between text-sm text-stone-600">
        <Link href="/mot-de-passe" className="underline">
          Mot de passe oublié
        </Link>
        <Link href="/inscription" className="link">
          Créer un compte
        </Link>
      </div>
    </>
  );
}
