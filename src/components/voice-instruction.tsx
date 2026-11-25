"use client";

import { useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

/**
 * Champ « consigne » du brouillon : on peut la taper ou la dicter
 * (« dis-lui qu'on le rappelle demain »). La reconnaissance vocale est celle du navigateur.
 */
export function VoiceInstruction() {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "fr-FR";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ");
      setValue(text.trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    const id = window.setTimeout(() => setSupported(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  function toggle() {
    if (!rec.current) return;
    if (listening) {
      rec.current.stop();
      return;
    }
    setValue("");
    setListening(true);
    if (navigator.vibrate) navigator.vibrate(8);
    rec.current.start();
  }

  return (
    <div className="voice">
      <input
        className="input voice-input"
        name="consigne"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={400}
        placeholder="Consigne : « dis-lui qu'on le rappelle demain »"
        aria-label="Consigne pour réécrire la réponse"
      />
      {supported && (
        <button
          type="button"
          className={`voice-mic${listening ? " on" : ""}`}
          onClick={toggle}
          aria-label={listening ? "Arrêter la dictée" : "Dicter une consigne"}
          aria-pressed={listening}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <rect x="9" y="3.5" width="6" height="11" rx="3" />
            <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
