"use client";

import { useState } from "react";
import { Input, Label, Select } from "@/components/ui";
import { STANDARDARBEITEN } from "@/lib/standardarbeiten";

export function alsDatumWert(datum: Date | null | undefined): string {
  if (!datum) return "";
  const zweistellig = (zahl: number) => zahl.toString().padStart(2, "0");
  return `${datum.getFullYear()}-${zweistellig(datum.getMonth() + 1)}-${zweistellig(datum.getDate())}`;
}

// Die Felder einer Maßnahme - identisch beim Anlegen und beim Bearbeiten.
// Über die Auswahl oben landet eine der üblichen Arbeiten im Textfeld, wo sie
// noch angepasst werden kann; frei tippen geht weiterhin.
export function MassnahmeFelder({
  idPraefix,
  text = "",
  faelligAm = null,
}: {
  idPraefix: string;
  text?: string;
  faelligAm?: Date | null;
}) {
  const [wert, setWert] = useState(text);

  return (
    <>
      <div className="flex-1">
        <Label htmlFor={`${idPraefix}-standard`}>Standardarbeit</Label>
        <Select
          id={`${idPraefix}-standard`}
          value=""
          onChange={(event) => {
            if (event.target.value) setWert(event.target.value);
          }}
        >
          <option value="">Auswählen …</option>
          {STANDARDARBEITEN.map((gruppe) => (
            <optgroup key={gruppe.titel} label={gruppe.titel}>
              {gruppe.arbeiten.map((arbeit) => (
                <option key={arbeit} value={arbeit}>
                  {arbeit}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      <div className="flex-[2]">
        <Label htmlFor={`${idPraefix}-text`}>Maßnahme</Label>
        <Input
          id={`${idPraefix}-text`}
          name="text"
          value={wert}
          onChange={(event) => setWert(event.target.value)}
          placeholder="oben auswählen oder frei eintippen"
          required
        />
      </div>

      <div>
        <Label htmlFor={`${idPraefix}-faellig`}>Fällig am</Label>
        <Input
          id={`${idPraefix}-faellig`}
          name="faelligAm"
          type="date"
          defaultValue={alsDatumWert(faelligAm)}
        />
      </div>
    </>
  );
}
