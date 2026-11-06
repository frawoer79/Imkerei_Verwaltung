"use client";

import { useEffect, useId, useState } from "react";

// Plus/Minus-Steller statt Zahl eintippen - beim Volk-Check in der Praxis
// (oft am Smartphone, manchmal mit Handschuhen) einfacher zu treffen als ein
// kleines Zahlenfeld.
// Startet leer ("–"), solange kein Wert vorgegeben ist: ein nicht
// angefasster Steller schickt nichts mit und wird als "nicht erfasst"
// gespeichert, nicht als 0. Minus unter das Minimum leert ihn wieder.
//
// Mit `letzterWert` (z.B. besetzte Wabengassen der letzten Durchsicht) steht
// die alte Zahl grau als "letztes Mal" in der Mitte: ein Tipp darauf
// übernimmt sie, das erste Plus/Minus zählt von ihr aus statt von 0.
// Gespeichert wird sie trotzdem nur, wenn der Steller angefasst wurde.
export function ZahlStepper({
  name,
  label,
  defaultValue,
  letzterWert,
  min = 0,
  max = 30,
  vorzeichen = false,
  beiAenderung,
}: {
  name: string;
  label: string;
  defaultValue?: number | null;
  letzterWert?: number | null;
  min?: number;
  max?: number;
  /// Gegeben/entnommen: der Steller läuft von "–" aus in beide Richtungen,
  /// +2 heißt gegeben, −2 entnommen, 0 ist wieder leer. Grenzen über
  /// min (negativ) und max.
  vorzeichen?: boolean;
  /// Meldet jeden neuen Wert, z.B. für eine Summe über mehrere Steller.
  beiAenderung?: (wert: number | null) => void;
}) {
  const labelId = useId();
  const [wert, setWert] = useState<number | null>(defaultValue ?? null);
  const vorschlag = wert === null && letzterWert != null ? Math.min(max, Math.max(min, letzterWert)) : null;
  // Läuft auch, wenn sich nur der Rückruf ändert - der Empfänger übergeht
  // gleiche Werte, so entsteht keine Schleife.
  useEffect(() => {
    beiAenderung?.(wert);
  }, [wert, beiAenderung]);

  if (vorzeichen) {
    const zahl = wert ?? 0;
    const schritt = (delta: number) =>
      setWert((w) => {
        const neu = Math.min(max, Math.max(min, (w ?? 0) + delta));
        return neu === 0 ? null : neu;
      });
    return (
      <div role="group" aria-labelledby={labelId}>
        <p id={labelId} className="mb-1 block text-sm font-medium text-muted">
          {label}
        </p>
        <input type="hidden" name={name} value={wert ?? ""} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => schritt(-1)}
            disabled={zahl <= min}
            aria-label={`${label} entnehmen`}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-rand-ruhig bg-card text-2xl font-medium hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <span
            aria-live="polite"
            className="flex min-h-12 w-10 flex-1 flex-col items-center justify-center leading-tight"
          >
            <span className="text-lg font-semibold tabular-nums">
              {wert === null ? "–" : wert > 0 ? `+${wert}` : `−${-wert}`}
            </span>
            {wert !== null && (
              <span className={`text-xs ${wert > 0 ? "text-ok" : "text-warnung"}`}>
                {wert > 0 ? "gegeben" : "entnommen"}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => schritt(1)}
            disabled={zahl >= max}
            aria-label={`${label} geben`}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-rand-ruhig bg-card text-2xl font-medium hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    // Das Feld ist versteckt - der Name hängt deshalb als Gruppenbeschriftung
    // an Knöpfen und Zahl (statt als <label> an einem unsichtbaren Feld).
    <div role="group" aria-labelledby={labelId}>
      <p id={labelId} className="mb-1 block text-sm font-medium text-muted">
        {label}
      </p>
      <input type="hidden" name={name} value={wert ?? ""} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            setWert((w) => {
              if (w === null) return vorschlag === null || vorschlag <= min ? null : vorschlag - 1;
              return w <= min ? null : w - 1;
            })
          }
          disabled={wert === null && vorschlag === null}
          aria-label={`${label} verringern`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-rand-ruhig bg-card text-2xl font-medium hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        {vorschlag !== null ? (
          <button
            type="button"
            onClick={() => setWert(vorschlag)}
            aria-label={`Wert der letzten Durchsicht übernehmen: ${vorschlag}`}
            className="flex min-h-12 w-10 flex-1 flex-col items-center justify-center rounded-md border border-dashed border-rand-ruhig leading-tight text-muted hover:text-foreground"
          >
            <span className="text-lg font-semibold tabular-nums">{vorschlag}</span>
            <span className="text-xs">letztes Mal</span>
          </button>
        ) : (
          <span aria-live="polite" className="w-10 flex-1 text-center text-lg font-semibold tabular-nums">
            {wert ?? "–"}
          </span>
        )}
        <button
          type="button"
          onClick={() => setWert((w) => (w === null ? Math.min(max, (vorschlag ?? min) + 1) : Math.min(max, w + 1)))}
          disabled={wert !== null && wert >= max}
          aria-label={`${label} erhöhen`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-rand-ruhig bg-card text-2xl font-medium hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
