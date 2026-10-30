"use client";

import { useEffect, useState } from "react";
import { ZoomBild, ZoomDialog } from "@/components/zoom-dialog";

export type BetrachterBild = {
  id: string;
  url: string;
  alt: string;
  /// Name der Datei beim Herunterladen bzw. Sichern.
  speichername: string;
};

// Fotos eines Stockkarten-Eintrags groß ansehen: Antippen eines
// Vorschaubilds öffnet das Zoom-Popup (Mausrad/zwei Finger, Ziehen,
// Doppeltippen), mit Blättern zwischen den Fotos des Eintrags und Knöpfen zum
// Sichern - am PC als Download, am iPhone/iPad über das Teilen-Menü, das
// "Bild sichern" (Fotos-App) anbietet.
//
// Gesteuert von außen: `index` ist das offene Foto, `null` heißt zu.
export function BildBetrachter({
  bilder,
  index,
  onIndex,
  titel,
}: {
  bilder: BetrachterBild[];
  index: number | null;
  onIndex: (index: number | null) => void;
  titel: string;
}) {
  const bild = index !== null ? bilder[index] : undefined;
  const anzahl = bilder.length;

  return (
    <ZoomDialog offen={bild !== undefined} titel={titel} onSchliessen={() => onIndex(null)}>
      {bild && index !== null && (
        <>
          {/* `key`: beim Blättern beginnt jedes Foto wieder eingepasst. */}
          <ZoomBild key={bild.url} url={bild.url} alt={bild.alt} aktionen={null} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
            {anzahl > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Vorheriges Foto"
                  onClick={() => onIndex((index - 1 + anzahl) % anzahl)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-lg leading-none hover:bg-background"
                >
                  ‹
                </button>
                <span className="min-w-20 text-center text-sm text-muted">
                  Foto {index + 1} von {anzahl}
                </span>
                <button
                  type="button"
                  aria-label="Nächstes Foto"
                  onClick={() => onIndex((index + 1) % anzahl)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-lg leading-none hover:bg-background"
                >
                  ›
                </button>
              </div>
            ) : (
              <span />
            )}
            <SichernKnoepfe key={bild.url} bild={bild} />
          </div>
        </>
      )}
    </ZoomDialog>
  );
}

// iPhone/iPad: Safari legt einen Download in der Dateien-App ab, nicht in
// Fotos. In die Fotos-App kommt ein Bild nur über das Teilen-Menü ("Bild
// sichern"). iPads melden sich als Mac, verraten sich aber durch Touch.
function istAppleMobil(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

type Geladen = { datei: File; objektUrl: string; teilen: "fotos" | "teilen" | null };

// Lädt das Foto einmal in den Speicher (kommt meist aus dem Zwischenspeicher
// des Browsers): Das Teilen-Menü braucht die Datei selbst, und Safari öffnet
// es nur direkt nach dem Antippen - ein Abruf erst beim Tippen wäre zu spät.
// Der Download nutzt dieselbe Datei; als blob:-Adresse wird er auch in der
// Home-Bildschirm-App nicht von der Dateiansicht abgefangen.
function SichernKnoepfe({ bild }: { bild: BetrachterBild }) {
  const [geladen, setGeladen] = useState<Geladen | null>(null);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    let abgebrochen = false;
    let objektUrl: string | null = null;
    (async () => {
      try {
        const antwort = await fetch(bild.url, { credentials: "same-origin" });
        if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
        const blob = await antwort.blob();
        if (abgebrochen) return;
        const datei = new File([blob], bild.speichername, { type: blob.type || "image/jpeg" });
        objektUrl = URL.createObjectURL(blob);
        // Teilen nur auf Touch-Geräten anbieten - am PC öffnet es sonst den
        // Teilen-Dialog von Windows/macOS statt einfach herunterzuladen.
        const kannTeilen =
          typeof navigator.canShare === "function" &&
          window.matchMedia("(any-pointer: coarse)").matches &&
          navigator.canShare({ files: [datei] });
        setGeladen({ datei, objektUrl, teilen: kannTeilen ? (istAppleMobil() ? "fotos" : "teilen") : null });
      } catch {
        if (!abgebrochen) setFehler(true);
      }
    })();
    return () => {
      abgebrochen = true;
      if (objektUrl) URL.revokeObjectURL(objektUrl);
    };
  }, [bild.url, bild.speichername]);

  const knopf =
    "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors";
  const haupt = `${knopf} bg-accent text-accent-foreground hover:opacity-90`;
  const neben = `${knopf} border border-border bg-card hover:bg-background`;

  if (fehler) return <p className="text-sm text-muted">Foto konnte nicht zum Sichern geladen werden.</p>;
  if (!geladen) {
    return (
      <button type="button" disabled className={`${haupt} cursor-not-allowed opacity-50`}>
        Herunterladen
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {geladen.teilen && (
        <button
          type="button"
          onClick={() => {
            navigator.share({ files: [geladen.datei], title: bild.speichername }).catch(() => {
              // Abbrechen im Teilen-Menü ist kein Fehler.
            });
          }}
          className={haupt}
        >
          {geladen.teilen === "fotos" ? "In Fotos sichern" : "Teilen / Sichern"}
        </button>
      )}
      <a href={geladen.objektUrl} download={bild.speichername} className={geladen.teilen ? neben : haupt}>
        Herunterladen
      </a>
    </div>
  );
}

// Vorschaubilder eines Stockkarten-Eintrags, die das Foto im Popup öffnen.
export function StockkartenBilder({ bilder, titel }: { bilder: BetrachterBild[]; titel: string }) {
  const [index, setIndex] = useState<number | null>(null);

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {bilder.map((bild, i) => (
          <button
            key={bild.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Foto ${i + 1} groß ansehen`}
            className="cursor-zoom-in rounded-md focus-visible:outline-2 focus-visible:outline-accent"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bild.url} alt={bild.alt} loading="lazy" className="h-24 w-24 rounded-md border border-border object-cover" />
          </button>
        ))}
      </div>
      <BildBetrachter bilder={bilder} index={index} onIndex={setIndex} titel={titel} />
    </>
  );
}
