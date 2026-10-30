"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { EinzelfotoAuswahl } from "@/components/einzelfoto-auswahl";
import { FotoAusschnittEditor } from "@/components/foto-ausschnitt-editor";
import { IconBild, IconKamera } from "@/components/icons";

type Modus = "ansehen" | "bearbeiten" | "ausschnitt";

// Antippen des Beutenfotos öffnet es in Bildschirmgröße - mit der Möglichkeit,
// direkt ein neues Foto aufzunehmen, eines auszuwählen, das vorhandene zu
// entfernen oder den angezeigten Bildausschnitt von Hand anzupassen. Eigene,
// schlanke Aktionen (nur das Foto bzw. nur der Ausschnitt), damit man dafür
// nicht den Umweg über das ganze Bearbeiten-Formular braucht.
//
// Zwei Auslöser, siehe `vorschau`: das quadratische Vorschaubild (Volk-Kachel
// der Standübersicht und Kopfkachel der Volk-Seite, dort ist das Bild selbst
// der Knopf) und ein kleiner runder Icon-Knopf, wenn das Foto anderswo schon
// großflächig zu sehen ist.
export function VolkFotoLightbox({
  volkId,
  dateiname,
  zoom,
  fokusX,
  fokusY,
  action,
  ausschnittAction,
  vorschau = false,
  knopfKlasse = "absolute right-3 top-3 z-20",
}: {
  volkId: string;
  dateiname: string | null;
  zoom: number;
  fokusX: number;
  fokusY: number;
  action: (volkId: string, formData: FormData) => Promise<void>;
  ausschnittAction: (
    volkId: string,
    ausschnitt: { zoom: number; fokusX: number; fokusY: number }
  ) => Promise<void>;
  /// Statt des runden Icon-Knopfs das Foto selbst als quadratisches
  /// Vorschaubild zeigen - so wie in der Volk-Kachel der Standübersicht.
  vorschau?: boolean;
  /// Zusätzliche Klassen für den Auslöser, vor allem zum Positionieren.
  knopfKlasse?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [modus, setModus] = useState<Modus>("ansehen");
  const [laeuft, setLaeuft] = useState(false);
  const position = `${fokusX * 100}% ${fokusY * 100}%`;

  function oeffnen() {
    setModus(dateiname ? "ansehen" : "bearbeiten");
    dialogRef.current?.showModal();
  }

  async function speichern(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLaeuft(true);
    try {
      await action(volkId, new FormData(event.currentTarget));
      dialogRef.current?.close();
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <>
      {vorschau ? (
        <button
          type="button"
          data-schreibt={dateiname ? undefined : ""}
          onClick={oeffnen}
          aria-label={dateiname ? "Foto ansehen" : "Foto hinzufügen"}
          // Die Größe kommt über `knopfKlasse` von der Stelle, die das Bild
          // einsetzt: sie ist jeweils auf die Grundhöhe der umgebenden Karte
          // abgestimmt (Mindesthöhe minus Innenabstand oben und unten), damit
          // rundum derselbe Randabstand entsteht. Wird eins von beiden
          // geändert, muss das andere mit.
          className={`${knopfKlasse} relative shrink-0 overflow-hidden rounded-lg border border-border bg-background`}
        >
          {dateiname ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/bilder/${dateiname}`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: position, transform: `scale(${zoom})`, transformOrigin: position }}
            />
          ) : (
            <IconKamera className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-muted" />
          )}
        </button>
      ) : (
        <button
          type="button"
          data-schreibt={dateiname ? undefined : ""}
          onClick={oeffnen}
          aria-label={dateiname ? "Foto ansehen" : "Foto hinzufügen"}
          className={`${knopfKlasse} flex h-7 w-7 items-center justify-center rounded-full bg-card/90 text-foreground shadow-md ring-1 ring-border hover:bg-card`}
        >
          {dateiname ? <IconBild className="h-4 w-4" /> : <IconKamera className="h-4 w-4" />}
        </button>
      )}

      <dialog
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Foto der Beute</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Schließen"
              className="text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>

          {modus === "bearbeiten" && (
            <form onSubmit={speichern} className="flex flex-col gap-4">
              <EinzelfotoAuswahl
                name="beuteFoto"
                label="Foto"
                bestehendeUrl={dateiname ? `/bilder/${dateiname}` : null}
                entfernenName="beuteFotoEntfernen"
              />
              <Button type="submit" disabled={laeuft}>
                {laeuft ? "Wird gespeichert …" : "Speichern"}
              </Button>
            </form>
          )}

          {modus === "ausschnitt" && dateiname && (
            <FotoAusschnittEditor
              bildUrl={`/bilder/${dateiname}`}
              hinweis="Der quadratische Rahmen zeigt den Ausschnitt, der in der Kachel und in der Kopfkachel der Volk-Seite zu sehen ist."
              start={{ zoom, fokusX, fokusY }}
              onAbbrechen={() => setModus("ansehen")}
              onSpeichern={async (ausschnitt) => {
                await ausschnittAction(volkId, ausschnitt);
                dialogRef.current?.close();
              }}
            />
          )}

          {modus === "ansehen" && dateiname && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/bilder/${dateiname}`}
                alt="Beute"
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
              <div data-schreibt className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setModus("ausschnitt")} className="flex-1">
                  Ausschnitt anpassen
                </Button>
                <Button type="button" variant="secondary" onClick={() => setModus("bearbeiten")} className="flex-1">
                  Foto ändern
                </Button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
