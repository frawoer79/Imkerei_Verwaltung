"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { FotoAusschnittEditor } from "@/components/foto-ausschnitt-editor";
import { IconBild, IconKamera } from "@/components/icons";

type Ausschnitt = {
  zoom: number;
  fokusX: number;
  fokusY: number;
};
type Modus = "ansehen" | "ausschnitt" | "neuerAusschnitt";

// Antippen des Standortfotos öffnet es in Bildschirmgröße - mit der
// Möglichkeit, es auszutauschen, zu entfernen oder den angezeigten
// Bildausschnitt von Hand anzupassen. Genaues Gegenstück zu koenigin-foto.tsx:
// der Ausschnitt wird beim Einfügen eines neuen Fotos gleich mitgewählt (statt
// erst hinterher in einem zweiten Schritt), sonst schneidet der Rahmen einfach
// die Mitte heraus.
//
// Zwei Auslöser, siehe `vorschau`: der kleine runde Knopf im Kopfbanner der
// Bienenstand-Seite (dort liegt das Foto schon großflächig hinter dem Knopf)
// und das quadratische Vorschaubild in der Kachel der Startseite (dort ist das
// Bild selbst der Knopf).
export function BienenstandFotoLightbox({
  bienenstandId,
  dateiname,
  zoom,
  fokusX,
  fokusY,
  action,
  ausschnittAction,
  vorschau = false,
  knopfKlasse = "absolute right-3 top-3 z-20",
}: {
  bienenstandId: string;
  dateiname: string | null;
  zoom: number;
  fokusX: number;
  fokusY: number;
  action: (bienenstandId: string, formData: FormData) => Promise<{ fehler?: string }>;
  ausschnittAction: (bienenstandId: string, ausschnitt: Ausschnitt) => Promise<void>;
  /// Statt des runden Icon-Knopfs das Foto selbst als quadratisches
  /// Vorschaubild zeigen - so wie in der Kachel der Startseite.
  vorschau?: boolean;
  /// Zusätzliche Klassen für den Auslöser, vor allem zum Positionieren.
  knopfKlasse?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dateiRef = useRef<HTMLInputElement>(null);
  const [modus, setModus] = useState<Modus>("ansehen");
  const [laeuft, setLaeuft] = useState(false);
  const position = `${fokusX * 100}% ${fokusY * 100}%`;
  // Frisch gewählte Datei samt Vorschau-Adresse: erst wird der Ausschnitt
  // gewählt, dann geht beides zusammen zum Server.
  const [neuesFoto, setNeuesFoto] = useState<{ datei: File; url: string } | null>(null);

  useEffect(() => {
    return () => {
      if (neuesFoto) URL.revokeObjectURL(neuesFoto.url);
    };
  }, [neuesFoto]);

  function oeffnen() {
    if (dateiname) {
      setModus("ansehen");
      dialogRef.current?.showModal();
    } else {
      dateiRef.current?.click();
    }
  }

  function dateiGewaehlt(event: React.ChangeEvent<HTMLInputElement>) {
    const datei = event.target.files?.[0];
    if (!datei) return;
    if (neuesFoto) URL.revokeObjectURL(neuesFoto.url);
    setNeuesFoto({ datei, url: URL.createObjectURL(datei) });
    setModus("neuerAusschnitt");
    event.target.value = "";
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }

  async function neuesFotoSpeichern(gewaehlt: Ausschnitt) {
    if (!neuesFoto) return;
    const daten = new FormData();
    daten.set("standortFoto", neuesFoto.datei);
    daten.set("zoom", String(gewaehlt.zoom));
    daten.set("fokusX", String(gewaehlt.fokusX));
    daten.set("fokusY", String(gewaehlt.fokusY));
    const ergebnis = await action(bienenstandId, daten);
    if (ergebnis.fehler) return ergebnis.fehler;
    dialogRef.current?.close();
    setNeuesFoto(null);
    setModus("ansehen");
  }

  async function entfernen() {
    setLaeuft(true);
    try {
      const daten = new FormData();
      daten.set("standortFotoEntfernen", "ja");
      await action(bienenstandId, daten);
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

      <input ref={dateiRef} type="file" accept="image/*" onChange={dateiGewaehlt} className="hidden" />

      <dialog
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Foto des Standorts</h2>
            <button
              type="button"
              onClick={() => {
                setNeuesFoto(null);
                setModus("ansehen");
                dialogRef.current?.close();
              }}
              aria-label="Schließen"
              className="text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>

          {modus === "neuerAusschnitt" && neuesFoto && (
            <>
              <p className="text-sm text-muted">
                Welcher Teil des Fotos soll im Kopfbanner zu sehen sein? Ziehen verschiebt, Kneifen
                oder Mausrad zoomt.
              </p>
              <FotoAusschnittEditor
                bildUrl={neuesFoto.url}
                start={{ zoom: 1, fokusX: 0.5, fokusY: 0.5 }}
                speichernBeschriftung="Foto speichern"
                onAbbrechen={() => {
                  setNeuesFoto(null);
                  if (dateiname) setModus("ansehen");
                  else dialogRef.current?.close();
                }}
                onSpeichern={neuesFotoSpeichern}
              />
            </>
          )}

          {modus === "ausschnitt" && dateiname && (
            <FotoAusschnittEditor
              bildUrl={`/bilder/${dateiname}`}
              hinweis="Der quadratische Rahmen zeigt genau den Ausschnitt, der in der Kachel auf der Startseite erscheint. Das breite Kopfbanner der Bienenstand-Seite zeigt um denselben Mittelpunkt herum mehr."
              start={{ zoom, fokusX, fokusY }}
              onAbbrechen={() => setModus("ansehen")}
              onSpeichern={async (ausschnitt) => {
                await ausschnittAction(bienenstandId, ausschnitt);
                dialogRef.current?.close();
              }}
            />
          )}

          {modus === "ansehen" && dateiname && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/bilder/${dateiname}`}
                alt="Standort"
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
              <div data-schreibt className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setModus("ausschnitt")}
                >
                  Ausschnitt anpassen
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => dateiRef.current?.click()}
                >
                  Foto ändern
                </Button>
                <Button type="button" variant="danger" onClick={entfernen} disabled={laeuft}>
                  {laeuft ? "…" : "Entfernen"}
                </Button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
