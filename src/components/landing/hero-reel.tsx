import { TiltedGridHero, type TiltedGridImage } from "@/components/ui/tilted-grid-hero";

// Bandeau du héros : des avis Google, chacun avec la réponse proposée par Evolutio, qui arrivent en courbe
// depuis un bord, s'aplatissent au centre puis repartent de l'autre côté.
// Les avis et les établissements affichés sont des exemples.
const REEL: TiltedGridImage[] = [
  { src: "/landing/avis-1.svg", alt: "Avis 5 étoiles d'une boulangerie et sa réponse" },
  { src: "/landing/avis-2.svg", alt: "Avis 2 étoiles d'un garage et sa réponse à valider" },
  { src: "/landing/avis-3.svg", alt: "Avis 4 étoiles d'un salon de coiffure et sa réponse" },
  { src: "/landing/avis-4.svg", alt: "Avis 5 étoiles d'un plombier et sa réponse" },
  { src: "/landing/avis-5.svg", alt: "Avis 3 étoiles d'un restaurant et sa réponse à valider" },
  { src: "/landing/avis-6.svg", alt: "Avis 1 étoile d'un institut de beauté et sa réponse prioritaire" },
  { src: "/landing/avis-7.svg", alt: "Avis 5 étoiles d'un fleuriste et sa réponse" },
  { src: "/landing/avis-8.svg", alt: "Avis 4 étoiles d'une cave à vin et sa réponse" },
];

export function HeroReel() {
  return (
    <TiltedGridHero
      images={REEL}
      speed={4}
      tileHeight={60}
      axis={50}
      curve={80}
      fade={12}
      aria-hidden="true"
      className="mt-[clamp(28px,5vw,56px)] h-[clamp(280px,36vw,460px)] w-full"
    />
  );
}

export default HeroReel;
