"use client";

import { useEffect, useRef, useState } from "react";
import { IconDokument, IconKamera } from "@/components/icons";
import { ZUCHTKARTE_DATEITYP_HINWEIS, istPdf, zuchtkartenDateityp } from "@/lib/zuchtkarte-datei";

// Genau ein Foto auswählen (Kamera oder Mediathek) - für die Beute selbst,
// nicht für die Wabenbilder der Stockkarte, wo eine kleine Galerie sinnvoll
// ist. Kein `capture`-Attribut nötig: Handys bieten bei accept="image/*"
// von selbst "Foto aufnehmen" neben "Mediathek" an.
//
// Kennt zusätzlich ein schon vorhandenes Foto (Bearbeiten-Fall): das lässt
// sich durch ein neues ersetzen oder ganz entfernen. Welcher der drei
// Zustände (bestehend/neu/keins) gerade gilt, steht bei Absenden über den
// Dateiinhalt bzw. das Entfernen-Feld fest - der Server muss dafür nichts
// zwischenspeichern.
export function EinzelfotoAuswahl({
  name,
  label = "Foto",
  bestehendeUrl = null,
  bestehendeMimeType = null,
  entfernenName,
  erlaubt = "bilder",
}: {
  name: string;
  label?: string;
  /// URL eines bereits gespeicherten Fotos (Bearbeiten-Fall).
  bestehendeUrl?: string | null;
  /// Dateityp der bereits gespeicherten Datei - nur nötig, wenn das auch ein
  /// PDF sein kann (`erlaubt="bilderUndPdf"`).
  bestehendeMimeType?: string | null;
  /// Name des Hidden-Feldes, das "ja" wird, wenn das bestehende Foto beim
  /// Speichern entfernt werden soll (nur relevant, wenn `bestehendeUrl` da ist).
  entfernenName?: string;
  /// "bilderUndPdf" für die Zuchtkarte: ein Scan kommt oft als PDF. Dann wird
  /// auch gleich bei der Auswahl geprüft, ob sich die Datei speichern lässt -
  /// sonst bliebe ein falsches Format unbemerkt, bis die Karte fehlt.
  erlaubt?: "bilder" | "bilderUndPdf";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [vorschau, setVorschau] = useState<{ datei: File; url: string } | null>(null);
  const [bestehendEntfernt, setBestehendEntfernt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const mitPdf = erlaubt === "bilderUndPdf";

  useEffect(() => {
    return () => {
      if (vorschau) URL.revokeObjectURL(vorschau.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ausgewaehlt(event: React.ChangeEvent<HTMLInputElement>) {
    const datei = event.target.files?.[0];
    if (!datei) return;
    if (mitPdf && !zuchtkartenDateityp(datei)) {
      event.target.value = "";
      setFehler(ZUCHTKARTE_DATEITYP_HINWEIS);
      return;
    }
    setFehler(null);
    if (vorschau) URL.revokeObjectURL(vorschau.url);
    setVorschau({ datei, url: URL.createObjectURL(datei) });
  }

  function entfernen() {
    if (vorschau) {
      URL.revokeObjectURL(vorschau.url);
      setVorschau(null);
      if (inputRef.current) inputRef.current.value = "";
    } else {
      setBestehendEntfernt(true);
    }
  }

  const zeigeBestehend = !vorschau && bestehendeUrl && !bestehendEntfernt;
  const bildUrl = vorschau?.url ?? (zeigeBestehend ? bestehendeUrl : null);
  // Ein PDF lässt sich nicht als Bild darstellen - dann steht eine Kachel mit
  // Symbol und Dateiname da.
  const vorschauIstPdf = mitPdf && (vorschau ? zuchtkartenDateityp(vorschau.datei) === "application/pdf" : istPdf(bestehendeMimeType));

  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        {bildUrl ? (
          <div className="relative h-36 w-36">
            {vorschauIstPdf ? (
              <a
                href={bildUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border border-border bg-background p-2 text-center text-xs text-muted hover:border-accent hover:text-accent"
              >
                <IconDokument className="h-8 w-8" />
                <span className="font-medium">PDF</span>
                <span className="line-clamp-2 break-all">{vorschau?.datei.name ?? "zum Öffnen tippen"}</span>
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bildUrl}
                alt=""
                className="h-full w-full rounded-md border border-border object-cover"
              />
            )}
            <button
              type="button"
              onClick={entfernen}
              aria-label="Foto entfernen"
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-card text-foreground shadow-md ring-1 ring-border hover:bg-background"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label={mitPdf ? "Foto oder PDF hinzufügen" : "Foto hinzufügen"}
            className="flex h-36 w-36 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-background text-muted hover:border-accent hover:text-accent"
          >
            <IconKamera className="h-8 w-8" />
            <span className="text-2xl leading-none">+</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          name={vorschau ? name : undefined}
          accept={mitPdf ? "image/*,application/pdf,.heic,.heif,.pdf" : "image/*"}
          onChange={ausgewaehlt}
          className="hidden"
        />
        {entfernenName && bestehendEntfernt && !vorschau && (
          <input type="hidden" name={entfernenName} value="ja" />
        )}
      </div>
      {fehler && (
        <p role="alert" className="mt-2 text-sm text-gefahr">
          {fehler}
        </p>
      )}
    </div>
  );
}
