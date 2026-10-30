"use client";

import { useRef, useState } from "react";
import { kgAnzeige, kurzesDatum } from "@/lib/honig";
import { IconWaage } from "@/components/icons";

/// Eine Gewichtsmessung im Verlauf - aktuell immer aus einem Stockkarten-
/// Eintrag (`gewichtKg`). Absichtlich nur Datum + Gewicht: eine spätere
/// Anbindung der Beelogger-Stockwaage müsste hier nur weitere Messungen in
/// dieselbe Liste einreihen, ohne dass sich an Komponente oder Diagramm
/// etwas ändert.
export type GewichtsMessung = {
  datum: string; // ISO, damit sich die Liste als Server-Prop übergeben lässt
  gewichtKg: number;
};

// Feste Zeichenfläche (SVG-Koordinaten) - das Element selbst skaliert per
// `aspect-ratio` responsiv, die Koordinaten bleiben davon unberührt.
const BREITE = 640;
const HOEHE = 280;
const RAND_LINKS = 46;
const RAND_RECHTS = 14;
const RAND_OBEN = 14;
const RAND_UNTEN = 30;
const PLOT_BREITE = BREITE - RAND_LINKS - RAND_RECHTS;
const PLOT_HOEHE = HOEHE - RAND_OBEN - RAND_UNTEN;

