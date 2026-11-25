import { siteUrl } from "./config";
import type { GoogleReview } from "./google-map";

// Appels à Google Business Profile. Tout passe par fetch, sans SDK.
// Ces appels n'ont pas pu être exécutés contre Google avant l'approbation de l'accès API :
// les chemins suivent la documentation officielle, à valider avec le premier compte connecté.

export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/business.manage";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function clientId(): string {
  const v = process.env.GOOGLE_CLIENT_ID;
  if (!v) throw new Error("GOOGLE_CLIENT_ID manquante");
  return v;
}
function clientSecret(): string {
  const v = process.env.GOOGLE_CLIENT_SECRET;
  if (!v) throw new Error("GOOGLE_CLIENT_SECRET manquante");
  return v;
}

export function redirectUri(): string {
  return `${siteUrl()}/api/google/callback`;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: `openid email ${GOOGLE_SCOPE}`,
    access_type: "offline", // nécessaire pour recevoir un jeton de rafraîchissement
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export class GoogleApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), ...body }),
  });
  const json = (await res.json()) as Record<string, string | undefined>;
  if (!res.ok) {
    throw new GoogleApiError(res.status, json.error_description || json.error || "Erreur OAuth Google");
  }
  return json;
}

export async function exchangeCode(code: string) {
  const json = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  return {
    accessToken: json.access_token as string,
    refreshToken: json.refresh_token ?? null,
    idToken: json.id_token ?? null,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const json = await tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
  return json.access_token as string;
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }).catch(() => undefined);
}

/** Adresse e-mail du compte Google, lue dans le jeton d'identité (sert seulement à l'affichage). */
export function emailFromIdToken(idToken: string | null): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

async function api<T>(accessToken: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    const hint =
      res.status === 429
        ? " (quota à 0 : l'accès à l'API Business Profile n'est pas encore approuvé pour ce projet Google Cloud)"
        : "";
    throw new GoogleApiError(res.status, `Google ${res.status}${hint} : ${text.slice(0, 300)}`);
  }
  return (res.status === 204 ? {} : await res.json()) as T;
}

export type GoogleAccount = { name: string; accountName?: string; type?: string };
export type GoogleLocation = {
  name: string; // locations/{id}
  title?: string;
  metadata?: { placeId?: string; newReviewUri?: string; mapsUri?: string };
};

export async function listAccounts(accessToken: string): Promise<GoogleAccount[]> {
  const json = await api<{ accounts?: GoogleAccount[] }>(
    accessToken,
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
  );
  return json.accounts ?? [];
}

export async function listLocations(accessToken: string, accountName: string): Promise<GoogleLocation[]> {
  const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`);
  url.searchParams.set("readMask", "name,title,metadata");
  url.searchParams.set("pageSize", "100");
  const json = await api<{ locations?: GoogleLocation[] }>(accessToken, url.toString());
  return json.locations ?? [];
}

/** Dernière page d'avis d'un établissement, du plus récent au plus ancien. */
export async function listReviews(
  accessToken: string,
  accountName: string,
  locationName: string,
): Promise<GoogleReview[]> {
  const url = new URL(`https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews`);
  url.searchParams.set("pageSize", "50");
  url.searchParams.set("orderBy", "updateTime desc");
  const json = await api<{ reviews?: GoogleReview[] }>(accessToken, url.toString());
  return json.reviews ?? [];
}

export async function publishReply(accessToken: string, reviewName: string, comment: string): Promise<void> {
  await api(accessToken, `https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
    method: "PUT",
    body: JSON.stringify({ comment }),
  });
}

/** Demande à Google de prévenir notre sujet Pub/Sub à chaque nouvel avis de ce compte. */
export async function enableReviewNotifications(accessToken: string, accountName: string): Promise<void> {
  const topic = process.env.GOOGLE_PUBSUB_TOPIC;
  if (!topic) return;
  const name = `${accountName}/notificationSetting`;
  await api(
    accessToken,
    `https://mybusinessnotifications.googleapis.com/v1/${name}?updateMask=pubsubTopic,notificationTypes`,
    {
      method: "PATCH",
      body: JSON.stringify({ name, pubsubTopic: topic, notificationTypes: ["NEW_REVIEW", "UPDATED_REVIEW"] }),
    },
  );
}

// ---- Statistiques de la fiche (API Business Profile Performance) -------------------------------

export type PerformanceTotals = { calls: number; directions: number; website: number; views: number };

const PERF_METRICS = {
  calls: ["CALL_CLICKS"],
  directions: ["BUSINESS_DIRECTION_REQUESTS"],
  website: ["WEBSITE_CLICKS"],
  views: [
    "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
    "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
    "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
    "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  ],
} as const;

type PerfResponse = {
  multiDailyMetricTimeSeries?: {
    dailyMetricTimeSeries?: { dailyMetric?: string; timeSeries?: { datedValues?: { value?: string }[] } }[];
  }[];
};

/** Appels, itinéraires, clics vers le site et vues de la fiche entre deux dates (incluses). */
export async function fetchPerformance(
  accessToken: string,
  locationName: string,
  start: Date,
  end: Date,
): Promise<PerformanceTotals> {
  const url = new URL(`https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries`);
  for (const list of Object.values(PERF_METRICS)) for (const m of list) url.searchParams.append("dailyMetrics", m);
  const set = (prefix: string, d: Date) => {
    url.searchParams.set(`dailyRange.${prefix}.year`, String(d.getUTCFullYear()));
    url.searchParams.set(`dailyRange.${prefix}.month`, String(d.getUTCMonth() + 1));
    url.searchParams.set(`dailyRange.${prefix}.day`, String(d.getUTCDate()));
  };
  set("start_date", start);
  set("end_date", end);
  const json = await api<PerfResponse>(accessToken, url.toString());
  const sums = new Map<string, number>();
  for (const group of json.multiDailyMetricTimeSeries ?? []) {
    for (const series of group.dailyMetricTimeSeries ?? []) {
      const total = (series.timeSeries?.datedValues ?? []).reduce((s, v) => s + Number(v.value ?? 0), 0);
      sums.set(series.dailyMetric ?? "", (sums.get(series.dailyMetric ?? "") ?? 0) + total);
    }
  }
  const sum = (list: readonly string[]) => list.reduce((s, m) => s + (sums.get(m) ?? 0), 0);
  return {
    calls: sum(PERF_METRICS.calls),
    directions: sum(PERF_METRICS.directions),
    website: sum(PERF_METRICS.website),
    views: sum(PERF_METRICS.views),
  };
}

// ---- Publications Google (« Nouveautés ») ----------------------------------------------------

export async function createLocalPost(
  accessToken: string,
  accountName: string,
  locationName: string,
  summary: string,
): Promise<string | null> {
  const json = await api<{ name?: string }>(
    accessToken,
    `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/localPosts`,
    { method: "POST", body: JSON.stringify({ languageCode: "fr", summary: summary.slice(0, 1500), topicType: "STANDARD" }) },
  );
  return json.name ?? null;
}
