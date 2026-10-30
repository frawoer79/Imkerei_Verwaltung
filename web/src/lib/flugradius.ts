"use client";

import { useEffect, type RefObject } from "react";
import type * as Leaflet from "leaflet";

export const FLUGRADIUS_FARBE = "#e8a32c";
export const FLUGRADIUS_STANDARD_M = 3000;
export const FLUGRADIUS_MIN_M = 500;
export const FLUGRADIUS_MAX_M = 8000;

const FLUGRADIUS_VERLAUF_ID = "flugradius-verlauf";

// Leaflet-Kreis-Optionen für den Flugradius: statt einer Kreisfläche mit
// einheitlicher Deckkraft ein weicher Verlauf, im Zentrum kräftiger, nach
// außen hin durchsichtiger - über den SVG-Farbverlauf, den
// flugradiusVerlaufSicherstellen() im Karten-SVG anlegt.
export function flugradiusKreisOptionen(radius: number): Leaflet.CircleOptions {
  return {
    radius,
    color: FLUGRADIUS_FARBE,
    weight: 1,
    opacity: 0.4,
    fillColor: `url(#${FLUGRADIUS_VERLAUF_ID})`,
    fillOpacity: 1,
  };
}

// Legt den Farbverlauf einmalig im SVG der Karte an (objectBoundingBox-
// Einheiten: der Verlauf skaliert dadurch automatisch auf die Größe jedes
// einzelnen Kreises, unabhängig vom gewählten Flugradius oder Zoomstufe).
export function flugradiusVerlaufSicherstellen(container: HTMLElement) {
  const svg = container.querySelector("svg");
  if (!svg || svg.querySelector(`#${FLUGRADIUS_VERLAUF_ID}`)) return;

  const NS = "http://www.w3.org/2000/svg";
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(NS, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }

  const gradient = document.createElementNS(NS, "radialGradient");
  gradient.setAttribute("id", FLUGRADIUS_VERLAUF_ID);

  const zentrum = document.createElementNS(NS, "stop");
  zentrum.setAttribute("offset", "0%");
  zentrum.setAttribute("stop-color", FLUGRADIUS_FARBE);
  zentrum.setAttribute("stop-opacity", "0.7");

  const rand = document.createElementNS(NS, "stop");
  rand.setAttribute("offset", "100%");
  rand.setAttribute("stop-color", FLUGRADIUS_FARBE);
  rand.setAttribute("stop-opacity", "0.2");

  gradient.appendChild(zentrum);
  gradient.appendChild(rand);
  defs.appendChild(gradient);
}

// Leaflet baut sein internes SVG-Element in manchen Situationen komplett neu
// auf (z.B. nach Kachel-Ladefehlern) - vorhandene Kreise bleiben dabei
// erhalten, ein separat eingefügter Farbverlauf aber nicht. Dieser Beobachter
// fügt ihn bei Bedarf einfach erneut ein.
export function useFlugradiusVerlaufBeobachter(
  containerRef: RefObject<HTMLElement | null>,
  kreiseRef: RefObject<unknown[]>
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const beobachter = new MutationObserver(() => {
      if (kreiseRef.current.length > 0) flugradiusVerlaufSicherstellen(container);
    });
    beobachter.observe(container, { childList: true, subtree: true });
    return () => beobachter.disconnect();
    // containerRef/kreiseRef sind stabile Refs - Inhalt lesen reicht, keine
    // Re-Registrierung des Beobachters nötig.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Blendet die Flugradius-Kreise ein oder aus, ohne sie neu anzulegen - beim
// Einblenden den Farbverlauf sicherstellen, falls Leaflet das SVG inzwischen
// neu aufgebaut hat.
export function flugradiusSichtbarkeitSetzen(
  map: Leaflet.Map,
  kreise: Leaflet.Circle[],
  sichtbar: boolean,
  container: HTMLElement | null
) {
  kreise.forEach((kreis) => {
    if (sichtbar) kreis.addTo(map);
    else kreis.remove();
  });
  if (sichtbar && container) flugradiusVerlaufSicherstellen(container);
}

// Zuletzt gewählte Flugradius-Einstellung (ein/aus und Größe), gemeinsam für
// alle Karten. Liegt im Browser (localStorage), gilt also je Gerät/Browser -
// ohne Server oder Datenbank. Kann fehlen oder gesperrt sein (privates
// Fenster), dann gelten die Standardwerte.
const EINSTELLUNG_SCHLUESSEL = "flugradius";

export type FlugradiusEinstellung = { sichtbar: boolean; radius: number };

export function flugradiusEinstellungLaden(): FlugradiusEinstellung {
  const standard = { sichtbar: true, radius: FLUGRADIUS_STANDARD_M };
  try {
    const gespeichert = JSON.parse(localStorage.getItem(EINSTELLUNG_SCHLUESSEL) ?? "null");
    if (!gespeichert || typeof gespeichert !== "object") return standard;
    const radius = Number(gespeichert.radius);
    return {
      sichtbar: typeof gespeichert.sichtbar === "boolean" ? gespeichert.sichtbar : standard.sichtbar,
      radius:
        Number.isFinite(radius) && radius >= FLUGRADIUS_MIN_M && radius <= FLUGRADIUS_MAX_M
          ? radius
          : standard.radius,
    };
  } catch {
    return standard;
  }
}

export function flugradiusEinstellungSpeichern(aenderung: Partial<FlugradiusEinstellung>) {
  try {
    const neu = { ...flugradiusEinstellungLaden(), ...aenderung };
    localStorage.setItem(EINSTELLUNG_SCHLUESSEL, JSON.stringify(neu));
  } catch {
    // Speichern nicht möglich - die Karte funktioniert trotzdem, merkt sich
    // die Einstellung dann eben nicht.
  }
}
