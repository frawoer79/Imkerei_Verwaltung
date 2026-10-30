"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, useTransition } from "react";
import type * as Leaflet from "leaflet";
import { useRouter } from "next/navigation";
import { leafletIconsVonCdnLaden, standPinIcon } from "@/lib/leaflet-icons";
import { meinStandortKnopf } from "@/lib/mein-standort";
import { kartenebeneSetzen, type Kartentyp, type KartenebenenRefs } from "@/lib/kartenebenen";
import { useVollbild } from "@/lib/use-vollbild";
import { KartentypUmschalter } from "@/components/kartentyp-umschalter";
import { VollbildButton } from "@/components/vollbild-button";
import { KartenLegende } from "@/components/karten-legende";
import { velutinaRadienSpeichern } from "@/lib/velutina-actions";
import {
  AKUT_FARBE,
  AKUT_MAX_M,
  AKUT_MIN_M,
  VELUTINA_ART_LABEL,
  WARN_FARBE,
  WARN_MAX_M,
  WARN_MIN_M,
  abstandAnzeige,
  abstandMeter,
  type StandPunkt,
  type VelutinaArt,
} from "@/lib/velutina-daten";

// Mitte Baden-Württembergs, falls noch kein Stand einen Standort hat.
const BW_MITTE: [number, number] = [48.6, 9.0];
const BW_ZOOM = 8;
const RADIUS_SCHRITT_M = 250;

const NEST_FARBE = "#7f1d1d";
const EINZELTIER_FARBE = "#ea580c";

export type KartenMeldung = {
  id: string;
  art: VelutinaArt;
  // Als Text (TT.MM.JJJJ) - Datumsobjekte überleben den Weg vom Server in
  // den Browser nicht als solche.
  datumText: string;
  meldungsNr: string | null;
  lat: number;
  lng: number;
  neu: boolean;
};

// Gleiche Anzeige wie beim Flugradius: 2,5 km bzw. 750 m.
function radiusAnzeige(meter: number): string {
  return meter >= 1000 ? `${(meter / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} km` : `${meter} m`;
}

function popupText(meldung: KartenMeldung, staende: StandPunkt[]): string {
  let naechster = "";
  if (staende.length > 0) {
    const mitAbstand = staende
      .map((stand) => ({ stand, abstand: abstandMeter(meldung.lat, meldung.lng, stand.lat, stand.lng) }))
      .sort((a, b) => a.abstand - b.abstand)[0];
    naechster = `<br>${abstandAnzeige(mitAbstand.abstand)} von ${escapeHtml(mitAbstand.stand.name)}`;
  }
  return (
    `<strong>${VELUTINA_ART_LABEL[meldung.art]}</strong>${meldung.neu ? " · <em>neu</em>" : ""}<br>` +
    `Fund vom ${meldung.datumText}` +
    (meldung.meldungsNr ? `<br>Meldung ${escapeHtml(meldung.meldungsNr)}` : "") +
    naechster
  );
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (zeichen) => `&#${zeichen.charCodeAt(0)};`);
}

