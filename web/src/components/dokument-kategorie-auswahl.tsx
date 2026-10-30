"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui";

const NEU_WERT = "__neu__";

// Kategorie-Auswahl beim Hochladen eines Dokuments: bestehende Kategorien
// aus der Datenbank plus eine Option, um direkt eine neue anzulegen - dafür
// klappt ein Textfeld auf, dessen Wert die Server-Aktion als neue Kategorie
// anlegt (siehe `dokumentAnlegen` in lib/actions.ts).
export function DokumentKategorieAuswahl({
  kategorien,
}: {
  kategorien: { id: string; name: string }[];
}) {
  const [neu, setNeu] = useState(false);

  return (
    <div>
      <Select
        id="kategorieId"
        name={neu ? undefined : "kategorieId"}
        defaultValue={kategorien[0]?.id ?? NEU_WERT}
        onChange={(ereignis) => setNeu(ereignis.target.value === NEU_WERT)}
        required={!neu}
      >
        {kategorien.map((kategorie) => (
          <option key={kategorie.id} value={kategorie.id}>
            {kategorie.name}
          </option>
        ))}
        <option value={NEU_WERT}>+ Eigene Kategorie …</option>
      </Select>
      {neu && (
        <Input
          name="neueKategorie"
          placeholder="Name der neuen Kategorie"
          required
          autoFocus
          className="mt-2"
        />
      )}
    </div>
  );
}
