"use client";

import { useState } from "react";

// Hinweis unter einem Feld, dessen gespeicherter Wert länger ist als heute
// erlaubt (aus der Zeit vor den Höchstlängen). Der Wert bleibt stehen und
// darf so gespeichert werden; der Hinweis verschwindet, sobald gekürzt ist.
// Steht direkt hinter dem Feld (siehe Input/Textarea in ui.tsx).
export function UeberlangHinweis({ laenge, grenze }: { laenge: number; grenze: number }) {
  const [aktuell, setAktuell] = useState(laenge);
  return (
    <>
      <span
        hidden
        ref={(knoten) => {
          const feld = knoten?.previousElementSibling as HTMLInputElement | HTMLTextAreaElement | null;
          if (!feld) return;
          const lauscher = () => setAktuell(feld.value.length);
          feld.addEventListener("input", lauscher);
          return () => feld.removeEventListener("input", lauscher);
        }}
      />
      {aktuell > grenze && (
        <p className="mt-1 text-xs text-warnung">
          Zu lang: {aktuell} Zeichen, erlaubt sind {grenze}. Bitte kürzen.
        </p>
      )}
    </>
  );
}
