import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/config";
import { ensureLocalEnv } from "@/lib/local-env";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} · Réponses et collecte d'avis Google`,
  description:
    "Evolutio rédige la réponse à chaque avis Google dans votre ton, vous alerte quand un client est déçu et vous aide à récolter de nouveaux avis.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#060608",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  ensureLocalEnv();
  return (
    <html lang="fr" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300..700&family=Geist+Mono:wght@400;500&display=swap" />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
