"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
/// Schrittweite der Knöpfe und Tasten.
const SCHRITT_ZOOM = 1.5;
/// Doppeltippen springt auf diesen Zoom und beim nächsten Mal zurück.
const DOPPELTIPP_ZOOM = 3;
/// Freier Rand rundum, damit das eingepasste Bild nicht am Rahmen klebt.
const RAND_PX = 8;
/// Ein Tippen darf nur kurz dauern und kaum wandern, sonst ist es ein Ziehen.
const TIPP_DAUER_MS = 350;
const TIPP_WEG_PX = 8;
/// Zwei Tipper gelten als Doppeltippen, wenn sie so kurz nacheinander kommen
/// und so nah beieinander liegen.
const DOPPELTIPP_PAUSE_MS = 350;
const DOPPELTIPP_ABSTAND_PX = 30;

type Groesse = { breite: number; hoehe: number };
type Punkt = { x: number; y: number };
/// `zoom` 1 = eingepasst; `x` und `y` verschieben das Bild aus der Mitte des
/// Rahmens, in Bildschirmpixeln.
type Ansicht = { zoom: number; x: number; y: number };

const EINGEPASST: Ansicht = { zoom: 1, x: 0, y: 0 };

function clamp(wert: number, min: number, max: number) {
  return Math.min(max, Math.max(min, wert));
}

/// So groß wie möglich, ohne über den Rahmen zu ragen - das Seitenverhältnis
/// bleibt.
function einpassen(inhalt: Groesse, flaeche: Groesse): Groesse {
  const faktor = Math.min(
    Math.max(1, flaeche.breite - 2 * RAND_PX) / inhalt.breite,
    Math.max(1, flaeche.hoehe - 2 * RAND_PX) / inhalt.hoehe,
  );
  return { breite: inhalt.breite * faktor, hoehe: inhalt.hoehe * faktor };
}

/// Hält das Bild im Rahmen: Was kleiner ist als der Rahmen, bleibt mittig;
/// was größer ist, lässt sich nur bis zur Kante verschieben - so geht es nie
/// verloren.
function begrenzen(ansicht: Ansicht, flaeche: Groesse, eingepasst: Groesse): Ansicht {
  const zoom = clamp(ansicht.zoom, MIN_ZOOM, MAX_ZOOM);
  const maxX = Math.max(0, (eingepasst.breite * zoom - flaeche.breite) / 2);
  const maxY = Math.max(0, (eingepasst.hoehe * zoom - flaeche.hoehe) / 2);
  return { zoom, x: clamp(ansicht.x, -maxX, maxX), y: clamp(ansicht.y, -maxY, maxY) };
}

/// Zoomt so, dass der Punkt `um` (Abstand von der Mitte des Rahmens) an seinem
/// Platz bleibt - unter dem Mauszeiger bzw. zwischen den Fingern.
function zoomUm(ansicht: Ansicht, zoom: number, um: Punkt): Ansicht {
  const neu = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const faktor = neu / ansicht.zoom;
  return { zoom: neu, x: um.x - faktor * (um.x - ansicht.x), y: um.y - faktor * (um.y - ansicht.y) };
}

function vonMitte(element: HTMLElement, punkt: Punkt): Punkt {
  const rect = element.getBoundingClientRect();
  return { x: punkt.x - rect.left - rect.width / 2, y: punkt.y - rect.top - rect.height / 2 };
}

// Popup, das einen Inhalt groß zeigt. Ein natives <dialog> wie die anderen
// Popups der App: Escape schließt, der Fokus bleibt im Popup und kehrt beim
// Schließen zurück. Zusätzlich schließt ein Klick neben das Popup.
//
// `children` steht nur im Dokument, solange das Popup offen ist - so beginnt
// jedes Öffnen wieder eingepasst, und nichts davon läuft im Hintergrund.
export function ZoomDialog({
  offen,
  titel,
  onSchliessen,
  children,
}: {
  offen: boolean;
  titel: string;
  onSchliessen: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titelId = useId();
  // Ein Klick zählt nur dann als "neben das Popup", wenn auch das Drücken
  // dort war - sonst schließt es, wenn man ein Bild verschiebt und die Maus
  // außerhalb loslässt.
  const druckAufHintergrund = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (offen && !dialog.open) dialog.showModal();
    if (!offen && dialog.open) dialog.close();
  }, [offen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titelId}
      onClose={onSchliessen}
      onPointerDown={(event) => {
        druckAufHintergrund.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (druckAufHintergrund.current && event.target === event.currentTarget) onSchliessen();
      }}
      className="m-auto h-[calc(100%-1rem)] max-h-[56rem] w-[calc(100%-1rem)] max-w-4xl overflow-hidden rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/60 open:flex open:flex-col"
    >
      {offen && (
        <>
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
            <h2 id={titelId} className="text-lg font-semibold">
              {titel}
            </h2>
            <button
              type="button"
              onClick={onSchliessen}
              aria-label="Schließen"
              className="px-1 text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4">{children}</div>
        </>
      )}
    </dialog>
  );
}

