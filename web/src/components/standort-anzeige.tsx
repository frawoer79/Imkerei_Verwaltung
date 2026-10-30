"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { useRouter } from "next/navigation";
import { leafletIconsVonCdnLaden, standPinIcon } from "@/lib/leaflet-icons";
import { kartenebeneSetzen, type Kartentyp, type KartenebenenRefs } from "@/lib/kartenebenen";
import {
  flugradiusEinstellungLaden,
  flugradiusEinstellungSpeichern,
  flugradiusKreisOptionen,
  flugradiusSichtbarkeitSetzen,
  flugradiusVerlaufSicherstellen,
  useFlugradiusVerlaufBeobachter,
} from "@/lib/flugradius";
import { KartentypUmschalter } from "@/components/kartentyp-umschalter";
import { FlugradiusUmschalter } from "@/components/flugradius-umschalter";

// Nur-Anzeige-Karte für die Bienenstand-Detailseite: zeigt den gespeicherten
// Standort mit Flugradius, ohne Verschieben/Zoomen per Hand - antippen führt
// zur vollständigen Kartenübersicht (siehe /karte). Für die editierbare
// Adress-/Kartenauswahl siehe standort-karte.tsx.
export function StandortAnzeige({
  breitengrad,
  laengengrad,
  wanderstand,
}: {
  breitengrad: number;
  laengengrad: number;
  wanderstand: boolean;
}) {
  const router = useRouter();
  const [kartentyp, setKartentyp] = useState<Kartentyp>("karte");
  const [radiusSichtbar, setRadiusSichtbar] = useState(true);

  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const kreiseRef = useRef<Leaflet.Circle[]>([]);
  const ebenenRef = useRef<KartenebenenRefs>({ basis: null, beschriftung: null });

  useEffect(() => {
    let abgebrochen = false;

    import("leaflet").then((L) => {
      if (abgebrochen || !mapContainerRef.current || mapRef.current) return;

      leafletIconsVonCdnLaden(L);
      leafletRef.current = L;

      // Zuletzt gewählte Flugradius-Einstellung (auch von der Kartenübersicht).
      const einstellung = flugradiusEinstellungLaden();
      setRadiusSichtbar(einstellung.sichtbar);

      // Reine Vorschau: keinerlei Bedienung per Maus, Finger oder Tastatur.
      const map = L.map(mapContainerRef.current, {
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomControl: false,
      });
      ebenenRef.current = kartenebeneSetzen(L, map, ebenenRef.current, "karte");

      // So weit auszoomen, dass der Flugradius komplett sichtbar ist - rein
      // geografisch berechnet (toBounds() braucht keine bereits bestehende
      // Kartenansicht), denn Circle.getBounds() bräuchte selbst schon einen
      // gesetzten Zoom, um Meter in Pixel umzurechnen: ein Henne-Ei-Problem,
      // da genau dieser Aufruf hier erst die Ansicht setzen soll.
      map.fitBounds(L.latLng(breitengrad, laengengrad).toBounds(einstellung.radius * 2));

      L.marker([breitengrad, laengengrad], { icon: standPinIcon(L, wanderstand) }).addTo(map);
      const kreis = L.circle([breitengrad, laengengrad], flugradiusKreisOptionen(einstellung.radius)).addTo(
        map
      );
      kreiseRef.current = [kreis];
      flugradiusVerlaufSicherstellen(mapContainerRef.current);
      if (!einstellung.sichtbar) kreis.remove();

      map.on("click", () => router.push("/karte"));

      mapRef.current = map;
    });

    return () => {
      abgebrochen = true;
      mapRef.current?.remove();
      mapRef.current = null;
      kreiseRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breitengrad, laengengrad, wanderstand]);

  useFlugradiusVerlaufBeobachter(mapContainerRef, kreiseRef);

  function kartentypSetzen(typ: Kartentyp) {
    setKartentyp(typ);
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    ebenenRef.current = kartenebeneSetzen(L, map, ebenenRef.current, typ);
  }

  function radiusUmschalten() {
    const sichtbar = !radiusSichtbar;
    setRadiusSichtbar(sichtbar);
    flugradiusEinstellungSpeichern({ sichtbar });
    if (mapRef.current) {
      flugradiusSichtbarkeitSetzen(mapRef.current, kreiseRef.current, sichtbar, mapContainerRef.current);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative w-full">
        <div className="absolute left-2 top-2 z-[1000]">
          <FlugradiusUmschalter sichtbar={radiusSichtbar} onToggle={radiusUmschalten} />
        </div>
        <div className="absolute right-2 top-2 z-[1000]">
          <KartentypUmschalter kartentyp={kartentyp} onChange={kartentypSetzen} />
        </div>
        <div
          ref={mapContainerRef}
          className="h-48 w-full cursor-pointer overflow-hidden rounded-md border border-border sm:h-56 lg:h-64"
        />
      </div>
      <p className="text-xs text-muted">Antippen für die Kartenübersicht mit allen Ständen →</p>
    </div>
  );
}
