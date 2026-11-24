import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Mode local : l'application tourne sur l'ordinateur du créateur (npm run dev ou demarrer.sh).
// Les clés saisies dans l'assistant /installation sont écrites dans .env.local et relues sans redémarrage.
// En ligne (Vercel ou autre), ce module ne fait rien : les clés viennent des variables d'environnement.

export function isLocalMode(): boolean {
  return process.env.EVOLUTIO_LOCAL === "1" && !process.env.VERCEL;
}

export function envFilePath(): string {
  return process.env.EVOLUTIO_ENV_FILE || path.join(/*turbopackIgnore: true*/ process.cwd(), ".env.local");
}

function parse(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (/^[A-Z][A-Z0-9_]*$/.test(key)) out[key] = value;
  }
  return out;
}

let loadedMtime = -1;
let secretsChecked = false;

/** Relit .env.local s'il a changé. À appeler au début de chaque requête ; ne coûte qu'un stat de fichier. */
export function ensureLocalEnv(): void {
  if (!isLocalMode()) return;
  const file = envFilePath();
  try {
    const mtime = fs.statSync(/*turbopackIgnore: true*/ file).mtimeMs;
    if (mtime !== loadedMtime) {
      loadedMtime = mtime;
      for (const [key, value] of Object.entries(parse(fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8")))) {
        if (value) process.env[key] = value;
      }
    }
  } catch {
    // Pas encore de fichier : il sera créé juste en dessous ou par l'assistant.
  }
  if (!secretsChecked) {
    secretsChecked = true;
    // Secrets internes générés une fois pour toutes, pour que l'utilisateur n'ait rien à inventer.
    const missing: Record<string, string> = {};
    if (!process.env.TOKEN_ENCRYPTION_KEY) missing.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    if (!process.env.CRON_SECRET) missing.CRON_SECRET = randomBytes(24).toString("hex");
    if (!process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN) {
      missing.GOOGLE_PUBSUB_VERIFICATION_TOKEN = randomBytes(24).toString("hex");
    }
    if (Object.keys(missing).length) {
      try {
        writeLocalEnv(missing);
      } catch (err) {
        console.error("[local-env] écriture impossible :", err instanceof Error ? err.message : err);
      }
    }
  }
}

/** Ajoute ou remplace des clés dans .env.local (fichier lisible par le seul utilisateur) et les applique tout de suite. */
export function writeLocalEnv(updates: Record<string, string>): void {
  if (!isLocalMode()) throw new Error("L'écriture des réglages n'est possible qu'en mode local.");
  const file = envFilePath();
  let lines: string[] = [];
  try {
    lines = fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8").split(/\r?\n/);
  } catch {
    lines = ["# Réglages d'Evolutio. Fichier privé : ne le partagez pas et ne le publiez pas."];
  }
  const pending = new Map(
    Object.entries(updates)
      .map(([k, v]) => [k, v.replace(/[\r\n]/g, "").trim()] as const)
      .filter(([k, v]) => /^[A-Z][A-Z0-9_]*$/.test(k) && v),
  );
  const next = lines.map((line) => {
    const eq = line.indexOf("=");
    const key = eq > 0 ? line.slice(0, eq).trim() : "";
    if (pending.has(key)) {
      const value = pending.get(key) as string;
      pending.delete(key);
      return `${key}=${value}`;
    }
    return line;
  });
  while (next.length && next[next.length - 1] === "") next.pop();
  for (const [key, value] of pending) next.push(`${key}=${value}`);
  fs.writeFileSync(/*turbopackIgnore: true*/ file, next.join("\n") + "\n", { mode: 0o600 });
  for (const [key, value] of Object.entries(updates)) {
    const clean = value.replace(/[\r\n]/g, "").trim();
    if (clean) process.env[key] = clean;
  }
  try {
    loadedMtime = fs.statSync(/*turbopackIgnore: true*/ file).mtimeMs;
  } catch {
    loadedMtime = -1;
  }
}
