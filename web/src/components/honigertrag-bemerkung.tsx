"use client";

import { useState } from "react";
import { Button, Input, Switch } from "@/components/ui";

// Kurze Einordnung zum Honigertrag, direkt unter dessen Zeile in den
// Stammdaten - der Ertrag selbst bekommt bewusst keine Note, das hier ist
// der einzige Platz für Kontext (z.B. "schwaches Trachtjahr"). Gesperrt, bis
// der Schalter es freigibt, damit nichts versehentlich überschrieben wird.
export function HonigertragBemerkung({
  koeniginId,
  bemerkung,
  action,
}: {
  koeniginId: string;
  bemerkung: string;
  action: (koeniginId: string, formData: FormData) => Promise<void>;
}) {
  const [offen, setOffen] = useState(false);
  const [text, setText] = useState(bemerkung);
  const [laeuft, setLaeuft] = useState(false);

  async function speichern() {
    setLaeuft(true);
    try {
      const daten = new FormData();
      daten.set("honigertragBemerkung", text);
      await action(koeniginId, daten);
      setOffen(false);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="honigertragBemerkung" className="text-xs text-muted">
          Bemerkung zum Ertrag
        </label>
        <Switch
          checked={offen}
          onChange={() => {
            // Beim Zusperren ohne Speichern zurück auf den Stand aus der
            // Datenbank - sonst stünde da ein Text, den es nicht gibt.
            if (offen) setText(bemerkung);
            setOffen(!offen);
          }}
          label="Bemerkung zum Ertrag bearbeiten"
        />
      </div>
      <div className="mt-1 flex items-center gap-2">
        <Input
          id="honigertragBemerkung"
          value={text}
          disabled={!offen}
          onChange={(event) => setText(event.target.value)}
          placeholder={offen ? "z.B. schwaches Trachtjahr" : bemerkung ? undefined : "Keine Bemerkung"}
          className="text-sm"
        />
        {offen && (
          <Button type="button" onClick={speichern} disabled={laeuft} className="shrink-0 px-3 py-2 text-xs">
            {laeuft ? "…" : "Speichern"}
          </Button>
        )}
      </div>
    </div>
  );
}
