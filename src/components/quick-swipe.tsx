"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

/**
 * Carte du mode rapide : glisser vers la droite publie la réponse proposée,
 * vers la gauche passe à l'avis suivant. Les boutons restent là pour qui préfère toucher.
 */
export function QuickSwipe({
  children,
  canPublish,
  nextHref,
  publishButtonId,
}: {
  children: ReactNode;
  canPublish: boolean;
  nextHref: string | null;
  publishButtonId: string;
}) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number } | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const LIMIT = 110;

  function onDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("textarea, input, button, a, select")) return;
    start.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }
  function onMove(e: React.PointerEvent) {
    if (!start.current) return;
    const x = e.clientX - start.current.x;
    const y = e.clientY - start.current.y;
    if (Math.abs(y) > Math.abs(x) && Math.abs(dx) < 8) return; // l'utilisateur fait défiler la page
    if (x > 0 && !canPublish) return setDx(Math.min(x, 40));
    if (x < 0 && !nextHref) return setDx(Math.max(x, -40));
    setDx(x);
  }
  function onUp() {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    if (dx > LIMIT && canPublish) {
      setLeaving("right");
      if (navigator.vibrate) navigator.vibrate(12);
      window.setTimeout(() => (document.getElementById(publishButtonId) as HTMLButtonElement | null)?.click(), 180);
      return;
    }
    if (dx < -LIMIT && nextHref) {
      setLeaving("left");
      window.setTimeout(() => router.push(nextHref), 180);
      return;
    }
    setDx(0);
  }

  const offset = leaving === "right" ? 520 : leaving === "left" ? -520 : dx;
  const hint = dx > 30 ? "publier" : dx < -30 ? "passer" : null;

  return (
    <div className="swipe-zone">
      <div className={`swipe-hint left${hint === "passer" ? " on" : ""}`} aria-hidden="true">
        Passer
      </div>
      <div className={`swipe-hint right${hint === "publier" ? " on" : ""}`} aria-hidden="true">
        Publier
      </div>
      <div
        className="swipe-card"
        style={{
          transform: `translateX(${offset}px) rotate(${offset / 40}deg)`,
          transition: dragging ? "none" : "transform .35s cubic-bezier(.2,.8,.2,1)",
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {children}
      </div>
      <p className="swipe-help">
        {canPublish ? "Glissez à droite pour publier" : "Rédigez d'abord la réponse"}
        {nextHref ? " · à gauche pour passer" : ""}
      </p>
    </div>
  );
}
