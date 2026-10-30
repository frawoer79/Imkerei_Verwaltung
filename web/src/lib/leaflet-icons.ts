import type * as Leaflet from "leaflet";

// Leaflets Standard-Marker-Icons beziehen sich auf Bundler-Pfade, die in
// Next.js nicht automatisch mitkopiert werden - stattdessen von einem CDN
// laden. Von beiden Kartenkomponenten genutzt.
export function leafletIconsVonCdnLaden(L: typeof Leaflet) {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// Stand-Pins: feste Stände blau, Wanderstände gelb. Als SVG gezeichnet statt
// als Bilddatei, damit beide Farben gleich aussehen und nichts nachgeladen
// werden muss. Form und Größe wie Leaflets Standard-Marker (25 × 41 px, Spitze
// unten mittig). Die Legende (karten-legende.tsx) nutzt dieselben Werte.
export const STAND_PIN_PFAD =
  "M12.5 1C6.2 1 1 6.1 1 12.4c0 8.6 11.5 27.6 11.5 27.6S24 21 24 12.4C24 6.1 18.8 1 12.5 1z";

export const STAND_PIN_FARBEN = {
  fest: { fuellung: "#2a81cb", rand: "#1d5d93" },
  wander: { fuellung: "#facc15", rand: "#a16207" },
} as const;

export function standPinSvg(wanderstand: boolean, breite = 25): string {
  const farbe = wanderstand ? STAND_PIN_FARBEN.wander : STAND_PIN_FARBEN.fest;
  const hoehe = Math.round((breite * 41) / 25);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${breite}" height="${hoehe}" viewBox="0 0 25 41" aria-hidden="true">` +
    `<path d="${STAND_PIN_PFAD}" fill="${farbe.fuellung}" stroke="${farbe.rand}" stroke-width="1.5"/>` +
    `<circle cx="12.5" cy="12.5" r="4.5" fill="#ffffff"/>` +
    `</svg>`
  );
}

export function standPinIcon(L: typeof Leaflet, wanderstand: boolean): Leaflet.DivIcon {
  return L.divIcon({
    html: standPinSvg(wanderstand),
    className: "stand-pin",
    iconSize: [25, 41],
    iconAnchor: [12.5, 41],
    tooltipAnchor: [12, -28],
    popupAnchor: [0, -36],
  });
}
