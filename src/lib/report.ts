import type { Insights } from "./prompt";

// Rapport du mois : calculs purs (testés dans tests/), puis chargement des données.

export type ReportReview = { rating: number; review_created_at: string; status: string; is_demo?: boolean };
export type ReportEvent = { kind: string; created_at: string };

export type MonthlyReport = {
  label: string;
  start: string;
  end: string;
  partial: boolean;
  received: number;
  average: number | null;
  previousAverage: number | null;
  overallAverage: number | null;
  totalReviews: number;
  answered: number;
  responseRate: number | null;
  low: number;
  visits: number;
  googleClicks: number;
  requests: number;
  sinceJoin: { reviews: number; averageBefore: number | null; averageNow: number | null };
  insights: Insights | null;
};

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Bornes d'un mois : offset 0 = mois en cours, 1 = mois précédent. */
export function monthBounds(offset: number, now = new Date()): { start: Date; end: Date; label: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return { start, end, label: `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}` };
}

function avg(values: number[]): number | null {
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
}

function within(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function computeReport(input: {
  reviews: ReportReview[];
  events: ReportEvent[];
  requests: { sent_at: string }[];
  joinedAt: string;
  insights: Insights | null;
  offset: number;
  now?: Date;
}): MonthlyReport {
  const now = input.now ?? new Date();
  const { start, end, label } = monthBounds(input.offset, now);
  const prev = monthBounds(input.offset + 1, now);
  const real = input.reviews.filter((r) => !r.is_demo);
  const reviews = real.length ? real : input.reviews;

  const month = reviews.filter((r) => within(r.review_created_at, start, end));
  const upToEnd = reviews.filter((r) => new Date(r.review_created_at).getTime() < end.getTime());
  const joined = new Date(input.joinedAt).getTime();
  const before = reviews.filter((r) => new Date(r.review_created_at).getTime() < joined);
  const after = upToEnd.filter((r) => new Date(r.review_created_at).getTime() >= joined);
  const answered = month.filter((r) => r.status === "published").length;

  return {
    label,
    start: start.toISOString(),
    end: end.toISOString(),
    partial: input.offset === 0,
    received: month.length,
    average: avg(month.map((r) => r.rating)),
    previousAverage: avg(reviews.filter((r) => within(r.review_created_at, prev.start, prev.end)).map((r) => r.rating)),
    overallAverage: avg(upToEnd.map((r) => r.rating)),
    totalReviews: upToEnd.length,
    answered,
    responseRate: month.length ? Math.round((answered / month.length) * 100) : null,
    low: month.filter((r) => r.rating <= 3).length,
    visits: input.events.filter((e) => e.kind === "visit" && within(e.created_at, start, end)).length,
    googleClicks: input.events.filter((e) => e.kind === "google_click" && within(e.created_at, start, end)).length,
    requests: input.requests.filter((q) => within(q.sent_at, start, end)).length,
    sinceJoin: { reviews: after.length, averageBefore: avg(before.map((r) => r.rating)), averageNow: avg(upToEnd.map((r) => r.rating)) },
    insights: input.insights,
  };
}

export function formatRating(value: number | null): string {
  return value === null ? "–" : value.toFixed(1).replace(".", ",");
}

/** Écart de note lisible : « +0,3 », « −0,2 » ou « stable ». */
export function ratingDelta(now: number | null, before: number | null): string | null {
  if (now === null || before === null) return null;
  const d = Math.round((now - before) * 10) / 10;
  if (d === 0) return "stable";
  return `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1).replace(".", ",")}`;
}

type Db = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/** Charge les données d'un compte et calcule son rapport. `db` est le client admin. */
export async function loadReport(
  db: Db,
  account: { id: string; created_at: string; insights: Insights | null },
  offset: number,
): Promise<MonthlyReport> {
  const since = monthBounds(offset + 1).start.toISOString();
  const [{ data: reviews }, { data: events }, { data: requests }] = await Promise.all([
    db.from("reviews").select("rating, review_created_at, status, is_demo").eq("user_id", account.id).limit(5000),
    db.from("collect_events").select("kind, created_at").eq("user_id", account.id).gte("created_at", since).limit(20000),
    db.from("review_requests").select("sent_at").eq("user_id", account.id).gte("sent_at", since).limit(5000),
  ]);
  return computeReport({
    reviews: (reviews ?? []) as ReportReview[],
    events: (events ?? []) as ReportEvent[],
    requests: (requests ?? []) as { sent_at: string }[],
    joinedAt: account.created_at,
    insights: account.insights,
    offset,
  });
}
