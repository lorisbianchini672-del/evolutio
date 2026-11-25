"use client";

import { useEffect, useState } from "react";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "busy";

function base64ToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** Active ou coupe les notifications des nouveaux avis sur l'appareil en cours. */
export function PushSetup({ publicKey, compact = false }: { publicKey: string; compact?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        if (!cancelled) setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (!cancelled) setState(sub ? "on" : "off");
    })().catch(() => !cancelled && setState("unsupported"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setState("busy");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) }));
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Enregistrement impossible.");
      setState("on");
      await fetch("/api/push", { method: "PUT" });
      setMessage("Notification d'essai envoyée.");
    } catch (err) {
      setState("off");
      setMessage(err instanceof Error ? err.message : "Activation impossible.");
    }
  }

  async function disable() {
    setState("busy");
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off");
    setMessage("");
  }

  async function test() {
    const res = await fetch("/api/push", { method: "PUT" });
    const { sent } = (await res.json().catch(() => ({ sent: 0 }))) as { sent: number };
    setMessage(sent ? "Notification d'essai envoyée." : "Aucun appareil n'a reçu la notification.");
  }

  if (state === "loading") return null;
  if (compact && (state === "on" || state === "unsupported" || state === "denied")) return null;

  return (
    <div className={compact ? "push-cta" : "space-y-3"}>
      {state === "ios-install" && (
        <p className="text-sm text-stone-600">
          Sur iPhone, ajoutez d&apos;abord Evolutio à l&apos;écran d&apos;accueil : touchez <strong>Partager</strong> puis{" "}
          <strong>Sur l&apos;écran d&apos;accueil</strong>. Ouvrez-le depuis l&apos;icône, puis revenez ici.
        </p>
      )}
      {state === "unsupported" && <p className="text-sm text-stone-600">Ce navigateur ne gère pas les notifications.</p>}
      {state === "denied" && (
        <p className="text-sm text-stone-600">
          Les notifications sont bloquées pour ce site. Autorisez-les dans les réglages du navigateur, puis rechargez la page.
        </p>
      )}
      {(state === "off" || state === "busy") && (
        <div className={compact ? "push-cta-in" : ""}>
          {compact && (
            <p className="text-sm">
              <strong>Soyez prévenu à chaque avis</strong>, réponse déjà prête.
            </p>
          )}
          <button type="button" className="btn btn-primary" onClick={enable} disabled={state === "busy"}>
            {state === "busy" ? "Activation…" : "Activer les notifications"}
          </button>
        </div>
      )}
      {state === "on" && !compact && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill pill-ok">Activées sur cet appareil</span>
          <button type="button" className="btn btn-secondary" onClick={test}>
            Envoyer un essai
          </button>
          <button type="button" className="btn btn-quiet" onClick={disable}>
            Couper
          </button>
        </div>
      )}
      {message && <p className="hint">{message}</p>}
    </div>
  );
}
