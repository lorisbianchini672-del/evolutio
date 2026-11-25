"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Item = { href: string; label: string; icon: ReactNode };

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const ITEMS: Item[] = [
  {
    href: "/app",
    label: "Avis",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
        <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.2 3.2c-.4.3-.8 0-.8-.4v-2.8h-.5a2 2 0 0 1-2-2z" />
        <path d="M8.5 9.5h7M8.5 12.5h4.5" />
      </svg>
    ),
  },
  {
    href: "/app/analyse",
    label: "Analyse",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
        <path d="M4.5 19.5h15" />
        <path d="M7.5 16v-4.5M12 16V7.5M16.5 16v-6.5" />
      </svg>
    ),
  },
  {
    href: "/app/collecte",
    label: "Collecte",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
        <rect x="4.5" y="4.5" width="6" height="6" rx="1.5" />
        <rect x="13.5" y="4.5" width="6" height="6" rx="1.5" />
        <rect x="4.5" y="13.5" width="6" height="6" rx="1.5" />
        <path d="M13.5 13.5h2.5v2.5M19.5 13.5v.01M13.5 19.5h.01M16.5 19.5h3v-3" />
      </svg>
    ),
  },
  {
    href: "/app/reglages",
    label: "Réglages",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
        <path d="M5 7.5h8M17 7.5h2M5 16.5h2M11 16.5h8" />
        <circle cx="15" cy="7.5" r="2" />
        <circle cx="9" cy="16.5" r="2" />
      </svg>
    ),
  },
  {
    href: "/app/abonnement",
    label: "Abonnement",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...S}>
        <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
        <path d="M3.5 10h17M7 14.5h3" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app" || pathname.startsWith("/app/rapide");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Navigation de l'espace client.
 * « top » : onglets dans l'en-tête (ordinateur) ; « bottom » : barre d'onglets fixe (téléphone) ;
 * « title » : nom de la section en cours, affiché dans l'en-tête sur téléphone.
 */
export function AppNav({ variant }: { variant: "top" | "bottom" | "title" }) {
  const pathname = usePathname() ?? "/app";

  if (variant === "title") {
    const current = ITEMS.find((item) => isActive(pathname, item.href));
    return <span className="appx-title">{current?.label ?? "Evolutio"}</span>;
  }

  return (
    <nav className={variant === "top" ? "appx-top" : "appx-tabs"} aria-label="Sections">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            {variant === "bottom" && item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