// Die Fläche im Popup: der Inhalt, eingepasst, lässt sich mit dem Mausrad
// oder zwei Fingern (Kneifen) zoomen, durch Ziehen verschieben (Maus oder ein
// Finger) und per Doppeltippen vergrößern. Knöpfe und Tasten (+, -, 0,
// Pfeiltasten) tun dasselbe für alle, die kein Rad und keine zwei Finger haben.
//
// Wie im Foto-Ausschnitt-Editor: Zeigerereignisse für Maus und Finger
// gemeinsam, `touch-none`, damit der Browser das Kneifen nicht für die ganze
// Seite verwendet, und das Mausrad nativ, damit die Seite dahinter nicht
// mitscrollt.
//
// `groesse` sind die Maße des Inhalts (nur das Seitenverhältnis zählt) und
// `children` wird genau in der eingepassten Größe ausgegeben; wer etwas
// zeigt, das erst laden muss, gibt `null`, bis die Maße bekannt sind.
export function ZoomFlaeche({
  groesse,
  beschriftung,
  aktionen,
  children,
}: {
  groesse: Groesse | null;
  /// Für Screenreader: was die Fläche zeigt.
  beschriftung: string;
  /// Zusätzliche Links neben dem Hinweis, z.B. "Original öffnen".
  aktionen?: ReactNode;
  children: ReactNode;
}) {
  const flaecheRef = useRef<HTMLDivElement>(null);
  const [flaeche, setFlaeche] = useState<Groesse | null>(null);
  const [ansicht, setAnsicht] = useState<Ansicht>(EINGEPASST);
  const zeiger = useRef(new Map<number, Punkt>());
  const pinch = useRef<{ abstand: number; mitte: Punkt } | null>(null);
  // Der laufende Tipper, solange er noch keiner zum Ziehen geworden ist
  const tipp = useRef<{ zeit: number; start: Punkt } | null>(null);
  const letzterTipp = useRef<{ zeit: number; ort: Punkt } | null>(null);

  useLayoutEffect(() => {
    const element = flaecheRef.current;
    if (!element) return;
    const messen = () => {
      const breite = element.clientWidth;
      const hoehe = element.clientHeight;
      // Solange das Popup noch zu ist, hat die Fläche keine Größe.
      if (breite === 0 || hoehe === 0) return;
      setFlaeche((vorher) =>
        vorher && vorher.breite === breite && vorher.hoehe === hoehe ? vorher : { breite, hoehe },
      );
    };
    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(element);
    return () => beobachter.disconnect();
  }, []);

  const inhaltBreite = groesse?.breite ?? 0;
  const inhaltHoehe = groesse?.hoehe ?? 0;
  const eingepasst = useMemo(
    () =>
      inhaltBreite > 0 && inhaltHoehe > 0 && flaeche
        ? einpassen({ breite: inhaltBreite, hoehe: inhaltHoehe }, flaeche)
        : null,
    [inhaltBreite, inhaltHoehe, flaeche],
  );

  // Eine Drehung des Tablets oder ein anderes Fenster ändert den Rahmen: dann
  // muss auch eine schon verschobene Ansicht wieder hineinpassen.
  const aktuell = flaeche && eingepasst ? begrenzen(ansicht, flaeche, eingepasst) : ansicht;

  const anwenden = useCallback(
    (aendern: (vorher: Ansicht) => Ansicht) => {
      if (!flaeche || !eingepasst) return;
      setAnsicht((vorher) => begrenzen(aendern(begrenzen(vorher, flaeche, eingepasst)), flaeche, eingepasst));
    },
    [flaeche, eingepasst],
  );

  // Mausrad nativ statt über React onWheel: React fasst Wheel-Handler sonst
  // als passiv auf, dann lässt sich das Scrollen der Seite dahinter nicht
  // verhindern.
  useEffect(() => {
    const element = flaecheRef.current;
    if (!element) return;
    const beiRad = (event: WheelEvent) => {
      event.preventDefault();
      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16; // Zeilen statt Pixel (Firefox)
      else if (event.deltaMode === 2) delta *= element.clientHeight;
      // Kneifen auf dem Touchpad kommt als Mausrad mit gedrückter Strg-Taste,
      // mit viel kleineren Werten.
      const faktor = Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.0015));
      const um = vonMitte(element, { x: event.clientX, y: event.clientY });
      anwenden((vorher) => zoomUm(vorher, vorher.zoom * faktor, um));
    };
    element.addEventListener("wheel", beiRad, { passive: false });
    return () => element.removeEventListener("wheel", beiRad);
  }, [anwenden]);

  function pinchWerte() {
    const [a, b] = [...zeiger.current.values()];
    if (!a || !b) return null;
    return { abstand: Math.hypot(a.x - b.x, a.y - b.y), mitte: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  }

  function beiZeigerRunter(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const ort = { x: event.clientX, y: event.clientY };
    zeiger.current.set(event.pointerId, ort);
    tipp.current = zeiger.current.size === 1 ? { zeit: event.timeStamp, start: ort } : null;
    pinch.current = pinchWerte();
  }

  function beiZeigerBewegt(event: ReactPointerEvent<HTMLDivElement>) {
    const vorher = zeiger.current.get(event.pointerId);
    if (!vorher) return;
    const jetzt = { x: event.clientX, y: event.clientY };
    zeiger.current.set(event.pointerId, jetzt);

    if (zeiger.current.size === 1) {
      const start = tipp.current?.start;
      if (start && Math.hypot(jetzt.x - start.x, jetzt.y - start.y) > TIPP_WEG_PX) tipp.current = null;
      anwenden((a) => ({ ...a, x: a.x + jetzt.x - vorher.x, y: a.y + jetzt.y - vorher.y }));
      return;
    }

    // Zwei Finger: der Abstand bestimmt den Zoom, die Mitte zwischen ihnen
    // die Verschiebung - der Punkt unter den Fingern bleibt dort.
    const davor = pinch.current;
    const jetztPinch = pinchWerte();
    pinch.current = jetztPinch;
    if (!davor || !jetztPinch || davor.abstand === 0) return;
    const von = vonMitte(event.currentTarget, davor.mitte);
    const nach = vonMitte(event.currentTarget, jetztPinch.mitte);
    const faktor = jetztPinch.abstand / davor.abstand;
    anwenden((a) => {
      const gezoomt = zoomUm(a, a.zoom * faktor, von);
      return { ...gezoomt, x: gezoomt.x + nach.x - von.x, y: gezoomt.y + nach.y - von.y };
    });
  }

  function beiZeigerLos(event: ReactPointerEvent<HTMLDivElement>) {
    if (!zeiger.current.delete(event.pointerId)) return;
    pinch.current = pinchWerte();
    const kurz = tipp.current;
    tipp.current = null;
    if (event.type !== "pointerup" || !kurz || event.timeStamp - kurz.zeit > TIPP_DAUER_MS) return;

    const davor = letzterTipp.current;
    const istDoppelt =
      davor &&
      event.timeStamp - davor.zeit < DOPPELTIPP_PAUSE_MS &&
      Math.hypot(kurz.start.x - davor.ort.x, kurz.start.y - davor.ort.y) < DOPPELTIPP_ABSTAND_PX;
    if (!istDoppelt) {
      letzterTipp.current = { zeit: event.timeStamp, ort: kurz.start };
      return;
    }
    letzterTipp.current = null;
    const um = vonMitte(event.currentTarget, kurz.start);
    anwenden((a) => (a.zoom > MIN_ZOOM + 0.01 ? EINGEPASST : zoomUm(a, DOPPELTIPP_ZOOM, um)));
  }

  function beiTaste(event: ReactKeyboardEvent<HTMLDivElement>) {
    const schritt = 60;
    const mitte = { x: 0, y: 0 };
    switch (event.key) {
      case "+":
      case "=":
        anwenden((a) => zoomUm(a, a.zoom * SCHRITT_ZOOM, mitte));
        break;
      case "-":
      case "_":
        anwenden((a) => zoomUm(a, a.zoom / SCHRITT_ZOOM, mitte));
        break;
      case "0":
        anwenden(() => EINGEPASST);
        break;
      case "ArrowLeft":
        anwenden((a) => ({ ...a, x: a.x + schritt }));
        break;
      case "ArrowRight":
        anwenden((a) => ({ ...a, x: a.x - schritt }));
        break;
      case "ArrowUp":
        anwenden((a) => ({ ...a, y: a.y + schritt }));
        break;
      case "ArrowDown":
        anwenden((a) => ({ ...a, y: a.y - schritt }));
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  const knopf =
    "flex h-9 items-center justify-center rounded-md border border-border text-sm hover:bg-background disabled:cursor-not-allowed disabled:opacity-40";
  const eingepasstJetzt = aktuell.zoom <= MIN_ZOOM + 0.001;

  return (
    <>
      <div
        ref={flaecheRef}
        role="group"
        tabIndex={0}
        aria-label={beschriftung}
        onPointerDown={beiZeigerRunter}
        onPointerMove={beiZeigerBewegt}
        onPointerUp={beiZeigerLos}
        onPointerCancel={beiZeigerLos}
        onKeyDown={beiTaste}
        className="relative flex min-h-0 flex-1 cursor-grab touch-none select-none items-center justify-center overflow-hidden rounded-md border border-border bg-background focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing"
      >
        {groesse && eingepasst ? (
          <div
            className="pointer-events-none shrink-0"
            style={{
              width: eingepasst.breite,
              height: eingepasst.hoehe,
              transform: `translate(${aktuell.x}px, ${aktuell.y}px) scale(${aktuell.zoom})`,
            }}
          >
            {children}
          </div>
        ) : (
          <p className="text-sm text-muted">Lädt …</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-xs text-muted">
          Mausrad oder zwei Finger zoomen, Ziehen verschiebt, Doppeltippen vergrößert.
          {aktionen && <> {aktionen}</>}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Verkleinern"
            disabled={eingepasstJetzt}
            onClick={() => anwenden((a) => zoomUm(a, a.zoom / SCHRITT_ZOOM, { x: 0, y: 0 }))}
            className={`${knopf} w-9 text-lg leading-none`}
          >
            −
          </button>
          <button
            type="button"
            aria-label="Vergrößern"
            disabled={aktuell.zoom >= MAX_ZOOM - 0.001}
            onClick={() => anwenden((a) => zoomUm(a, a.zoom * SCHRITT_ZOOM, { x: 0, y: 0 }))}
            className={`${knopf} w-9 text-lg leading-none`}
          >
            +
          </button>
          <button
            type="button"
            disabled={eingepasstJetzt}
            onClick={() => anwenden(() => EINGEPASST)}
            className={`${knopf} px-3`}
          >
            Einpassen
          </button>
        </div>
      </div>
    </>
  );
}

// Ein Bild im Popup. Die Maße kennt erst das geladene Bild; dazu lädt ein
// unsichtbares Exemplar derselben Adresse (kommt danach aus dem Zwischenspeicher
// des Browsers), das sichtbare erscheint erst, wenn die Fläche es einpassen kann.
//
// `aktionen` ersetzt den Link "Original öffnen" neben dem Hinweis; `null`
// lässt ihn weg (z.B. wenn das Popup eigene Knöpfe zum Sichern hat).
export function ZoomBild({ url, alt, aktionen }: { url: string; alt: string; aktionen?: ReactNode }) {
  const [groesse, setGroesse] = useState<Groesse | null>(null);
  const [fehler, setFehler] = useState(false);

  if (fehler) {
    return (
      <p className="rounded-md border border-border bg-background p-3 text-sm">
        Das Bild konnte nicht geladen werden.{" "}
        <a href={url} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
          Datei öffnen
        </a>
      </p>
    );
  }

  return (
    <>
      {!groesse && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="hidden"
          onLoad={(event) => {
            const { naturalWidth: breite, naturalHeight: hoehe } = event.currentTarget;
            // Ein Bild ohne Maße lässt sich nicht einpassen - dann lieber
            // sagen, dass es nicht geht, als ewig "Lädt …" zu zeigen.
            if (breite > 0 && hoehe > 0) setGroesse({ breite, hoehe });
            else setFehler(true);
          }}
          onError={() => setFehler(true)}
        />
      )}
      <ZoomFlaeche
        groesse={groesse}
        beschriftung={alt}
        aktionen={
          aktionen === undefined ? (
            <a href={url} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
              Original öffnen
            </a>
          ) : (
            aktionen
          )
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} draggable={false} className="h-full w-full" />
      </ZoomFlaeche>
    </>
  );
}
