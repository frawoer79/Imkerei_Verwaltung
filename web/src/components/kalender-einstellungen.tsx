"use client";

import { useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import {
  ERINNERUNGEN,
  ERINNERUNG_STANDARD,
  FARBE_STANDARD,
  KALENDER_FARBEN,
  TITEL_STANDARD,
  titelBauen,
} from "@/lib/kalender";

// Wie die Termine im Kalender aussehen sollen. Alles darf so bleiben wie es
// ist - dann gelten die Vorgaben.
export function KalenderEinstellungen({
  action,
  erinnerung,
  farbe,
  titel,
}: {
  action: (formData: FormData) => void;
  erinnerung: string | null;
  farbe: string | null;
  titel: string | null;
}) {
  // Alle drei Felder halten ihren Wert selbst. Ohne das setzt React sie nach
  // dem Absenden der Server-Aktion auf ihren Ausgangswert zurück - gespeichert
  // war zwar das Richtige, angezeigt aber wieder der alte Stand, und ein
  // zweiter Klick auf Speichern hätte den überschrieben.
  const [gewaehlteErinnerung, setGewaehlteErinnerung] = useState(
    erinnerung ?? ERINNERUNG_STANDARD
  );
  const [gewaehlteFarbe, setGewaehlteFarbe] = useState(farbe ?? FARBE_STANDARD);
  const [muster, setMuster] = useState(titel ?? "");
  const [gespeichert, setGespeichert] = useState(false);
  const [laeuft, setLaeuft] = useState(false);

  // Bewusst kein <form action={...}>: React setzt ein Formular nach einer
  // Server-Aktion zurück, und bei Auswahlfeldern springt dabei nur die
  // Anzeige im Browser auf den Ausgangswert, ohne dass React davon erfährt.
  // Gespeichert wurde dann zwar das Richtige, aber ein zweiter Klick auf
  // Speichern hätte den zurückgesprungenen Wert übernommen. Alle drei Werte
  // liegen ohnehin im Zustand der Komponente, also schicken wir sie direkt.
  async function speichern() {
    setLaeuft(true);
    try {
      const daten = new FormData();
      daten.set("kalenderErinnerung", gewaehlteErinnerung);
      daten.set("kalenderFarbe", gewaehlteFarbe);
      daten.set("kalenderTitel", muster);
      await action(daten);
      setGespeichert(true);
      setTimeout(() => setGespeichert(false), 3000);
    } finally {
      setLaeuft(false);
    }
  }

  const vorschau = titelBauen(muster, {
    massnahme: "Schwarmkontrolle",
    volk: "Volk 1",
    stand: "Bienenstand Waldrand",
  });

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">Darstellung der Termine</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="kalenderErinnerung">Erinnerung</Label>
          <Select
            id="kalenderErinnerung"
            name="kalenderErinnerung"
            value={gewaehlteErinnerung}
            onChange={(event) => setGewaehlteErinnerung(event.target.value)}
          >
            {ERINNERUNGEN.map((eintrag) => (
              <option key={eintrag.wert} value={eintrag.wert}>
                {eintrag.label}
                {eintrag.wert === ERINNERUNG_STANDARD ? " (Standard)" : ""}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="kalenderFarbe">Farbe der Termine</Label>
          <Select
            id="kalenderFarbe"
            name="kalenderFarbe"
            value={gewaehlteFarbe}
            onChange={(event) => setGewaehlteFarbe(event.target.value)}
          >
            {KALENDER_FARBEN.map((eintrag) => (
              <option key={eintrag.wert} value={eintrag.wert}>
                {eintrag.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="kalenderTitel">Titel des Termins</Label>
        <Input
          id="kalenderTitel"
          name="kalenderTitel"
          value={muster}
          onChange={(event) => setMuster(event.target.value)}
          placeholder={TITEL_STANDARD}
        />
        <p className="mt-1 text-xs text-muted">
          Platzhalter: <code className="font-mono">{"{massnahme}"}</code>,{" "}
          <code className="font-mono">{"{volk}"}</code>,{" "}
          <code className="font-mono">{"{stand}"}</code>. Leer lassen für den Standard{" "}
          <code className="font-mono">{TITEL_STANDARD}</code>.
        </p>
        <p className="mt-1 text-xs">
          <span className="text-muted">So sähe ein Termin aus: </span>
          <span className="font-medium">{vorschau}</span>
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={speichern} disabled={laeuft}>
            {laeuft ? "Wird gespeichert …" : "Darstellung speichern"}
          </Button>
          {gespeichert && <span className="text-sm text-accent">Gespeichert ✓</span>}
        </div>
        <p className="text-xs text-muted">
          Änderungen greifen beim nächsten Abgleich des Kalenders, nicht sofort.
        </p>
      </div>

      <p className="rounded-md border border-border bg-background p-3 text-xs text-muted">
        <b className="text-foreground">Zur Farbe:</b> Apple übernimmt sie bei abonnierten
        Kalendern meist nicht, sondern nimmt die Farbe, die in der Kalender-App für das Abo
        eingestellt ist. Verlässlich änderst du sie deshalb am iPhone: Kalender-App → Kalender →
        beim Abo auf ⓘ tippen → Farbe wählen. Die Einstellung hier wirkt bei anderen Programmen,
        die sie beachten.
      </p>
    </div>
  );
}
