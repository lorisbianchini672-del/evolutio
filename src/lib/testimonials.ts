// Témoignages de vrais clients, affichés sur la landing.
// La section reste masquée tant que la liste est vide : n'ajoutez que des propos réels,
// avec l'accord écrit du client (prénom, métier, ville, et chiffres vérifiables).

export type Testimonial = {
  quote: string;
  name: string; // prénom et initiale, ex. « Karim B. »
  business: string; // ex. « Garage du Parc, Villeurbanne »
  before?: number; // note Google avant Evolutio
  after?: number; // note Google aujourd'hui
};

export const TESTIMONIALS: Testimonial[] = [];
