"use client";

import { useRef } from "react";
import { Button, Select } from "@/components/ui";
import { IconStatus } from "@/components/icons";
import { AKTION_KACHEL, AKTION_SYMBOL } from "@/components/volk-aktion-kachel";

// Status des Volkes ändern (aktiv, aufgelöst, verkauft, verloren). Früher
// stand dafür ein Auswahlfeld mit eigenem Knopf im Kopf der Volkskachel; jetzt
// ein Knopf in der Leiste, der das Feld in einem Dialog öffnet. Der aktuelle
// Status steht als Plakette direkt unter dem Namen. Die Seite gibt der
// Komponente `key={status}`: nach dem Speichern entsteht sie neu und der Dialog
// schließt sich von selbst (wie beim Umzug). Bleibt der Status gleich, gäbe es
// keinen neuen key: dann schließt der Dialog direkt, ohne zu speichern.
export function VolkStatusDialog({
  status,
  optionen,
  action,
}: {
  status: string;
  optionen: { wert: string; label: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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
            if (gewaehlt === status) {
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
          <Select name="status" defaultValue={status} aria-label="Status">
            {optionen.map((option) => (
              <option key={option.wert} value={option.wert}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button type="submit">Status speichern</Button>
        </form>
      </dialog>
    </>
  );
}
