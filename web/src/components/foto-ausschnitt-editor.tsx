"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function clamp(wert: number, min: number, max: number) {
  return Math.min(max, Math.max(min, wert));
}

type Ausschnitt = {
  zoom: number;
  fokusX: number;
  fokusY: number;
};

// Bildausschnitt von Hand festlegen: Ziehen verschiebt (Maus oder ein
// Finger), Mausrad oder Zwei-Finger-Kneifen zoomt. Arbeitet mit jeder
// Bildadresse - auch mit einer gerade erst ausgewählten, noch nicht
// hochgeladenen Datei (Objekt-URL), damit man den Ausschnitt schon beim
// Einfügen wählen kann statt hinterher.
//
// Das Bild deckt den Rahmen immer randlos ab (`object-cover`), genau wie
// später in Kopfbanner und Kachel-Vorschau. Herauszoomen endet bei Zoom 1
// dort, wo das gerade noch ohne leeren Rand geht - weiter heraus gäbe es
// einen. Verschieben wirkt frei in beide Richtungen; was über den Rahmen
// hinausragt, wird beim Anzeigen abgeschnitten, im Originalbild ändert sich
// nichts.
//
// Rechnet in Bildschirmpixeln (Rahmengröße + Bild-Originalgröße), das
// Ergebnis wird als Fokuspunkt (Bruchteil 0-1 von Bildbreite/-höhe) plus
// Zoom gespeichert. Dieselbe object-position/transform-Formel wie hier läuft
// auch in der Anzeige - dadurch wirkt ein einmal gewählter Ausschnitt in
// jeder Anzeigegröße konsistent, ohne dass dort erneut die Bildmaße bekannt
// sein müssen.
export function FotoAusschnittEditor({
  bildUrl,
  start,
  onSpeichern,
  onAbbrechen,
  seitenverhaeltnis = "1 / 1",
  hinweis,
  speichernBeschriftung = "Übernehmen",
}: {
  bildUrl: string;
  start: Ausschnitt;
  /// Darf eine Fehlermeldung zurückgeben - die erscheint dann im Editor,
  /// statt dass der Klick auf Speichern scheinbar nichts tut.
  onSpeichern: (ausschnitt: Ausschnitt) => Promise<string | void>;
  onAbbrechen: () => void;
  /// Form des Rahmens - so, wie das Bild später angezeigt wird. Was hier zu
  /// sehen ist, ist auch später zu sehen.
  seitenverhaeltnis?: string;
  hinweis?: string;
  speichernBeschriftung?: string;
}) {
  const rahmenRef = useRef<HTMLDivElement>(null);
  const bildGroesse = useRef<{ w: number; h: number } | null>(null);
  const rahmenGroesse = useRef<{ w: number; h: number } | null>(null);
  const zeiger = useRef(new Map<number, { x: number; y: number }>());
  const pinchAbstand = useRef<number | null>(null);
  const pinchMitte = useRef<{ x: number; y: number } | null>(null);

  const [ausschnitt, setAusschnitt] = useState<Ausschnitt>(start);
  const [laeuft, setLaeuft] = useState(false);
  const [bereit, setBereit] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  // Zoom 1 entspricht dieser Basis-Skalierung: die größere der beiden Seiten
  // (`object-cover` - das Bild deckt den Rahmen ab, ein leerer Rand ist nicht
  // möglich).
  function basisZoom(): number {
    const bild = bildGroesse.current;
    const rahmen = rahmenGroesse.current;
    if (!bild || !rahmen) return 1;
    return Math.max(rahmen.w / bild.w, rahmen.h / bild.h);
  }

  // Verschiebt den Ausschnitt um (dx, dy) Bildschirmpixel - unabhängig vom
  // aktuellen Zoom, weil die Größe des sichtbaren Bilds (und damit der
  // Spielraum fürs Verschieben) für jede Berechnung frisch aus dem
  // aktuellen Zoom ermittelt wird. Wirkt in beide Richtungen frei.
  function verschieben(dx: number, dy: number) {
    const bild = bildGroesse.current;
    const rahmen = rahmenGroesse.current;
    if (!bild || !rahmen) return;
    setAusschnitt((vorher) => {
      const anzeigeSkalierung = basisZoom() * vorher.zoom;
      const breite = bild.w * anzeigeSkalierung;
      const hoehe = bild.h * anzeigeSkalierung;
      const spielraumX = rahmen.w - breite;
      const spielraumY = rahmen.h - hoehe;
      const fokusX =
        spielraumX === 0 ? vorher.fokusX : clamp((spielraumX * vorher.fokusX + dx) / spielraumX, 0, 1);
      const fokusY =
        spielraumY === 0 ? vorher.fokusY : clamp((spielraumY * vorher.fokusY + dy) / spielraumY, 0, 1);
      return { ...vorher, fokusX, fokusY };
    });
  }

  function zoomen(faktor: number) {
    setAusschnitt((vorher) => ({ ...vorher, zoom: clamp(vorher.zoom * faktor, MIN_ZOOM, MAX_ZOOM) }));
  }

  function abstandUndMitteAktuellerZeiger() {
    const punkte = [...zeiger.current.values()];
    if (punkte.length < 2) return null;
    const [a, b] = punkte;
    return {
      abstand: Math.hypot(a.x - b.x, a.y - b.y),
      mitte: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    if (zeiger.current.size === 0) {
      const rect = rahmenRef.current?.getBoundingClientRect();
      if (rect) rahmenGroesse.current = { w: rect.width, h: rect.height };
    }
    zeiger.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const info = abstandUndMitteAktuellerZeiger();
    pinchAbstand.current = info?.abstand ?? null;
    pinchMitte.current = info?.mitte ?? null;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const vorherigePosition = zeiger.current.get(event.pointerId);
    if (!vorherigePosition) return;
    const neuePosition = { x: event.clientX, y: event.clientY };
    zeiger.current.set(event.pointerId, neuePosition);

    if (zeiger.current.size === 1) {
      verschieben(neuePosition.x - vorherigePosition.x, neuePosition.y - vorherigePosition.y);
      return;
    }

    const info = abstandUndMitteAktuellerZeiger();
    if (!info) return;
    if (pinchAbstand.current) zoomen(info.abstand / pinchAbstand.current);
    if (pinchMitte.current) verschieben(info.mitte.x - pinchMitte.current.x, info.mitte.y - pinchMitte.current.y);
    pinchAbstand.current = info.abstand;
    pinchMitte.current = info.mitte;
  }

  function pointerBeenden(event: ReactPointerEvent<HTMLDivElement>) {
    zeiger.current.delete(event.pointerId);
    const info = abstandUndMitteAktuellerZeiger();
    pinchAbstand.current = info?.abstand ?? null;
    pinchMitte.current = info?.mitte ?? null;
  }

  // Mausrad nativ statt über React onWheel: React fasst Wheel-Handler sonst
  // als passiv auf, dann lässt sich das Scrollen der Seite dahinter nicht
  // verhindern und die Seite scrollt beim Zoomen mit.
  useEffect(() => {
    const rahmen = rahmenRef.current;
    if (!rahmen) return;
    function handler(event: WheelEvent) {
      event.preventDefault();
      zoomen(event.deltaY < 0 ? 1.1 : 1 / 1.1);
    }
    rahmen.addEventListener("wheel", handler, { passive: false });
    return () => rahmen.removeEventListener("wheel", handler);
  }, []);

  const position = `${ausschnitt.fokusX * 100}% ${ausschnitt.fokusY * 100}%`;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={rahmenRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={pointerBeenden}
        onPointerCancel={pointerBeenden}
        style={{ aspectRatio: seitenverhaeltnis }}
        // Breite gedeckelt: ein quadratischer Rahmen über die volle
        // Dialogbreite würde am Desktop den halben Bildschirm füllen. Für die
        // Vorschau zählt allein das Seitenverhältnis, nicht die Größe.
        className="relative mx-auto w-full max-w-sm touch-none overflow-hidden rounded-md border border-border bg-background"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bildUrl}
          alt="Foto"
          draggable={false}
          onLoad={(event) => {
            bildGroesse.current = {
              w: event.currentTarget.naturalWidth,
              h: event.currentTarget.naturalHeight,
            };
            const rect = rahmenRef.current?.getBoundingClientRect();
            if (rect) rahmenGroesse.current = { w: rect.width, h: rect.height };
            setBereit(true);
          }}
          className="absolute inset-0 h-full w-full select-none object-cover"
          style={{
            objectPosition: position,
            transform: `scale(${ausschnitt.zoom})`,
            transformOrigin: position,
          }}
        />
        {!bereit && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">Lädt …</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Ziehen zum Verschieben, Kneifen oder Mausrad zum Zoomen.</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoomen(1 / 1.2)}
            aria-label="Verkleinern"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-background"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => zoomen(1.2)}
            aria-label="Vergrößern"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-background"
          >
            +
          </button>
        </div>
      </div>

      {hinweis && <p className="text-xs text-muted">{hinweis}</p>}

      {fehler && (
        <p role="alert" className="rounded-md border border-gefahr-rand bg-gefahr-flaeche px-3 py-2 text-sm text-gefahr">
          {fehler}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onAbbrechen} className="flex-1">
          Abbrechen
        </Button>
        <Button
          type="button"
          disabled={laeuft}
          onClick={async () => {
            setLaeuft(true);
            setFehler(null);
            try {
              const meldung = await onSpeichern(ausschnitt);
              if (meldung) setFehler(meldung);
            } catch (fehler) {
              // Z.B. keine Verbindung, oder die Seite stammt noch von vor dem
              // letzten Update der App - dann kennt der Server die Aktion
              // dahinter nicht mehr und nur Neuladen hilft. Die technische
              // Kurzmeldung dahinter wird mit angezeigt, statt nur im
              // (für Frank nicht einsehbaren) Server-Log zu landen - sie
              // hilft beim Eingrenzen, falls Neuladen nicht reicht.
              const technisch = fehler instanceof Error ? fehler.message : String(fehler);
              setFehler(
                `Speichern hat nicht geklappt. Bitte die Seite neu laden und es noch einmal versuchen. (${technisch})`
              );
            } finally {
              setLaeuft(false);
            }
          }}
          className="flex-1"
        >
          {laeuft ? "Wird gespeichert …" : speichernBeschriftung}
        </Button>
      </div>
    </div>
  );
}
