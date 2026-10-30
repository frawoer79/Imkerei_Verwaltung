"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { FotoAusschnittEditor } from "@/components/foto-ausschnitt-editor";
import { IconKamera } from "@/components/icons";

type Ausschnitt = { zoom: number; fokusX: number; fokusY: number };
type Modus = "ansehen" | "ausschnitt" | "neuerAusschnitt";

// Foto der Königin im Kopf ihrer Seite. Antippen zeigt es groß; dort lässt es
// sich austauschen, der Ausschnitt nachjustieren oder das Foto entfernen.
//
// Wichtig beim Einfügen: der Ausschnitt wird gleich mitgewählt, bevor
// gespeichert wird. Sonst schneidet der quadratische Rahmen einfach die Mitte
// heraus - und die Königin sitzt auf einem Foto selten genau dort.
export function KoeniginFoto({
  koeniginId,
  dateiname,
  kennung,
  ausschnitt,
  action,
  ausschnittAction,
}: {
  koeniginId: string;
  dateiname: string | null;
  kennung: string;
  ausschnitt: Ausschnitt;
  action: (koeniginId: string, formData: FormData) => Promise<void>;
  ausschnittAction: (koeniginId: string, ausschnitt: Ausschnitt) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dateiRef = useRef<HTMLInputElement>(null);
  const [modus, setModus] = useState<Modus>("ansehen");
  const [laeuft, setLaeuft] = useState(false);
  // Frisch gewählte Datei samt Vorschau-Adresse: erst wird der Ausschnitt
  // gewählt, dann geht beides zusammen zum Server.
  const [neuesFoto, setNeuesFoto] = useState<{ datei: File; url: string } | null>(null);

  useEffect(() => {
    return () => {
      if (neuesFoto) URL.revokeObjectURL(neuesFoto.url);
    };
  }, [neuesFoto]);

  const position = `${ausschnitt.fokusX * 100}% ${ausschnitt.fokusY * 100}%`;

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
    daten.set("foto", neuesFoto.datei);
    daten.set("zoom", String(gewaehlt.zoom));
    daten.set("fokusX", String(gewaehlt.fokusX));
    daten.set("fokusY", String(gewaehlt.fokusY));
    await action(koeniginId, daten);
    setNeuesFoto(null);
    dialogRef.current?.close();
  }

  async function entfernen() {
    setLaeuft(true);
    try {
      const daten = new FormData();
      daten.set("fotoEntfernen", "ja");
      await action(koeniginId, daten);
      dialogRef.current?.close();
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <>
      <button
        type="button"
        data-schreibt={dateiname ? undefined : ""}
        onClick={oeffnen}
        aria-label={dateiname ? `Foto von ${kennung} vergrößern` : "Foto der Königin hinzufügen"}
        className="h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-background text-muted transition-shadow hover:border-accent hover:text-accent hover:shadow-md sm:h-40 sm:w-40"
      >
        {dateiname ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/bilder/${dateiname}`}
            alt={`Königin ${kennung}`}
            className="h-full w-full object-cover"
            style={{
              objectPosition: position,
              transform: `scale(${ausschnitt.zoom})`,
              transformOrigin: position,
            }}
          />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1">
            <IconKamera className="h-8 w-8" />
            <span className="text-xs">Foto der Königin</span>
          </span>
        )}
      </button>

      <input
        ref={dateiRef}
        type="file"
        accept="image/*"
        onChange={dateiGewaehlt}
        className="hidden"
      />

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Königin {kennung}</h2>
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
                Welcher Teil des Fotos soll im Kopf zu sehen sein? Ziehen verschiebt, Kneifen oder
                Mausrad zoomt.
              </p>
              <FotoAusschnittEditor
                bildUrl={neuesFoto.url}
                seitenverhaeltnis="1 / 1"
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
            <>
              <p className="text-sm text-muted">
                Ziehen verschiebt, Kneifen oder Mausrad zoomt.
              </p>
              <FotoAusschnittEditor
                bildUrl={`/bilder/${dateiname}`}
                seitenverhaeltnis="1 / 1"
                start={ausschnitt}
                onAbbrechen={() => setModus("ansehen")}
                onSpeichern={async (gewaehlt) => {
                  await ausschnittAction(koeniginId, gewaehlt);
                  setModus("ansehen");
                }}
              />
            </>
          )}

          {modus === "ansehen" && dateiname && (
            <>
              {/* Ganzes Bild, nicht der Ausschnitt - im Popup will man sie
                  vollständig sehen. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/bilder/${dateiname}`}
                alt={`Königin ${kennung}`}
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
