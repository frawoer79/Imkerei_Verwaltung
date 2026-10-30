import type * as Leaflet from "leaflet";

export type Kartentyp = "karte" | "satellit" | "hybrid";
// vergroessert: Kachel eine Zoomstufe gröber holen und doppelt so groß
// zeichnen - Schrift und Linien erscheinen dadurch doppelt so groß.
type Ebene = { url: string; attribution: string; maxZoom: number; vergroessert?: boolean };

const ESRI_ATTRIBUTION = '&copy; <a href="https://www.esri.com/">Esri</a>';

// "Hybrid" = Satellitenbild als Basis plus durchsichtige Ebenen obendrüber:
// Straßen mit Straßennamen (World_Transportation) und Orts-/Gemeindenamen mit
// Grenzen (World_Boundaries_and_Places). Die Ortsnamen sind in den Esri-Kacheln
// sehr klein, deshalb werden sie vergrößert gezeichnet. Von allen Karten mit
// Umschalter Karte/Satellit/Hybrid gemeinsam genutzt.
export const KARTENEBENEN: Record<Kartentyp, { basis: Ebene; beschriftung?: Ebene[] }> = {
  karte: {
    basis: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
      maxZoom: 19,
    },
  },
  satellit: {
    basis: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: ESRI_ATTRIBUTION,
      maxZoom: 19,
    },
  },
  hybrid: {
    basis: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: ESRI_ATTRIBUTION,
      maxZoom: 19,
    },
    beschriftung: [
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
        attribution: ESRI_ATTRIBUTION,
        maxZoom: 19,
      },
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        attribution: ESRI_ATTRIBUTION,
        maxZoom: 19,
        vergroessert: true,
      },
    ],
  },
};

export type KartenebenenRefs = {
  basis: Leaflet.TileLayer | null;
  beschriftung: Leaflet.LayerGroup | null;
};

// Tauscht die aktiven Kartenebenen aus (entfernt vorhandene, legt die neuen
// an) und gibt die neuen Layer-Referenzen zurück, damit die aufrufende
// Komponente sie in ihrem eigenen Ref weiterführen kann.
export function kartenebeneSetzen(
  L: typeof Leaflet,
  map: Leaflet.Map,
  bisherige: KartenebenenRefs,
  typ: Kartentyp
): KartenebenenRefs {
  if (bisherige.basis) map.removeLayer(bisherige.basis);
  if (bisherige.beschriftung) map.removeLayer(bisherige.beschriftung);

  const ebene = KARTENEBENEN[typ];
  const kachelEbene = (e: Ebene) =>
    L.tileLayer(e.url, {
      attribution: e.attribution,
      maxZoom: e.maxZoom,
      ...(e.vergroessert ? { tileSize: 512, zoomOffset: -1 } : {}),
    });
  const basis = kachelEbene(ebene.basis).addTo(map);
  const beschriftung = ebene.beschriftung
    ? L.layerGroup(ebene.beschriftung.map(kachelEbene)).addTo(map)
    : null;

  return { basis, beschriftung };
}
