"use client";

import { useId, useState } from "react";

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
}: {
  name: string;
  label: string;
  defaultValue?: number | null;
  letzterWert?: number | null;
  min?: number;
  max?: number;
}) {
  const labelId = useId();
  const [wert, setWert] = useState<number | null>(defaultValue ?? null);
  const vorschlag = wert === null && letzterWert != null ? Math.min(max, Math.max(min, letzterWert)) : null;

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
