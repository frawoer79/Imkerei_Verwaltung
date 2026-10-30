"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { Button, Input, Label } from "@/components/ui";
import { leafletIconsVonCdnLaden } from "@/lib/leaflet-icons";
import { meinStandortKnopf } from "@/lib/mein-standort";
import { kartenebeneSetzen, type Kartentyp, type KartenebenenRefs } from "@/lib/kartenebenen";
import { useVollbild } from "@/lib/use-vollbild";
import { KartentypUmschalter } from "@/components/kartentyp-umschalter";
import { VollbildButton } from "@/components/vollbild-button";
import { FELD_GRENZEN } from "@/lib/eingabe-grenzen";

// Deutschland-Mitte als Startansicht, solange noch kein Standort gesetzt ist.
const STANDARD_POSITION = { lat: 51.1657, lng: 10.4515 };
const STANDARD_ZOOM = 6;
const GESETZT_ZOOM = 15;

type Position = { lat: number; lng: number };

export function StandortKarte({
  initialStrasse,
  initialOrt,
  initialBreitengrad,
  initialLaengengrad,
}: {
  initialStrasse: string;
  initialOrt: string;
  initialBreitengrad: number | null;
  initialLaengengrad: number | null;
}) {
  const [strasse, setStrasse] = useState(initialStrasse);
  const [ort, setOrt] = useState(initialOrt);
  const [position, setPosition] = useState<Position | null>(
    initialBreitengrad != null && initialLaengengrad != null
      ? { lat: initialBreitengrad, lng: initialLaengengrad }
      : null
  );
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [kartentyp, setKartentyp] = useState<Kartentyp>("karte");

  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const ebenenRef = useRef<KartenebenenRefs>({ basis: null, beschriftung: null });
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const { istVollbild, vollbildUmschalten } = useVollbild(mapRef);
  // Bricht den zirkulären Bezug platziereMarker <-> kartenPositionUebernehmen
  // auf (der Drag-Handler unten muss die jeweils aktuelle Funktion aufrufen,
  // obwohl er vor deren Definition angelegt wird).
  const kartenPositionUebernehmenRef = useRef<(lat: number, lng: number) => void>(() => {});

  const platziereMarker = useCallback((lat: number, lng: number, zentrieren: boolean) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        kartenPositionUebernehmenRef.current(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }

    if (zentrieren) {
      map.setView([lat, lng], Math.max(map.getZoom(), GESETZT_ZOOM));
    }
  }, []);

  // Reverse-Geocoding: von der Karte (Klick/Marker verschoben) zu Straße/Ort.
  const kartenPositionUebernehmen = useCallback(
    (lat: number, lng: number) => {
      setPosition({ lat, lng });
      platziereMarker(lat, lng, false);
      setLaedt(true);
      setFehler(null);
      fetch(`/api/geocode/reverse?breitengrad=${lat}&laengengrad=${lng}`)
        .then(async (antwort) => {
          const daten = await antwort.json();
          if (antwort.ok) {
            // Gekürzt, damit die Adresse in die Höchstlänge passt.
            setStrasse(String(daten.strasse ?? "").slice(0, FELD_GRENZEN.strasse));
            setOrt(String(daten.ort ?? "").slice(0, FELD_GRENZEN.ort));
          }
        })
        .catch(() => {
          // Koordinaten sind trotzdem gesetzt, nur die Adresse konnte nicht
          // automatisch ermittelt werden - kein Blocker.
        })
        .finally(() => setLaedt(false));
    },
    [platziereMarker]
  );

  useEffect(() => {
    kartenPositionUebernehmenRef.current = kartenPositionUebernehmen;
  }, [kartenPositionUebernehmen]);

  // Karte einmalig aufbauen (Leaflet greift auf window/document zu, deshalb
  // erst im Browser per dynamischem Import laden, nicht beim Server-Render).
  useEffect(() => {
    let abgebrochen = false;

    import("leaflet").then((L) => {
      if (abgebrochen || !mapContainerRef.current || mapRef.current) return;

      leafletIconsVonCdnLaden(L);

      leafletRef.current = L;
      const start = position ?? STANDARD_POSITION;
      const map = L.map(mapContainerRef.current).setView(
        [start.lat, start.lng],
        position ? GESETZT_ZOOM : STANDARD_ZOOM
      );
      ebenenRef.current = kartenebeneSetzen(L, map, ebenenRef.current, "karte");
      meinStandortKnopf(L, map, "topleft");

      map.on("click", (event: Leaflet.LeafletMouseEvent) => {
        kartenPositionUebernehmenRef.current(event.latlng.lat, event.latlng.lng);
      });

      mapRef.current = map;

      if (position) {
        platziereMarker(position.lat, position.lng, false);
      } else if (!initialStrasse.trim() && !initialOrt.trim() && "geolocation" in navigator) {
        // Noch kein Standort gewählt und noch keine Adresse eingegeben: die
        // Geräteposition (GPS/GLONASS) dient nur als Vorauswahl. Ein Klick
        // auf die Karte oder Verschieben des Markers überschreibt sie wie
        // gewohnt - das ist derselbe Mechanismus, kein Sonderfall.
        navigator.geolocation.getCurrentPosition(
          (ergebnis) => {
            if (abgebrochen) return;
            kartenPositionUebernehmenRef.current(
              ergebnis.coords.latitude,
              ergebnis.coords.longitude
            );
          },
          () => {
            // Standortzugriff abgelehnt oder nicht verfügbar - die Vorauswahl
            // bleibt dann einfach aus, kein Blocker für die manuelle Eingabe.
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
    });

    return () => {
      abgebrochen = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Karte soll nur einmal beim Einhängen aufgebaut werden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function kartentypSetzen(typ: Kartentyp) {
    setKartentyp(typ);
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    ebenenRef.current = kartenebeneSetzen(L, map, ebenenRef.current, typ);
  }

  // Geocoding: von Straße/Ort zur Karte.
  async function aufKarteSuchen() {
    const adresse = [strasse, ort].filter((teil) => teil.trim() !== "").join(", ");
    if (!adresse) return;
    setLaedt(true);
    setFehler(null);
    try {
      const antwort = await fetch(`/api/geocode?q=${encodeURIComponent(adresse)}`);
      const daten = await antwort.json();
      if (!antwort.ok) {
        setFehler(daten.fehler ?? "Adresse nicht gefunden.");
        return;
      }
      setPosition({ lat: daten.breitengrad, lng: daten.laengengrad });
      platziereMarker(daten.breitengrad, daten.laengengrad, true);
    } catch {
      setFehler("Adresssuche gerade nicht erreichbar. Bitte später noch einmal versuchen.");
    } finally {
      setLaedt(false);
    }
  }

  function beiEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void aufKarteSuchen();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="strasse">Straße</Label>
          <Input
            id="strasse"
            name="strasse"
            value={strasse}
            onChange={(event) => setStrasse(event.target.value)}
            onKeyDown={beiEnter}
            placeholder="z.B. Musterweg 3"
          />
        </div>
        <div>
          <Label htmlFor="ort">PLZ und Ort</Label>
          <Input
            id="ort"
            name="ort"
            value={ort}
            onChange={(event) => setOrt(event.target.value)}
            onKeyDown={beiEnter}
            placeholder="z.B. 12345 Musterstadt"
          />
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={() => void aufKarteSuchen()}
        disabled={laedt}
        className="w-full sm:w-auto sm:self-start"
      >
        Auf Karte suchen
      </Button>

      <p className="text-xs text-muted">
        Adresse eingeben und suchen oder direkt auf die Karte klicken bzw. den Punkt verschieben.
        Adresse und Karte gleichen sich dabei gegenseitig an.
      </p>
      {fehler && <p className="text-xs text-gefahr">{fehler}</p>}

      <div
        className={
          istVollbild
            ? "fixed inset-0 z-50 flex flex-col gap-2 bg-background p-3"
            : "flex flex-col gap-2"
        }
      >
        <div className="flex items-center justify-between gap-2">
          <KartentypUmschalter kartentyp={kartentyp} onChange={kartentypSetzen} />
          <VollbildButton istVollbild={istVollbild} onToggle={vollbildUmschalten} />
        </div>

        {/* Die Größe hängt an diesem äußeren Element, nicht an mapContainerRef
            selbst: Leaflet hängt seine eigene CSS-Klasse direkt an das
            Karten-Element an, und React würde sie beim Umschalten der
            Klassen hier überschreiben und damit wieder entfernen. */}
        <div
          className={
            istVollbild
              ? "w-full flex-1 overflow-hidden rounded-md border border-border"
              : "h-80 w-full overflow-hidden rounded-md border border-border sm:h-96 lg:h-[30rem]"
          }
        >
          <div ref={mapContainerRef} className="h-full w-full" />
        </div>
      </div>

      {position && (
        <div>
          <Label htmlFor="koordinaten-anzeige">Koordinaten</Label>
          <Input
            id="koordinaten-anzeige"
            readOnly
            value={`${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`}
            className="text-muted"
          />
        </div>
      )}

      <input type="hidden" name="breitengrad" value={position?.lat ?? ""} />
      <input type="hidden" name="laengengrad" value={position?.lng ?? ""} />
    </div>
  );
}
