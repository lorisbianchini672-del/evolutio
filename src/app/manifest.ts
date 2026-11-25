import type { MetadataRoute } from "next";

// Permet d'installer Evolutio sur l'écran d'accueil du téléphone, comme une application.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Evolutio",
    short_name: "Evolutio",
    description: "Vos avis Google, réponses prêtes à publier.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#060608",
    theme_color: "#060608",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Répondre aux avis", url: "/app/rapide", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
}
