import { ensureLocalEnv } from "../local-env";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

/** Client Supabase lié à la session de l'utilisateur (soumis aux règles RLS). */
export async function createClient() {
  ensureLocalEnv();
  const cookieStore = await cookies();
  return createServerClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un composant serveur : l'écriture est faite par src/proxy.ts.
        }
      },
    },
  });
}
