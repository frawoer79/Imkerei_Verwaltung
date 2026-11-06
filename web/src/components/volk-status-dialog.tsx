"use client";

import { useRef, useState } from "react";
import { Button, Input, Label, Select, WahlChip } from "@/components/ui";
import { IconStatus } from "@/components/icons";
import { AKTION_KACHEL, AKTION_SYMBOL } from "@/components/volk-aktion-kachel";
import { VerkaufFelder } from "@/components/verkauf-felder";
import { heuteAlsInputWert } from "@/lib/datum";

// Status des Volkes ändern (aktiv, aufgelöst, verkauft, verloren). Früher
// stand dafür ein Auswahlfeld mit eigenem Knopf im Kopf der Volkskachel; jetzt
// ein Knopf in der Leiste, der das Feld in einem Dialog öffnet. Der aktuelle
// Status steht als Plakette direkt unter dem Namen. Die Seite gibt der
// Komponente `key={status}`: nach dem Speichern entsteht sie neu und der Dialog
// schließt sich von selbst (wie beim Umzug). Bleibt der Status gleich, gäbe es
// keinen neuen key: dann schließt der Dialog direkt, ohne zu speichern.
//
// Bei "verkauft" fragt der Dialog Volk oder Ableger, Datum, Erlös und Käufer
// ab. Das landet in der Verkaufsliste (Lager -> Verkäufe). Ist das Volk schon
// verkauft, lassen sich die Angaben hier ändern.
export function VolkStatusDialog({
  status,
  optionen,
  action,
  verkauf = null,
}: {
  status: string;
  optionen: { wert: string; label: string }[];
  action: (formData: FormData) => Promise<void>;
  verkauf?: { art: "VOLK" | "ABLEGER"; datum: string; preis: number | null; kaeufer: string } | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [wahl, setWahl] = useState(status);
  const [verkaufArt, setVerkaufArt] = useState<"VOLK" | "ABLEGER">(verkauf?.art ?? "VOLK");

  return (
    <>
      <button type="button" data-schreibt className={AKTION_KACHEL} onClick={() => dialogRef.current?.showModal()}>
        <IconStatus className={AKTION_SYMBOL} />
        Status
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <form
          action={action}
          onSubmit={(event) => {
            const gewaehlt = new FormData(event.currentTarget).get("status");
            if (gewaehlt === status && status !== "VERKAUFT") {
              event.preventDefault();
              dialogRef.current?.close();
            }
          }}
          className="flex flex-col gap-4 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Status ändern</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Schließen"
              className="text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>
          <Select name="status" value={wahl} onChange={(event) => setWahl(event.target.value)} aria-label="Status">
            {optionen.map((option) => (
              <option key={option.wert} value={option.wert}>
                {option.label}
              </option>
            ))}
          </Select>

          {wahl === "VERKAUFT" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <WahlChip gruppe="verkauf-art" aktiv={verkaufArt === "VOLK"} onWahl={() => setVerkaufArt("VOLK")}>
                  Als Volk
                </WahlChip>
                <WahlChip gruppe="verkauf-art" aktiv={verkaufArt === "ABLEGER"} onWahl={() => setVerkaufArt("ABLEGER")}>
                  Als Ableger
                </WahlChip>
              </div>
              <input type="hidden" name="verkaufArt" value={verkaufArt} />
              <div>
                <Label htmlFor="volk-verkauf-datum">Verkauft am</Label>
                <Input
                  id="volk-verkauf-datum"
                  name="datum"
                  type="date"
                  defaultValue={verkauf?.datum ?? heuteAlsInputWert()}
                  required
                />
              </div>
              <VerkaufFelder idPrefix="volk-verkauf" preis={verkauf?.preis ?? null} kaeufer={verkauf?.kaeufer ?? ""} />
              <p className="text-xs text-muted">Steht danach in der Liste unter Lager → Verkäufe.</p>
            </div>
          )}

          <Button type="submit">Status speichern</Button>
        </form>
      </dialog>
    </>
  );
}
