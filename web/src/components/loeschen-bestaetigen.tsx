"use client";

import { useRef } from "react";
import { Button } from "@/components/ui";
import { FormularFehler, SicheresFormular, type AktionsErgebnis } from "@/components/sicheres-formular";

// Einfache Ja/Abbrechen-Rückfrage vor dem endgültigen Löschen - ohne den
// Namen abtippen zu müssen. Der Knopf öffnet nur das Popup, erst "Ja,
// löschen" schickt die Aktion ab.
export function LoeschenBestaetigen({
  action,
  knopfText,
  frage,
  hinweis,
}: {
  action: (formData: FormData) => Promise<AktionsErgebnis>;
  knopfText: string;
  frage: string;
  hinweis: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button type="button" data-schreibt variant="danger" onClick={() => dialogRef.current?.showModal()}>
        {knopfText}
      </Button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <SicheresFormular action={action} className="flex flex-col gap-3 p-5">
          <h2 className="text-lg font-semibold">{frage}</h2>
          <p className="text-sm text-muted">{hinweis}</p>
          <FormularFehler />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
              Abbrechen
            </Button>
            <Button type="submit" variant="danger">
              Ja, löschen
            </Button>
          </div>
        </SicheresFormular>
      </dialog>
    </>
  );
}
