import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Arrivée depuis le lien de confirmation d'inscription ou de réinitialisation de mot de passe.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/app";
  // On n'accepte qu'un chemin interne, pour ne pas servir de relais vers un autre site.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  const message = encodeURIComponent("Lien invalide ou expiré. Reconnectez-vous ou redemandez un lien.");
  return NextResponse.redirect(`${origin}/connexion?erreur=${message}`);
}
