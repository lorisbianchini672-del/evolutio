import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ensureLocalEnv } from "@/lib/local-env";

// Rafraîchit la session Supabase à chaque requête et protège l'espace connecté (/app).
export async function proxy(request: NextRequest) {
  ensureLocalEnv();
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const to = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    return NextResponse.redirect(url);
  };

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Base pas encore connectée : tout ce qui demande un compte renvoie vers l'assistant.
    return path === "/installation" ? response : to("/installation");
  }
  if (path === "/installation") return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && path.startsWith("/app")) return to("/connexion");
  if (user && (path === "/connexion" || path === "/inscription")) return to("/app");
  return response;
}

export const config = {
  matcher: ["/app/:path*", "/connexion", "/inscription", "/mot-de-passe", "/installation"],
};
