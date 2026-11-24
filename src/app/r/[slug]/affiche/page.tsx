import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { PrintButton } from "@/components/copy-button";
import { siteUrl } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Affiche QR code", robots: { index: false } };

// Affiche à imprimer (A5 ou A4) et à poser en caisse. Elle ne contient que des informations déjà publiques.
export default async function PosterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: location } = await createAdminClient()
    .from("locations")
    .select("title")
    .eq("slug", slug)
    .maybeSingle<{ title: string }>();
  if (!location) notFound();
  const qr = await QRCode.toDataURL(`${siteUrl()}/r/${slug}`, { width: 720, margin: 1 });

  return (
    <main className="poster-page">
      <div className="poster-tools">
        <PrintButton label="Imprimer l'affiche" />
        <p className="hint">Dans la fenêtre d&apos;impression, choisissez A5 ou A4 et décochez les en-têtes et pieds de page.</p>
      </div>
      <article className="poster">
        <p className="poster-stars" aria-hidden="true">
          ★★★★★
        </p>
        <h1 className="poster-title">Votre avis compte</h1>
        <p className="poster-sub">Une minute pour nous dire ce que vous avez pensé de votre visite.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR code vers la page d'avis" className="poster-qr" />
        <ol className="poster-steps">
          <li>Ouvrez l&apos;appareil photo de votre téléphone</li>
          <li>Visez le QR code</li>
          <li>Laissez votre avis sur Google</li>
        </ol>
        <p className="poster-name">{location.title}</p>
      </article>
    </main>
  );
}
