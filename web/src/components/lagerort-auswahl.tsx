"use client";

import { useState } from "react";
import { Input, Label, Select } from "@/components/ui";

const NEU_WERT = "__neu__";
const KEIN_WERT = "";

// Lagerort-Auswahl für Material und Erzeugnis-Buchungen: komplett optional
// ("Kein Lagerort" als Vorgabe), bestehende Orte aus der Datenbank plus eine
// Option, um direkt einen neuen anzulegen - analog zur Dokumentkategorie-
// Auswahl. Der neue Name landet serverseitig gleich als Lagerort, siehe
// lagerortIdAufloesen() in lib/actions.ts.
export function LagerortAuswahl({
  lagerorte,
  idPrefix,
  defaultLagerortId = "",
  label = "Lagerort (optional)",
}: {
  lagerorte: { id: string; name: string }[];
  idPrefix: string;
  defaultLagerortId?: string;
  label?: string;
}) {
  const [wert, setWert] = useState(defaultLagerortId || KEIN_WERT);
  const neu = wert === NEU_WERT;

  return (
    <div>
      <Label htmlFor={`${idPrefix}-lagerort`}>{label}</Label>
      <Select
        id={`${idPrefix}-lagerort`}
        name={neu ? undefined : "lagerortId"}
        value={wert}
        onChange={(event) => setWert(event.target.value)}
      >
        <option value={KEIN_WERT}>Kein Lagerort</option>
        {lagerorte.map((ort) => (
          <option key={ort.id} value={ort.id}>
            {ort.name}
          </option>
        ))}
        <option value={NEU_WERT}>+ Neuer Lagerort …</option>
      </Select>
      {neu && (
        <Input
          name="neuerLagerort"
          placeholder="Name des neuen Lagerorts"
          required
          autoFocus
          className="mt-2"
        />
      )}
    </div>
  );
}