function GewichtsChart({ verlauf }: { verlauf: GewichtsMessung[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState(verlauf.length - 1);

  const zeiten = verlauf.map((messung) => new Date(messung.datum).getTime());
  const werte = verlauf.map((messung) => messung.gewichtKg);
  const minZeit = Math.min(...zeiten);
  const maxZeit = Math.max(...zeiten);
  const minWertRoh = Math.min(...werte);
  const maxWertRoh = Math.max(...werte);
  // Etwas Luft ober- und unterhalb der Messwerte, sonst klebt die Linie am
  // Rand. Mindestens 0,5 kg, auch wenn alle Messungen (fast) gleich sind.
  const polster = Math.max((maxWertRoh - minWertRoh) * 0.15, 0.5);
  const minWert = minWertRoh - polster;
  const maxWert = maxWertRoh + polster;

  const skaliereX = (zeit: number) =>
    RAND_LINKS + (maxZeit === minZeit ? PLOT_BREITE / 2 : ((zeit - minZeit) / (maxZeit - minZeit)) * PLOT_BREITE);
  const skaliereY = (wert: number) => RAND_OBEN + (1 - (wert - minWert) / (maxWert - minWert)) * PLOT_HOEHE;

  const punkte = verlauf.map((messung, i) => ({
    x: skaliereX(zeiten[i]),
    y: skaliereY(messung.gewichtKg),
    messung,
  }));
  const pfad = punkte.map((punkt, i) => `${i === 0 ? "M" : "L"}${punkt.x.toFixed(1)},${punkt.y.toFixed(1)}`).join(" ");

  const yTicks = [0, 1, 2, 3].map((i) => minWert + (i / 3) * (maxWert - minWert));

  function beiZeigerposition(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const zeigerX = ((e.clientX - rect.left) / rect.width) * BREITE;
    let naechsterIndex = 0;
    let kleinsterAbstand = Infinity;
    punkte.forEach((punkt, i) => {
      const abstand = Math.abs(punkt.x - zeigerX);
      if (abstand < kleinsterAbstand) {
        kleinsterAbstand = abstand;
        naechsterIndex = i;
      }
    });
    setHoverIndex(naechsterIndex);
  }

  const aktiverPunkt = punkte[hoverIndex];

  return (
    <div className="relative w-full" style={{ aspectRatio: `${BREITE} / ${HOEHE}` }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BREITE} ${HOEHE}`}
        className="h-full w-full touch-none select-none"
        onPointerDown={beiZeigerposition}
        onPointerMove={beiZeigerposition}
        onPointerLeave={(e) => {
          // Bei Touch endet der "Zeiger" mit dem Antippen selbst - ein Tap
          // würde die Markierung sonst sofort wieder auf den letzten Punkt
          // zurückspringen lassen, statt bis zum nächsten Antippen stehen
          // zu bleiben. Nur bei einer echten Maus ergibt "verlässt die
          // Fläche" ein Zurückspringen.
          if (e.pointerType === "mouse") setHoverIndex(verlauf.length - 1);
        }}
      >
        {yTicks.map((wert, i) => (
          <g key={i}>
            <line
              x1={RAND_LINKS}
              x2={BREITE - RAND_RECHTS}
              y1={skaliereY(wert)}
              y2={skaliereY(wert)}
              style={{ stroke: "var(--border)" }}
              strokeWidth={1}
            />
            <text
              x={RAND_LINKS - 8}
              y={skaliereY(wert)}
              textAnchor="end"
              dominantBaseline="middle"
              style={{ fill: "var(--muted)", fontSize: 11 }}
            >
              {kgAnzeige(wert)}
            </text>
          </g>
        ))}

        <path
          d={pfad}
          fill="none"
          style={{ stroke: "var(--accent)" }}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {punkte.map((punkt, i) => (
          <circle
            key={i}
            cx={punkt.x}
            cy={punkt.y}
            r={i === hoverIndex ? 6 : 4}
            style={{ fill: "var(--accent)", stroke: "var(--card)" }}
            strokeWidth={2}
          />
        ))}

        {aktiverPunkt && (
          <line
            x1={aktiverPunkt.x}
            x2={aktiverPunkt.x}
            y1={RAND_OBEN}
            y2={HOEHE - RAND_UNTEN}
            style={{ stroke: "var(--muted)" }}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        <text x={RAND_LINKS} y={HOEHE - 8} style={{ fill: "var(--muted)", fontSize: 11 }}>
          {kurzesDatum(new Date(verlauf[0].datum))}
        </text>
        <text
          x={BREITE - RAND_RECHTS}
          y={HOEHE - 8}
          textAnchor="end"
          style={{ fill: "var(--muted)", fontSize: 11 }}
        >
          {kurzesDatum(new Date(verlauf[verlauf.length - 1].datum))}
        </text>
      </svg>

      {aktiverPunkt && (
        <div
          className="pointer-events-none absolute whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs shadow-md"
          style={{
            left: `${(aktiverPunkt.x / BREITE) * 100}%`,
            top: `${(aktiverPunkt.y / HOEHE) * 100}%`,
            marginTop: -8,
            // Am linken/rechten Rand hängt die Sprechblase sonst über den
            // Diagrammrand hinaus - dort wird sie stattdessen am Punkt
            // ausgerichtet statt zentriert.
            transform:
              aktiverPunkt.x / BREITE > 0.85
                ? "translate(-100%, -100%)"
                : aktiverPunkt.x / BREITE < 0.15
                  ? "translate(0, -100%)"
                  : "translate(-50%, -100%)",
          }}
        >
          <span className="font-medium">{kgAnzeige(aktiverPunkt.messung.gewichtKg)} kg</span>
          <span className="ml-1 text-muted">{kurzesDatum(new Date(aktiverPunkt.messung.datum))}</span>
        </div>
      )}
    </div>
  );
}

// Zuletzt gemessenes Gewicht als antippbare Pille - erst ein Antippen öffnet
// das Diagramm mit dem vollständigen Verlauf (natives <dialog>, wie auch
// sonst in der App). Ohne jede Messung wird nichts gerendert - die
// aufrufende Seite muss also nicht selbst prüfen, ob überhaupt Gewichte
// dokumentiert sind.
export function GewichtVerlauf({ verlauf }: { verlauf: GewichtsMessung[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  if (verlauf.length === 0) return null;
  const letzteMessung = verlauf[verlauf.length - 1];

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex items-center gap-1.5 self-start rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-accent"
      >
        <IconWaage className="h-4 w-4 shrink-0" />
        <span className="font-medium">{kgAnzeige(letzteMessung.gewichtKg)} kg</span>
        <span className="text-muted">· {kurzesDatum(new Date(letzteMessung.datum))}</span>
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Gewichtsverlauf</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Schließen"
              className="text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>
          <GewichtsChart verlauf={verlauf} />
        </div>
      </dialog>
    </>
  );
}
