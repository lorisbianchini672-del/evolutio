"use client";

import { useEffect } from "react";

/**
 * Active les apparitions au défilement et le reflet qui suit le pointeur sur les tuiles.
 * Sans JavaScript (ou avec les animations réduites), tout le contenu reste simplement visible.
 */
export function LandingMotion() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add("lp-motion");

    const targets = Array.from(document.querySelectorAll<HTMLElement>(".lp [data-rv]"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    targets.forEach((el) => observer.observe(el));

    const onMove = (event: PointerEvent) => {
      const tile = (event.target as HTMLElement | null)?.closest<HTMLElement>(".lp .tile");
      if (!tile) return;
      const rect = tile.getBoundingClientRect();
      tile.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      tile.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      observer.disconnect();
      document.removeEventListener("pointermove", onMove);
      root.classList.remove("lp-motion");
    };
  }, []);
  return null;
}
