"use client";

import { useState } from "react";
import { Input, Label } from "@/components/ui";
import { preisFeld } from "@/lib/warenwert";

// Erlös und Käufer eines Verkaufs: beim Auslagern mit Grund "Verkauf", wenn
// ein Volk auf "verkauft" gesetzt wird, bei der Königin und in der
// Verkaufsliste. Gesendet werden die Felder `preis` und `kaeufer`.
//
// `vorschlag` (z.B. aus der Preisliste) steht im Feld, solange man selbst
// nichts eingetippt hat, und wandert mit, wenn sich die Menge ändert.
export function VerkaufFelder({
  idPrefix,
  preis = null,
  kaeufer = "",
  vorschlag = null,
  vorschlagHinweis = "Vorschlag aus deiner Preisliste.",
}: {
  idPrefix: string;
  preis?: number | null;
  kaeufer?: string;
  vorschlag?: number | null;
  vorschlagHinweis?: string;
}) {
  const [eigener, setEigener] = useState<string | null>(preis === null ? null : preisFeld(preis));
  const wert = eigener ?? (vorschlag === null ? "" : preisFeld(vorschlag));
  const zeigtVorschlag = eigener === null && vorschlag !== null;

  return (
    <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-3">
      <div>
        <Label htmlFor={`${idPrefix}-preis`}>Erlös (€)</Label>
        <Input
          id={`${idPrefix}-preis`}
          name="preis"
          inputMode="decimal"
          placeholder="0,00"
          value={wert}
          onChange={(event) => setEigener(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-kaeufer`}>An wen (freiwillig)</Label>
        <Input id={`${idPrefix}-kaeufer`} name="kaeufer" defaultValue={kaeufer} placeholder="z.B. Hofladen" />
      </div>
      {zeigtVorschlag && <p className="col-span-2 -mt-1.5 text-xs text-muted">{vorschlagHinweis}</p>}
    </div>
  );
}
