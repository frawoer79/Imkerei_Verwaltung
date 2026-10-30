"use client";

import { useEffect, useState, type RefObject } from "react";
import type * as Leaflet from "leaflet";

// Echtes Vollbild (Fullscreen-API) wird auf dem iPhone von Safari nicht für
// beliebige Elemente unterstützt (nur für Video) - stattdessen deckt dieser
// Modus die ganze Seite per CSS ab, das funktioniert auf allen Geräten
// gleich. Escape schließt zusätzlich. Von beiden Kartenkomponenten genutzt.
export function useVollbild(mapRef: RefObject<Leaflet.Map | null>) {
  const [istVollbild, setIstVollbild] = useState(false);

  function vollbildUmschalten() {
    setIstVollbild((wert) => !wert);
    requestAnimationFrame(() => mapRef.current?.invalidateSize());
  }

  useEffect(() => {
    if (!istVollbild) return;
    function beiEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIstVollbild(false);
    }
    window.addEventListener("keydown", beiEscape);
    return () => window.removeEventListener("keydown", beiEscape);
  }, [istVollbild]);

  return { istVollbild, vollbildUmschalten };
}
