"use client";

import { useEffect, useRef, useState } from "react";
import { BildBetrachter } from "@/components/bild-betrachter";
import { IconKamera } from "@/components/icons";
import { bestaetigen } from "@/lib/bestaetigen";

export type BestehendesFoto = {
  id: string;
  url: string;
  alt: string;
  /// Dateiname beim Herunterladen/Sichern aus dem Foto-Popup.
  speichername: string;
};

const MAX_BILDER = 5;

// Einheitliche Foto-Erfassung für Stockkarten-Einträge: jedes angehängte
// Bild bekommt eine Vorschaukachel mit Lösch-Button, danach kommt eine
// Kachel zum Hinzufügen (Kamera/Mediathek) - bis maximal 5 Bilder insgesamt.
//
// Zwei Betriebsarten:
// - Neuanlegen (kein `aufNeueDateien`): der Eintrag existiert noch nicht,
//   ausgewählte Fotos werden nur lokal vorgehalten (Vorschau + Entfernen)
//   und erst mit dem Absenden des umgebenden Formulars mitgeschickt.
// - Bearbeiten (`bestehende` + `aufNeueDateien` gesetzt): neue Fotos werden
//   sofort einzeln hochgeladen (eigenes, unsichtbares Formular, sendet sich
//   selbst ab) - unabhängig vom Sperren/Entsperren des restlichen Eintrags,
//   genau wie das Löschen vorhandener Fotos.
//
// Antippen eines gespeicherten Fotos öffnet es groß im Zoom-Popup, mit
// Herunterladen bzw. "In Fotos sichern".
export function FotoAuswahl({
  name = "bilder",
  bestehende = [],
  aufBestehendesLoeschen,
  aufNeueDateien,
  betrachterTitel = "Foto",
}: {
  name?: string;
  bestehende?: BestehendesFoto[];
  /** Serveraktion zum sofortigen Löschen eines bereits gespeicherten Fotos. */
  aufBestehendesLoeschen?: (bildId: string) => void;
  /** Serveraktion zum sofortigen Hochladen neuer Fotos (Bearbeiten-Modus). */
  aufNeueDateien?: (formData: FormData) => void;
  /** Überschrift des Foto-Popups. */
  betrachterTitel?: string;
}) {
  const bearbeitenModus = aufNeueDateien !== undefined;

  const inputRef = useRef<HTMLInputElement>(null);
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const dataTransferRef = useRef<DataTransfer>(
    typeof DataTransfer !== "undefined" ? new DataTransfer() : (null as unknown as DataTransfer)
  );
  const [neueFotos, setNeueFotos] = useState<{ datei: File; url: string }[]>([]);
  const [grossIndex, setGrossIndex] = useState<number | null>(null);

  // Object-URLs der lokalen Vorschaubilder (Neuanlegen-Modus) wieder
  // freigeben, wenn die Komponente verlassen wird.
  useEffect(() => {
    return () => {
      neueFotos.forEach((foto) => URL.revokeObjectURL(foto.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gesamtAnzahl = bearbeitenModus ? bestehende.length : bestehende.length + neueFotos.length;
  const platzFrei = MAX_BILDER - gesamtAnzahl;

  function dateienAusgewaehlt(event: React.ChangeEvent<HTMLInputElement>) {
    if (bearbeitenModus) {
      // Direkt hochladen - das eigene Formular sendet sich selbst ab.
      uploadFormRef.current?.requestSubmit();
      return;
    }

    const ausgewaehlt = Array.from(event.target.files ?? []);
    const uebernehmbar = ausgewaehlt.slice(0, Math.max(0, platzFrei));

    for (const datei of uebernehmbar) {
      dataTransferRef.current.items.add(datei);
    }
    if (inputRef.current) {
      inputRef.current.files = dataTransferRef.current.files;
    }
    setNeueFotos(
      Array.from(dataTransferRef.current.files).map((datei) => ({
        datei,
        url: URL.createObjectURL(datei),
      }))
    );
  }

  function neuesFotoEntfernen(index: number) {
    const entfernt = neueFotos[index];
    if (entfernt) URL.revokeObjectURL(entfernt.url);

    const neuerTransfer = new DataTransfer();
    Array.from(dataTransferRef.current.files).forEach((datei, i) => {
      if (i !== index) neuerTransfer.items.add(datei);
    });
    dataTransferRef.current = neuerTransfer;
    if (inputRef.current) {
      inputRef.current.files = neuerTransfer.files;
    }
    setNeueFotos((vorher) => vorher.filter((_, i) => i !== index));
  }

  const dateiAuswahlInput = (
    <input
      ref={inputRef}
      type="file"
      name={name}
      accept="image/*"
      multiple
      onChange={dateienAusgewaehlt}
      className="hidden"
    />
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {bestehende.map((foto, index) => (
          <div key={foto.id} className="relative h-24 w-24">
            <button
              type="button"
              onClick={() => setGrossIndex(index)}
              aria-label={`Foto ${index + 1} groß ansehen`}
              className="h-full w-full cursor-zoom-in rounded-md focus-visible:outline-2 focus-visible:outline-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.url} alt={foto.alt} className="h-full w-full rounded-md border border-border object-cover" />
            </button>
            {aufBestehendesLoeschen && (
              <form
                action={aufBestehendesLoeschen.bind(null, foto.id)}
                onSubmit={(event) => {
                  // Erst nach dem Ja im Popup wirklich abschicken.
                  const formular = event.currentTarget;
                  if (formular.dataset.bestaetigt) {
                    delete formular.dataset.bestaetigt;
                    return;
                  }
                  event.preventDefault();
                  bestaetigen("Dieses Foto wirklich löschen?", { gefahr: true }).then((ja) => {
                    if (!ja) return;
                    formular.dataset.bestaetigt = "1";
                    formular.requestSubmit();
                  });
                }}
              >
                <button
                  type="submit"
                  aria-label="Foto löschen"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-card text-foreground shadow-md ring-1 ring-border hover:bg-background"
                >
                  ✕
                </button>
              </form>
            )}
          </div>
        ))}

        {!bearbeitenModus &&
          neueFotos.map((foto, index) => (
            <div key={foto.url} className="relative h-24 w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.url} alt={foto.datei.name} className="h-full w-full rounded-md border border-border object-cover" />
              <button
                type="button"
                onClick={() => neuesFotoEntfernen(index)}
                aria-label="Foto entfernen"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-card text-foreground shadow-md ring-1 ring-border hover:bg-background"
              >
                ✕
              </button>
            </div>
          ))}

        {gesamtAnzahl < MAX_BILDER && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Foto hinzufügen"
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-background text-muted hover:border-accent hover:text-accent"
          >
            <IconKamera className="h-6 w-6" />
            <span className="text-lg leading-none">+</span>
          </button>
        )}
      </div>

      {bearbeitenModus ? (
        <form ref={uploadFormRef} action={aufNeueDateien}>
          {dateiAuswahlInput}
        </form>
      ) : (
        dateiAuswahlInput
      )}

      <p className="mt-2 text-xs text-muted">
        {gesamtAnzahl}/{MAX_BILDER} Bilder{bestehende.length > 0 && ". Zum Vergrößern antippen."}
      </p>

      <BildBetrachter bilder={bestehende} index={grossIndex} onIndex={setGrossIndex} titel={betrachterTitel} />
    </div>
  );
}
