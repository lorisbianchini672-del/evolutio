import type { PlaceDetails, PlaceSummary } from "./places";

// Audit d'une fiche Google à partir de ses données publiques. Fonction pure, testée dans tests/.
// Les poids sont un choix d'Evolutio, affiché comme tel : ce n'est pas l'algorithme de Google.

export type AuditItem = { id: string; label: string; ok: boolean; points: number; max: number; advice: string };
export type Audit = { score: number; items: AuditItem[]; medianReviews: number | null; rank: number | null };

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function auditPlace(place: PlaceDetails, competitors: PlaceSummary[] = []): Audit {
  const med = median(competitors.map((c) => c.reviewCount));
  const rating = place.rating ?? 0;
  const ratingPts = rating >= 4.7 ? 25 : rating >= 4.5 ? 21 : rating >= 4.2 ? 16 : rating >= 4 ? 11 : rating > 0 ? 5 : 0;
  const volumeRatio = med ? place.reviewCount / med : place.reviewCount >= 100 ? 1.2 : place.reviewCount / 100;
  const volumePts = Math.round(Math.min(1, volumeRatio) * 25);

  const items: AuditItem[] = [
    {
      id: "note",
      label: place.rating ? `Note ${place.rating.toFixed(1).replace(".", ",")} / 5` : "Aucune note",
      ok: rating >= 4.5,
      points: ratingPts,
      max: 25,
      advice: "Répondez à chaque avis négatif et demandez un avis à chaque client satisfait comme mécontent : la note remonte avec le volume.",
    },
    {
      id: "volume",
      label: med !== null ? `${place.reviewCount} avis (médiane du quartier : ${med})` : `${place.reviewCount} avis`,
      ok: volumePts >= 20,
      points: volumePts,
      max: 25,
      advice: "Posez le QR code en caisse et envoyez une demande d'avis après chaque prestation.",
    },
    {
      id: "horaires",
      label: place.hasHours ? "Horaires renseignés" : "Horaires absents",
      ok: place.hasHours,
      points: place.hasHours ? 10 : 0,
      max: 10,
      advice: "Ajoutez vos horaires : Google montre moins une fiche dont on ne sait pas si elle est ouverte.",
    },
    {
      id: "site",
      label: place.website ? "Site web relié" : "Pas de site web",
      ok: Boolean(place.website),
      points: place.website ? 10 : 0,
      max: 10,
      advice: "Reliez un site, même une page simple : c'est un signal de sérieux pour Google et pour les clients.",
    },
    {
      id: "telephone",
      label: place.phone ? "Téléphone affiché" : "Pas de téléphone",
      ok: Boolean(place.phone),
      points: place.phone ? 10 : 0,
      max: 10,
      advice: "Affichez un numéro : beaucoup de clients appellent directement depuis Google Maps.",
    },
    {
      id: "photos",
      label: place.photoCount >= 10 ? "Au moins 10 photos" : `${place.photoCount} photo${place.photoCount > 1 ? "s" : ""}`,
      ok: place.photoCount >= 10,
      points: Math.round((Math.min(place.photoCount, 10) / 10) * 15),
      max: 15,
      advice: "Ajoutez des photos récentes : devanture, intérieur, produits, équipe.",
    },
    {
      id: "statut",
      label: place.open ? "Fiche active" : "Fiche signalée fermée",
      ok: place.open,
      points: place.open ? 5 : 0,
      max: 5,
      advice: "Vérifiez le statut de la fiche dans Google Business Profile.",
    },
  ];
  const all = [place as PlaceSummary, ...competitors].filter((p) => p.rating !== null);
  const sorted = [...all].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount);
  const rank = competitors.length ? sorted.findIndex((p) => p.id === place.id) + 1 || null : null;
  return { score: items.reduce((s, i) => s + i.points, 0), items, medianReviews: med, rank };
}
