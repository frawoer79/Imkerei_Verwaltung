"use client";

import { useState } from "react";
import { Button, Label, Select } from "@/components/ui";

export type ExportStand = { id: string; name: string; voelker: { id: string; name: string }[] };

// Auswahl für den Behandlungsnachweis: Jahr, dazu entweder alle Stände, ein
// Stand mit allen seinen Völkern oder ein einzelnes Volk. Beim Absenden
// erzeugt der Server die PDF-Datei und legt sie dauerhaft ab - sie erscheint
// dann in der Liste darunter.
export function NachweisExport({
  action,
  jahre,
  staende,
}: {
  action: (formData: FormData) => void;
  jahre: number[];
  staende: ExportStand[];
}) {
  const [jahr, setJahr] = useState(jahre[0]?.toString() ?? "");
  const [umfang, setUmfang] = useState<"ALLE" | "STAND" | "VOLK">("ALLE");
  const [standId, setStandId] = useState(staende[0]?.id ?? "");
  const [volkId, setVolkId] = useState(
    staende.find((stand) => stand.voelker.length > 0)?.voelker[0]?.id ?? ""
  );
  const [laeuft, setLaeuft] = useState(false);

  const alleVoelker = staende.flatMap((stand) =>
    stand.voelker.map((volk) => ({ ...volk, standName: stand.name }))
  );

  const bereit =
    umfang === "ALLE" || (umfang === "STAND" ? Boolean(standId) : Boolean(volkId));

  // Bewusst kein <form action={...}>: React setzt ein Formular nach einer
  // Server-Aktion zurück, und bei Auswahlfeldern springt dabei nur die Anzeige
  // im Browser auf den Ausgangswert, ohne dass React davon erfährt. Der zweite
  // Klick auf "PDF erstellen" hätte dann einen Nachweis mit falschem Umfang
  // erzeugt. Die Werte liegen ohnehin im Zustand der Komponente, also schicken
  // wir sie direkt.
  async function erstellen() {
    setLaeuft(true);
    try {
      const daten = new FormData();
      daten.set("jahr", jahr);
      daten.set("umfang", umfang);
      if (umfang === "STAND") daten.set("standId", standId);
      if (umfang === "VOLK") daten.set("volkId", volkId);
      await action(daten);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="jahr">Jahr</Label>
          <Select
            id="jahr"
            name="jahr"
            value={jahr}
            onChange={(event) => setJahr(event.target.value)}
          >
            {jahre.map((eintrag) => (
              <option key={eintrag} value={eintrag}>
                {eintrag}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="umfang">Umfang</Label>
          <Select
            id="umfang"
            name="umfang"
            value={umfang}
            onChange={(event) => setUmfang(event.target.value as "ALLE" | "STAND" | "VOLK")}
          >
            <option value="ALLE">Alle Stände</option>
            <option value="STAND">Ein Stand, alle Völker</option>
            <option value="VOLK">Ein einzelnes Volk</option>
          </Select>
        </div>
      </div>

      {umfang === "STAND" && (
        <div>
          <Label htmlFor="standId">Bienenstand</Label>
          <Select
            id="standId"
            name="standId"
            value={standId}
            onChange={(event) => setStandId(event.target.value)}
          >
            {staende.map((stand) => (
              <option key={stand.id} value={stand.id}>
                {stand.name} ({stand.voelker.length}{" "}
                {stand.voelker.length === 1 ? "Volk" : "Völker"})
              </option>
            ))}
          </Select>
        </div>
      )}

      {umfang === "VOLK" && (
        <div>
          <Label htmlFor="volkId">Volk</Label>
          <Select
            id="volkId"
            name="volkId"
            value={volkId}
            onChange={(event) => setVolkId(event.target.value)}
          >
            {alleVoelker.map((volk) => (
              <option key={volk.id} value={volk.id}>
                {volk.standName} · {volk.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Button type="button" onClick={erstellen} disabled={!bereit || laeuft}>
          {laeuft ? "PDF wird erstellt …" : "PDF erstellen"}
        </Button>
        <p className="text-xs text-muted">
          Die Datei bleibt gespeichert, bis du sie löschst. Du kannst sie jederzeit wieder
          herunterladen oder verschicken.
        </p>
      </div>
    </div>
  );
}
