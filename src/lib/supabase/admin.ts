import { ensureLocalEnv } from "../local-env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: { key: string; client: SupabaseClient } | null = null;

/**
 * Client serveur avec la clé service_role : il contourne les règles RLS.
 * À n'utiliser que dans du code serveur, après avoir vérifié qui fait la demande.
 */
export function createAdminClient(): SupabaseClient {
  ensureLocalEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Base de données non connectée : renseignez Supabase dans l'assistant d'installation.");
  }
  const id = `${url}|${key}`;
  if (cached?.key !== id) {
    cached = { key: id, client: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) };
  }
  return cached.client;
}
