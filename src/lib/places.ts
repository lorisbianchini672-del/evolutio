// Fiches Google publiques (API Places, version « New »), pour l'audit et le suivi des concurrents.
// Payant à l'usage côté Google : clé GOOGLE_PLACES_API_KEY à créer dans Google Cloud, avec un plafond de dépense.

export function placesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

export type PlaceSummary = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number;
  mapsUrl: string | null;
  primaryType: string | null;
  location: { latitude: number; longitude: number } | null;
};

export type PlaceDetails = PlaceSummary & {
  typeLabel: string | null;
  website: string | null;
  phone: string | null;
  hasHours: boolean;
  photoCount: number;
  description: string | null;
  open: boolean;
};

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  location?: { latitude: number; longitude: number };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  photos?: unknown[];
  editorialSummary?: { text?: string };
  businessStatus?: string;
};

const SUMMARY_FIELDS = "id,displayName,formattedAddress,rating,userRatingCount,googleMapsUri,primaryType,location";

async function call<T>(url: string, fields: string, body?: unknown): Promise<T> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("Clé Google Places absente (GOOGLE_PLACES_API_KEY).");
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": fields },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Places ${res.status} : ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

function summary(p: RawPlace): PlaceSummary {
  return {
    id: p.id ?? "",
    name: p.displayName?.text ?? "Établissement",
    address: p.formattedAddress ?? "",
    rating: typeof p.rating === "number" ? p.rating : null,
    reviewCount: p.userRatingCount ?? 0,
    mapsUrl: p.googleMapsUri ?? null,
    primaryType: p.primaryType ?? null,
    location: p.location ?? null,
  };
}

/** Recherche par nom et ville : « Boulangerie des Halles Villeurbanne ». */
export async function searchPlaces(query: string, max = 5): Promise<PlaceSummary[]> {
  const json = await call<{ places?: RawPlace[] }>(
    "https://places.googleapis.com/v1/places:searchText",
    SUMMARY_FIELDS.split(",").map((f) => `places.${f}`).join(","),
    { textQuery: query.slice(0, 120), languageCode: "fr", regionCode: "FR", maxResultCount: max },
  );
  return (json.places ?? []).map(summary).filter((p) => p.id);
}

export async function placeDetails(id: string): Promise<PlaceDetails> {
  const p = await call<RawPlace>(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=fr`,
    `${SUMMARY_FIELDS},primaryTypeDisplayName,websiteUri,nationalPhoneNumber,regularOpeningHours,photos,editorialSummary,businessStatus`,
  );
  return {
    ...summary(p),
    typeLabel: p.primaryTypeDisplayName?.text ?? null,
    website: p.websiteUri ?? null,
    phone: p.nationalPhoneNumber ?? null,
    hasHours: Boolean(p.regularOpeningHours?.weekdayDescriptions?.length),
    photoCount: p.photos?.length ?? 0,
    description: p.editorialSummary?.text ?? null,
    open: (p.businessStatus ?? "OPERATIONAL") === "OPERATIONAL",
  };
}

/** Établissements du même type autour d'une fiche (rayon en mètres). */
export async function nearbySimilar(place: PlaceSummary, radius = 1000, max = 5): Promise<PlaceSummary[]> {
  if (!place.location || !place.primaryType) return [];
  const json = await call<{ places?: RawPlace[] }>(
    "https://places.googleapis.com/v1/places:searchNearby",
    SUMMARY_FIELDS.split(",").map((f) => `places.${f}`).join(","),
    {
      includedTypes: [place.primaryType],
      maxResultCount: max + 1,
      rankPreference: "POPULARITY",
      languageCode: "fr",
      locationRestriction: { circle: { center: place.location, radius } },
    },
  );
  return (json.places ?? [])
    .map(summary)
    .filter((p) => p.id && p.id !== place.id)
    .slice(0, max);
}
