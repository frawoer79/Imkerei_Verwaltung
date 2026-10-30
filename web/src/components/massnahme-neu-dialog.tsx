"use client";

import { useRef } from "react";
import { Button } from "@/components/ui";
import { MassnahmeFuerVoelkerAnlegen } from "@/components/massnahme-fuer-volk-anlegen";

type Stand = { id: string; name: string; voelker: { id: string; name: string }[] };

// Das Formular "Neue Maßnahme" als Popup (natives <dialog>, mittig wie alle
// Dialoge): Auf der Maßnahmen-Seite steht damit zuerst die Liste, das
// Anlegen ist nur einen Tipp entfernt. Die Seite setzt beim Speichern einen
// neuen key (Anzahl der Maßnahmen) - dann wird der Dialog neu aufgebaut,
// schließt sich und startet leer.
export function MassnahmeNeuDialog({ staende }: { staende: Stand[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button type="button" data-schreibt onClick={() => dialogRef.current?.showModal()}>
        + Neue Maßnahme
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="massnahme-neu-titel"
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 id="massnahme-neu-titel" className="text-lg font-semibold">
              Neue Maßnahme
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Schließen"
              className="-mr-3 inline-flex h-12 w-12 cursor-pointer items-center justify-center text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>
          <MassnahmeFuerVoelkerAnlegen staende={staende} />
        </div>
      </dialog>
    </>
  );
}