export function VelutinaKarte({
  staende,
  meldungen,
  akutRadiusM,
  warnRadiusM,
  fokusStandId,
}: {
  staende: StandPunkt[];
  meldungen: KartenMeldung[];
  akutRadiusM: number;
  warnRadiusM: number;
  fokusStandId?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [akut, setAkut] = useState(akutRadiusM);
  const [warn, setWarn] = useState(warnRadiusM);
  const [kartentyp, setKartentyp] = useState<Kartentyp>("karte");
  const [nesterZeigen, setNesterZeigen] = useState(true);
  const [einzeltiereZeigen, setEinzeltiereZeigen] = useState(true);

  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const akutKreiseRef = useRef<Leaflet.Circle[]>([]);
  const warnKreiseRef = useRef<Leaflet.Circle[]>([]);
  const nesterRef = useRef<Leaflet.LayerGroup | null>(null);
  const einzeltiereRef = useRef<Leaflet.LayerGroup | null>(null);
  const ebenenRef = useRef<KartenebenenRefs>({ basis: null, beschriftung: null });
  const speichernTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { istVollbild, vollbildUmschalten } = useVollbild(mapRef);

  // Karte einmalig aufbauen: Stände mit ihren beiden Bereichen.
  useEffect(() => {
    let abgebrochen = false;

    import("leaflet").then((L) => {
      if (abgebrochen || !mapContainerRef.current || mapRef.current) return;
      leafletIconsVonCdnLaden(L);
      leafletRef.current = L;

      const map = L.map(mapContainerRef.current, { zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 240, zoomControl: false });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      meinStandortKnopf(L, map);
      ebenenRef.current = kartenebeneSetzen(L, map, ebenenRef.current, "karte");

      staende.forEach((stand) => {
        warnKreiseRef.current.push(
          L.circle([stand.lat, stand.lng], {
            radius: warnRadiusM,
            color: WARN_FARBE,
            weight: 2,
            opacity: 0.9,
            fillColor: WARN_FARBE,
            fillOpacity: 0.12,
            interactive: false,
          }).addTo(map),
        );
        akutKreiseRef.current.push(
          L.circle([stand.lat, stand.lng], {
            radius: akutRadiusM,
            color: AKUT_FARBE,
            weight: 2,
            opacity: 0.9,
            fillColor: AKUT_FARBE,
            fillOpacity: 0.15,
            interactive: false,
          }).addTo(map),
        );
        L.marker([stand.lat, stand.lng], { icon: standPinIcon(L, stand.wanderstand ?? false) })
          .addTo(map)
          .bindTooltip(stand.wanderstand ? `${stand.name} (Wanderstand)` : stand.name);
      });

      const fokus = staende.find((stand) => stand.id === fokusStandId);
      if (fokus) {
        map.fitBounds(L.latLng(fokus.lat, fokus.lng).toBounds(warnRadiusM * 2.2));
      } else if (staende.length > 0) {
        const grenzen = L.latLngBounds([]);
        staende.forEach((stand) => grenzen.extend(L.latLng(stand.lat, stand.lng).toBounds(warnRadiusM * 2.2)));
        map.fitBounds(grenzen);
      } else {
        map.setView(BW_MITTE, BW_ZOOM);
      }

      mapRef.current = map;
      meldungenZeichnen();
    });

    return () => {
      abgebrochen = true;
      mapRef.current?.remove();
      mapRef.current = null;
      akutKreiseRef.current = [];
      warnKreiseRef.current = [];
      nesterRef.current = null;
      einzeltiereRef.current = null;
    };
    // Nur einmal beim Einhängen - Radien und Meldungen ändern die Karte
    // weiter unten, ohne sie neu aufzubauen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Meldungen als Punkte. Bei mehreren tausend Punkten zeichnet Leaflet auf
  // einer Leinwand (canvas) statt mit einzelnen SVG-Elementen - sonst
  // ruckelt das Verschieben am Handy.
  function meldungenZeichnen() {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    nesterRef.current?.remove();
    einzeltiereRef.current?.remove();

    const leinwand = L.canvas({ padding: 0.5 });
    const nester = L.layerGroup();
    const einzeltiere = L.layerGroup();
    // Einzeltiere zuerst, damit Nester obenauf liegen.
    for (const meldung of [...meldungen].sort((a, b) => (a.art === b.art ? 0 : a.art === "NEST" ? 1 : -1))) {
      const istNest = meldung.art === "NEST";
      L.circleMarker([meldung.lat, meldung.lng], {
        renderer: leinwand,
        radius: istNest ? 7 : 4.5,
        color: meldung.neu ? "#111827" : "#ffffff",
        weight: meldung.neu ? 2.5 : 1.5,
        fillColor: istNest ? NEST_FARBE : EINZELTIER_FARBE,
        fillOpacity: 0.95,
      })
        .bindPopup(popupText(meldung, staende))
        .addTo(istNest ? nester : einzeltiere);
    }
    nesterRef.current = nester;
    einzeltiereRef.current = einzeltiere;
    if (einzeltiereZeigen) einzeltiere.addTo(map);
    if (nesterZeigen) nester.addTo(map);
  }

  useEffect(() => {
    meldungenZeichnen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meldungen]);

  useEffect(() => {
    akutKreiseRef.current.forEach((kreis) => kreis.setRadius(akut));
  }, [akut]);
  useEffect(() => {
    warnKreiseRef.current.forEach((kreis) => kreis.setRadius(warn));
  }, [warn]);

  // Gespeichert wird kurz nach dem letzten Verschieben, dann lädt die Seite
  // die Liste darunter mit den neuen Bereichen neu.
  function radienAendern(neuAkut: number, neuWarn: number) {
    setAkut(neuAkut);
    setWarn(neuWarn);
    if (speichernTimerRef.current) clearTimeout(speichernTimerRef.current);
    speichernTimerRef.current = setTimeout(() => {
      startTransition(async () => {
        await velutinaRadienSpeichern(neuAkut, neuWarn);
        router.refresh();
      });
    }, 700);
  }

  function ebeneUmschalten(gruppe: Leaflet.LayerGroup | null, sichtbar: boolean) {
    const map = mapRef.current;
    if (!map || !gruppe) return;
    if (sichtbar) gruppe.addTo(map);
    else gruppe.remove();
    // Nester bleiben obenauf.
    if (sichtbar && gruppe === einzeltiereRef.current && nesterZeigen && nesterRef.current) {
      nesterRef.current.remove();
      nesterRef.current.addTo(map);
    }
  }

  function kartentypSetzen(typ: Kartentyp) {
    setKartentyp(typ);
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    ebenenRef.current = kartenebeneSetzen(L, map, ebenenRef.current, typ);
  }

  const anzahlNester = meldungen.filter((meldung) => meldung.art === "NEST").length;
  const anzahlEinzeltiere = meldungen.length - anzahlNester;

  return (
    <div className={istVollbild ? "fixed inset-0 z-50 flex flex-col gap-3 bg-background p-3" : "flex flex-col gap-3"}>
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3 shadow-sm lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          {staende.length > 0 && (
            <>
              <div className="sm:w-56">
                <label htmlFor="akut-schieber" className="mb-1 flex items-center gap-1.5 text-sm font-medium text-muted">
                  <span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ background: AKUT_FARBE }} />
                  Akutbereich: {radiusAnzeige(akut)}
                </label>
                <input
                  id="akut-schieber"
                  type="range"
                  min={AKUT_MIN_M}
                  max={AKUT_MAX_M}
                  step={RADIUS_SCHRITT_M}
                  value={akut}
                  onChange={(event) => {
                    const wert = Number(event.target.value);
                    radienAendern(wert, Math.max(warn, wert));
                  }}
                  className="w-full accent-red-600"
                />
              </div>
              <div className="sm:w-56">
                <label htmlFor="warn-schieber" className="mb-1 flex items-center gap-1.5 text-sm font-medium text-muted">
                  <span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ background: WARN_FARBE }} />
                  Warnbereich: {radiusAnzeige(warn)}
                </label>
                <input
                  id="warn-schieber"
                  type="range"
                  min={WARN_MIN_M}
                  max={WARN_MAX_M}
                  step={RADIUS_SCHRITT_M}
                  value={warn}
                  onChange={(event) => {
                    const wert = Number(event.target.value);
                    radienAendern(Math.min(akut, wert), wert);
                  }}
                  className="w-full accent-amber-500"
                />
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <EbenenKnopf
              aktiv={nesterZeigen}
              farbe={NEST_FARBE}
              gross
              label={`Nester (${anzahlNester})`}
              onClick={() => {
                setNesterZeigen(!nesterZeigen);
                ebeneUmschalten(nesterRef.current, !nesterZeigen);
              }}
            />
            <EbenenKnopf
              aktiv={einzeltiereZeigen}
              farbe={EINZELTIER_FARBE}
              label={`Einzeltiere (${anzahlEinzeltiere})`}
              onClick={() => {
                setEinzeltiereZeigen(!einzeltiereZeigen);
                ebeneUmschalten(einzeltiereRef.current, !einzeltiereZeigen);
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <KartentypUmschalter kartentyp={kartentyp} onChange={kartentypSetzen} />
          <VollbildButton istVollbild={istVollbild} onToggle={vollbildUmschalten} />
        </div>
      </div>

      <div
        className={
          istVollbild
            ? "relative w-full flex-1 overflow-hidden rounded-md border border-border"
            : "relative h-[28rem] w-full overflow-hidden rounded-md border border-border sm:h-[34rem]"
        }
      >
        <div ref={mapContainerRef} className="h-full w-full" />
        <KartenLegende
          zusatz={[
            { label: "Nest", farbe: NEST_FARBE, gross: true },
            { label: "Einzeltier", farbe: EINZELTIER_FARBE },
          ]}
        />
      </div>
      {!istVollbild && (
        <p className="text-xs text-muted">
          Schwarz umrandete Punkte sind neue Meldungen in deinen Bereichen. Punkt antippen für Datum und
          Abstand zum nächsten Stand.
        </p>
      )}
    </div>
  );
}

function EbenenKnopf({
  aktiv,
  farbe,
  gross = false,
  label,
  onClick,
}: {
  aktiv: boolean;
  farbe: string;
  gross?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium ${
        aktiv ? "bg-card" : "bg-background text-muted line-through opacity-70"
      }`}
    >
      <span
        aria-hidden
        className={`inline-block rounded-full border border-white ${gross ? "h-3.5 w-3.5" : "h-2.5 w-2.5"}`}
        style={{ background: farbe }}
      />
      {label}
    </button>
  );
}
