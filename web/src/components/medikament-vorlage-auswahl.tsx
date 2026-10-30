"use client";

import { useRouter } from "next/navigation";
import { Label, Select } from "@/components/ui";
import { MEDIKAMENT_VORLAGEN } from "@/lib/medikament-vorlagen";

// Wechselt die Vorlage über die Adresse, damit das Formular neu mit den
// Werten der Vorlage aufgebaut wird (die Felder sind ungesteuert).
export function MedikamentVorlageAuswahl({ aktuell }: { aktuell?: string }) {
  const router = useRouter();
  return (
    <div>
      <Label htmlFor="vorlage-auswahl">Vorlage</Label>
      <Select
        id="vorlage-auswahl"
        value={aktuell ?? ""}
        onChange={(ereignis) => {
          const wert = ereignis.target.value;
          router.replace(wert ? `/medikamente/neu?vorlage=${wert}` : "/medikamente/neu");
        }}
      >
        <option value="">Ohne Vorlage (alles selbst eintragen)</option>
        {MEDIKAMENT_VORLAGEN.map((vorlage) => (
          <option key={vorlage.schluessel} value={vorlage.schluessel}>
            {vorlage.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
