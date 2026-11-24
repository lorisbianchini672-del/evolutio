import Link from "next/link";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requestPasswordResetAction } from "../actions";

export const metadata = { title: "Mot de passe oublié" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-stone-600">
          Recevez un lien pour vous reconnecter, puis choisissez un nouveau mot de passe dans les réglages.
        </p>
      </div>
      <Notice params={params} />
      <form action={requestPasswordResetAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <SubmitButton className="btn btn-primary w-full">Envoyer le lien</SubmitButton>
      </form>
      <p className="text-center text-sm">
        <Link href="/connexion" className="underline">
          Retour à la connexion
        </Link>
      </p>
    </>
  );
}
