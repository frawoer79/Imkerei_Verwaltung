"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { IconBild, IconDokument } from "@/components/icons";

// Eine einzelne Datei auswählen (Bild oder PDF) - zeigt den gewählten
// Dateinamen abgesetzt vom Auswählen-Button in einer eigenen Kachel mit
// eigenem ✕ zum Entfernen, statt der knappen nativen Browser-Anzeige
// "Datei auswählen <Dateiname>" in einer Zeile.
//
// Das native `<input type="file">` bleibt technisch vorhanden (für
// `required` und die Formularübermittlung), aber nur visuell versteckt
// (`sr-only`, nicht `display:none`) - sonst kann der Browser bei einem
// Pflichtfeld ohne Auswahl keinen Hinweis mehr anzeigen.
export function DateiAuswahl({
  id,
  name,
  accept,
  required = false,
}: {
  id?: string;
  name: string;
  accept?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [datei, setDatei] = useState<File | null>(null);

  function ausgewaehlt(event: React.ChangeEvent<HTMLInputElement>) {
    setDatei(event.target.files?.[0] ?? null);
  }

  function entfernen() {
    setDatei(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
        Datei auswählen
      </Button>
      {datei && (
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-3 pr-1.5 text-sm">
          {datei.type === "application/pdf" ? (
            <IconDokument className="h-4 w-4 shrink-0 text-muted" />
          ) : (
            <IconBild className="h-4 w-4 shrink-0 text-muted" />
          )}
          <span className="truncate">{datei.name}</span>
          <button
            type="button"
            onClick={entfernen}
            aria-label="Datei entfernen"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted hover:bg-card hover:text-foreground"
          >
            ✕
          </button>
        </span>
      )}
      <input
        ref={inputRef}
        id={id}
        type="file"
        name={name}
        accept={accept}
        required={required}
        onChange={ausgewaehlt}
        className="sr-only"
      />
    </div>
  );
}
