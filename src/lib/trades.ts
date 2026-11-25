import type { Sector } from "./config";

// Pages métier (/pour/garages, /pour/restaurants…) : même produit, discours et exemples du métier.
// Les avis et réponses ci-dessous sont des exemples rédigés pour illustrer, présentés comme tels.

export type TradeExample = { name: string; rating: number; review: string; reply: string };

export type Trade = {
  slug: string;
  sector: Sector;
  plural: string;
  headline: [string, string];
  lead: string;
  pains: { title: string; text: string }[];
  examples: TradeExample[];
};

export const TRADES: Trade[] = [
  {
    slug: "garages",
    sector: "garage",
    plural: "garages et loueurs",
    headline: ["Vos clients jugent", "l'atelier sur Google."],
    lead: "Devis, délais, restitution du véhicule : Evolutio répond à chaque avis comme un chef d'atelier, sans jamais reconnaître de responsabilité en public.",
    pains: [
      { title: "Le devis dépassé", text: "La réponse reconnaît la gêne et propose de reprendre le dossier, sans chiffre lâché en public." },
      { title: "Le véhicule en retard", text: "Excuses sincères, explication sobre, invitation à appeler l'atelier. Le client suivant lit un garage sérieux." },
      { title: "La location qui finit mal", text: "Franchise, caution, frais : rien n'est débattu en public. On propose d'en parler avec l'agence." },
    ],
    examples: [
      {
        name: "Karim",
        rating: 2,
        review: "Devis à 380 €, facture à 520 € sans qu'on m'appelle avant. Pas très honnête.",
        reply: "Bonjour Karim, merci pour votre retour. Un écart entre devis et facture doit toujours être validé avec vous avant l'intervention, et nous comprenons votre agacement. Notre chef d'atelier souhaite reprendre le dossier avec vous : appelez-nous au garage.",
      },
      {
        name: "Sophie",
        rating: 5,
        review: "Prise en charge rapide, voiture prête le soir même. Merci à l'équipe !",
        reply: "Bonjour Sophie, merci beaucoup ! Ravis d'avoir pu vous rendre votre véhicule le jour même. À bientôt à l'atelier.",
      },
      {
        name: "Julien",
        rating: 1,
        review: "Utilitaire loué avec une rayure déjà présente, et on me retient 300 € de franchise.",
        reply: "Bonjour Julien, merci de nous avoir écrit. Nous comprenons que cette retenue vous paraisse injuste et souhaitons regarder le dossier avec vous, photos de l'état des lieux à l'appui. Contactez directement l'agence pour en parler.",
      },
    ],
  },
  {
    slug: "restaurants",
    sector: "restaurant",
    plural: "restaurants",
    headline: ["Le service continue", "sur Google."],
    lead: "Attente, plat froid, soirée réussie : chaque avis reçoit une réponse qui donne envie de réserver, rédigée dans le ton de votre maison.",
    pains: [
      { title: "Le coup de feu du samedi", text: "L'attente est reconnue, sans se justifier. Le lecteur voit une équipe qui écoute." },
      { title: "Le plat raté", text: "Excuses précises, invitation à revenir en parler. Aucun débat sur la cuisine en public." },
      { title: "Les avis en anglais", text: "Evolutio répond dans la langue du client, automatiquement." },
    ],
    examples: [
      {
        name: "Claire",
        rating: 3,
        review: "Très bons plats mais 50 minutes d'attente entre l'entrée et le plat.",
        reply: "Bonjour Claire, merci pour votre retour et ravis que les plats vous aient plu. Cinquante minutes, c'est trop long : nous en parlons en équipe. Écrivez-nous si vous souhaitez en discuter, et à bientôt pour une soirée plus fluide.",
      },
      {
        name: "Tom",
        rating: 5,
        review: "Best burger in Lyon, friendly staff!",
        reply: "Hi Tom, thank you so much! We're delighted you enjoyed the burger and the team's welcome. See you next time in Lyon!",
      },
      {
        name: "Amélie",
        rating: 1,
        review: "Réservation pour 8 introuvable en arrivant. Soirée d'anniversaire gâchée.",
        reply: "Bonjour Amélie, nous sommes sincèrement désolés pour cette soirée d'anniversaire gâchée. Une réservation perdue ne devrait jamais arriver et nous voulons comprendre ce qui s'est passé : contactez-nous directement pour en parler.",
      },
    ],
  },
  {
    slug: "boulangeries",
    sector: "boulangerie",
    plural: "boulangeries",
    headline: ["Du pain chaud", "et des réponses fraîches."],
    lead: "Vos clients passent tous les jours. Evolutio répond à leurs avis avec la même chaleur qu'au comptoir, et vous aide à en récolter de nouveaux grâce au QR code en caisse.",
    pains: [
      { title: "La commande oubliée", text: "Une excuse sincère et l'invitation à en parler, sans geste commercial annoncé en public." },
      { title: "La file du dimanche", text: "La réponse reconnaît l'attente et montre que l'équipe s'organise." },
      { title: "Le QR code en caisse", text: "Une affiche prête à imprimer : vos habitués laissent leur avis en dix secondes." },
    ],
    examples: [
      {
        name: "Nadia",
        rating: 2,
        review: "Gâteau commandé pour samedi, pas prêt à l'heure. Très déçue.",
        reply: "Bonjour Nadia, nous sommes vraiment désolés pour ce gâteau qui n'était pas prêt à temps. Ce n'est pas le service que nous voulons vous offrir. Passez nous voir ou appelez la boutique, nous aimerions en parler avec vous.",
      },
      {
        name: "Léa",
        rating: 5,
        review: "Le meilleur croissant du quartier, et toujours un sourire.",
        reply: "Bonjour Léa, quel beau compliment, merci ! Nous transmettons le sourire à toute l'équipe. À très vite pour le prochain croissant.",
      },
      {
        name: "Paul",
        rating: 4,
        review: "Excellent pain mais beaucoup d'attente le dimanche matin.",
        reply: "Bonjour Paul, merci pour votre retour ! Le dimanche matin est notre moment le plus chargé, nous renforçons l'équipe pour fluidifier la file. À bientôt.",
      },
    ],
  },
  {
    slug: "coiffeurs",
    sector: "coiffure",
    plural: "salons de coiffure",
    headline: ["Une belle coupe", "mérite une belle réponse."],
    lead: "Couleur ratée, coupe adorée, retard au rendez-vous : Evolutio répond avec le ton de votre salon, et invite à revenir en parler plutôt que de débattre en public.",
    pains: [
      { title: "Le résultat qui déçoit", text: "On propose de revoir la cliente au salon, sans promettre de retouche gratuite en public." },
      { title: "Le retard au rendez-vous", text: "Excuse simple, explication sobre : le lecteur voit un salon attentif." },
      { title: "Les compliments", text: "Une réponse chaleureuse qui cite la coiffeuse et donne envie de réserver." },
    ],
    examples: [
      {
        name: "Inès",
        rating: 2,
        review: "Couleur beaucoup plus foncée que ce que j'avais demandé.",
        reply: "Bonjour Inès, merci de nous l'avoir dit. Nous sommes désolés que la couleur ne corresponde pas à ce que vous attendiez. Nous aimerions vous revoir au salon pour en parler et trouver la bonne solution ensemble.",
      },
      {
        name: "Mehdi",
        rating: 5,
        review: "Coupe parfaite comme toujours, merci !",
        reply: "Bonjour Mehdi, merci pour votre fidélité et ce beau retour ! À très bientôt au salon.",
      },
      {
        name: "Julie",
        rating: 3,
        review: "Bonne coupe mais 25 minutes de retard sur mon rendez-vous.",
        reply: "Bonjour Julie, merci pour votre avis et ravis que la coupe vous plaise. Vingt-cinq minutes de retard, ce n'est pas normal : nous revoyons notre planning pour que cela ne se reproduise pas. À bientôt.",
      },
    ],
  },
];

export function tradeBySlug(slug: string): Trade | undefined {
  return TRADES.find((t) => t.slug === slug);
}
