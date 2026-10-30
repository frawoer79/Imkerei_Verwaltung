"use client";

import { useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { FormularFehler, SicheresFormular, SpeichernKnopf } from "@/components/sicheres-formular";
import { heuteAlsInputWert } from "@/lib/datum";

// "Buchungen als PDF": Zeitraum und Erzeugnis wählen, der Server legt die
// Datei ab wie eine Lagerliste (unten in der Liste und unter Dokumente).
export function BuchungslisteExport({
  erzeugnisse,
  erstellen,
}: {
  erzeugnisse: { id: string; name: string }[];
  erstellen: (formData: FormData) => Promise<{ fehler: string } | void>;
}) {
  const [offen, setOffen] = useState(false);
  const heute = heuteAlsInputWert();

  if (!offen) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOffen(true)}>
        Buchungen als PDF
      </Button>
    );
  }
  return (
    <div data-lesen-erlaubt>
      <SicheresFormular
        action={erstellen}
        beiErfolg={() => setOffen(false)}
        className="flex flex-col gap-3 rounded-lg border border-dashed border-accent p-3"
      >
        <p className="text-sm font-semibold">Buchungen als PDF</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="buchungen-von">Von</Label>
            <Input id="buchungen-von" name="von" type="date" defaultValue={`${heute.slice(0, 4)}-01-01`} required />
          </div>
          <div>
            <Label htmlFor="buchungen-bis">Bis</Label>
            <Input id="buchungen-bis" name="bis" type="date" defaultValue={heute} required />
          </div>
        </div>
        <div>
          <Label htmlFor="buchungen-erzeugnis">Erzeugnis</Label>
          <Select id="buchungen-erzeugnis" name="erzeugnistypId" defaultValue="">
            <option value="">Alle Erzeugnisse</option>
            {erzeugnisse.map((erzeugnis) => (
              <option key={erzeugnis.id} value={erzeugnis.id}>
                {erzeugnis.name}
              </option>
            ))}
          </Select>
        </div>
        <FormularFehler />
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOffen(false)}>
            Abbrechen
          </Button>
          <SpeichernKnopf sendetText="PDF wird erstellt …">PDF erstellen</SpeichernKnopf>
        </div>
      </SicheresFormular>
    </div>
  );
}
