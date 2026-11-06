"use client";

import { useState } from "react";
import Link from "next/link";
import { ZahlStepper } from "@/components/zahl-stepper";
import { WABEN_AENDERUNGS_ARTEN, WABEN_AENDERUNG_MAX, type WabenAenderungsFeld } from "@/lib/waben";

// Waben geben (+) oder entnehmen (−) in einer Durchsicht, je Art ein Steller.
// Mit bekanntem Wabenbestand des Volkes zeigt eine Zeile darunter, wie viele
// Waben danach in der Beute hängen, und Entnehmen geht nur so weit, wie Waben
// da sind - über alle Arten zusammen, denn welche Art eine Wabe gerade hat,
// ändert sich im Volk von selbst.
//
// `bestand`: Zahl = bekannt, null = beim Volk noch nicht erfasst (Hinweis
// zum Nachtragen, Entnehmen ohne Grenze), undefined = keine Angabe (z.B. eine
// Sammel-Durchsicht über Völker mit verschiedenem Bestand).
export function WabenAenderungFelder({
  werte,
  bestand,
  nachtragenHref,
}: {
  werte: Partial<Record<WabenAenderungsFeld, number | null | undefined>>;
  bestand?: number | null;
  nachtragenHref?: string;
}) {
  const [stand, setStand] = useState<Record<string, number>>(() =>
    Object.fromEntries(WABEN_AENDERUNGS_ARTEN.map((art) => [art.feld, werte[art.feld] ?? 0]))
  );
  const summe = Object.values(stand).reduce((a, b) => a + b, 0);
  const danach = typeof bestand === "number" ? bestand + summe : null;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WABEN_AENDERUNGS_ARTEN.map((art) => {
          const eigener = stand[art.feld] ?? 0;
          // Wie weit dieser Steller nach unten darf: so viele Waben, wie nach
          // allen anderen Änderungen noch in der Beute wären.
          const min =
            danach === null
              ? -WABEN_AENDERUNG_MAX
              : Math.min(eigener, Math.max(-WABEN_AENDERUNG_MAX, eigener - danach));
          return (
            <ZahlStepper
              key={art.feld}
              name={art.feld}
              label={art.label}
              defaultValue={werte[art.feld]}
              vorzeichen
              min={min}
              max={WABEN_AENDERUNG_MAX}
              beiAenderung={(wert) =>
                setStand((vorher) => (vorher[art.feld] === (wert ?? 0) ? vorher : { ...vorher, [art.feld]: wert ?? 0 }))
              }
            />
          );
        })}
      </div>
      {danach !== null && (
        <p className="text-sm text-muted">
          In der Beute:{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {summe === 0 ? `${danach} Waben` : `${bestand} → ${danach} Waben`}
          </span>
          {danach === 0 && " - alle Waben entnommen."}
        </p>
      )}
      {bestand === null && (
        <p className="rounded-md border border-warnung-rand bg-warnung-flaeche p-3 text-sm text-warnung">
          Für dieses Volk ist noch nicht erfasst, wie viele Waben es hat. Entnehmen geht trotzdem, die App
          kann aber nicht prüfen, ob so viele Waben da sind.
          {nachtragenHref && (
            <>
              {" "}
              <Link href={nachtragenHref} className="font-semibold underline">
                Waben beim Volk nachtragen
              </Link>
            </>
          )}
        </p>
      )}
    </>
  );
}
