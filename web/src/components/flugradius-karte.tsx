"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";
import { leafletIconsVonCdnLaden, standPinIcon } from "@/lib/leaflet-icons";
import { kartenebeneSetzen, type Kartentyp, type KartenebenenRefs } from "@/lib/kartenebenen";
import { useVollbild } from "@/lib/use-vollbild";
import { meinStandortKnopf } from "@/lib/mein-standort";
import {
  FLUGRADIUS_MAX_M,
  FLUGRADIUS_MIN_M,
  FLUGRADIUS_STANDARD_M,
  flugradiusEinstellungLaden,
  flugradiusEinstellungSpeichern,
  flugradiusKreisOptionen,
  flugradiusSichtbarkeitSetzen,
  flugradiusVerlaufSicherstellen,
  useFlugradiusVerlaufBeobachter,
} from "@/lib/flugradius";
import { KartentypUmschalter } from "@/components/kartentyp-umschalter";
import { VollbildButton } from "@/components/vollbild-button";
import { FlugradiusUmschalter } from "@/components/flugradius-umschalter";
import { KartenLegende } from "@/components/karten-legende";

const STANDARD_POSITION = { lat: 51.1657, lng: 10.4515 };
const STANDARD_ZOOM = 6;

const RADIUS_SCHRITT_M = 100;

export type BienenstandPunkt = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  archiviert: boolean;
  wanderstand: boolean;
};

function radiusAnzeige(radiusMeter: number): string {
  return radiusMeter >= 1000 ? `${(radiusMeter / 1000).toFixed(1)} km` : `${radiusMeter} m`;
}

export function FlugradiusKarte({ staende }: { staende: BienenstandPunkt[] }) {
  const router = useRouter();
  const [radius, setRadius] = useState(FLUGRADIUS_STANDARD_M);
  const [kartentyp, setKartentyp] = useState<Kartentyp>("karte");
  const [radiusSichtbar, setRadiusSichtbar] = useState(true);

  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const kreiseRef = useRef<Leaflet.Circle[]>([]);
  const ebenenRef = useRef<KartenebenenRefs>({ basis: null, beschriftung: null });
  const { istVollbild, vollbildUmschalten } = useVollbild(mapRef);

  useEffect(() => {
    let abgebrochen = false;

    import("leaflet").then((L) => {
      if (abgebrochen || !mapContainerRef.current || mapRef.current) return;

      leafletIconsVonCdnLaden(L);
      leafletRef.current = L;

      // Zuletzt gewählte Flugradius-Einstellung (auch von der Stand-Seite).
      const einstellung = flugradiusEinstellungLaden();
      setRadius(einstellung.radius);
      setRadiusSichtbar(einstellung.sichtbar);

      const map = L.map(mapContainerRef.current, { zoomControl: false });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      meinStandortKnopf(L, map);
      ebenenRef.current = kartenebeneSetzen(L, map, ebenenRef.current, "karte");

      const kreise: Leaflet.Circle[] = [];
      staende.forEach((stand) => {
        const marker = L.marker([stand.lat, stand.lng], {
          icon: standPinIcon(L, stand.wanderstand),
          opacity: stand.archiviert ? 0.5 : 1,
        }).addTo(map);
        marker.bindTooltip(stand.wanderstand ? `${stand.name} (Wanderstand)` : stand.name);
        marker.on("click", () => router.push(`/bienenstaende/${stand.id}`));

        const kreis = L.circle([stand.lat, stand.lng], flugradiusKreisOptionen(einstellung.radius));
        if (einstellung.sichtbar) kreis.addTo(map);
        kreise.push(kreis);
      });
      kreiseRef.current = kreise;
      flugradiusVerlaufSicherstellen(mapContainerRef.current);

      if (staende.length > 0) {
        map.fitBounds(
          L.latLngBounds(staende.map((stand) => [stand.lat, stand.lng] as [number, number])).pad(0.3)
        );
      } else {
        map.setView([STANDARD_POSITION.lat, STANDARD_POSITION.lng], STANDARD_ZOOM);
      }

      mapRef.current = map;
    });

    return () => {
      abgebrochen = true;
      mapRef.current?.remove();
      mapRef.current = null;
      kreiseRef.current = [];
    };
    // Karte soll nur einmal beim Einhängen aufgebaut werden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Schieberegler wirkt auf alle bereits gezeichneten Kreise, ohne die
  // Karte neu aufzubauen.
  useEffect(() => {
    kreiseRef.current.forEach((kreis) => kreis.setRadius(radius));
  }, [radius]);

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
    <div
      className={
        istVollbild ? "fixed inset-0 z-50 flex flex-col gap-3 bg-background p-3" : "flex flex-col gap-3"
      }
    >
      {/* Steuerung liegt über der Karte statt darüber schwebend - auf dem
          Smartphone war dafür sonst nicht genug Platz und die Bedienelemente
          haben sich gegenseitig verdeckt. */}
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="sm:w-56">
            <label htmlFor="stand-auswahl" className="mb-1 block text-sm font-medium text-muted">
              Standauswahl
            </label>
            <Select
              id="stand-auswahl"
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) router.push(`/bienenstaende/${event.target.value}`);
              }}
            >
              <option value="">Stand wählen …</option>
              {staende.map((stand) => (
                <option key={stand.id} value={stand.id}>
                  {stand.name}
                  {stand.wanderstand ? " (Wanderstand)" : ""}
                  {stand.archiviert ? " (archiviert)" : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="sm:w-56">
            <label htmlFor="radius-schieber" className="mb-1 block text-sm font-medium text-muted">
              Flugradius: {radiusAnzeige(radius)}
            </label>
            <input
              id="radius-schieber"
              type="range"
              min={FLUGRADIUS_MIN_M}
              max={FLUGRADIUS_MAX_M}
              step={RADIUS_SCHRITT_M}
              value={radius}
              onChange={(event) => {
                const neuerRadius = Number(event.target.value);
                setRadius(neuerRadius);
                flugradiusEinstellungSpeichern({ radius: neuerRadius });
              }}
              disabled={!radiusSichtbar}
              className="w-full accent-accent disabled:opacity-40"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FlugradiusUmschalter sichtbar={radiusSichtbar} onToggle={radiusUmschalten} />
          <KartentypUmschalter kartentyp={kartentyp} onChange={kartentypSetzen} />
          <VollbildButton istVollbild={istVollbild} onToggle={vollbildUmschalten} />
        </div>
      </div>

      {/* Die Größe hängt an diesem äußeren Element, nicht am Karten-Element
          selbst - siehe gleiche Begründung in standort-karte.tsx. */}
      <div
        className={
          istVollbild
            ? "relative w-full flex-1 overflow-hidden rounded-md border border-border"
            : "relative h-[32rem] w-full overflow-hidden rounded-md border border-border sm:h-[36rem]"
        }
      >
        <div ref={mapContainerRef} className="h-full w-full" />
        <KartenLegende />
      </div>
    </div>
  );
}
