"use client";

import { useState } from "react";
import { ZuchtkarteKarte } from "@/components/zuchtkarte-karte";
import { IconDokument, IconWarnung } from "@/components/icons";
import { ZoomBild, ZoomDialog, ZoomFlaeche } from "@/components/zoom-dialog";
import { istPdf } from "@/lib/zuchtkarte-datei";
import { KARTE_BREITE_PT, KARTE_HOEHE_PT, type ZuchtkarteInhalt } from "@/lib/zuchtkarte-inhalt";
import { knopfKlassen } from "@/components/ui";

/// Die hochgeladene Karte des Züchters, wie die Datenbank sie kennt.
export type HochgeladeneZuchtkarte = {
  dateiname: string;
  mimeType: string | null;
  /// In der Datenbank eingetragen, die Datei selbst fehlt aber im
  /// Upload-Verzeichnis (z.B. weil das Volume nicht eingehängt ist).
  dateiFehlt: boolean;
};

/// Welche Karte gerade im Popup groß zu sehen ist.
type GrosseKarte = "foto" | "karte";

// Die Zuchtkarte(n) direkt auf der Seite der Königin: die hochgeladene Karte
// des Züchters (bei zugekauften Königinnen) und die selbst erstellte Karte.
// Auf Tablet und PC immer sichtbar; am Handy hinter einem Knopf, damit die
// Seite übersichtlich bleibt. Ausgeblendet wird nur per CSS (`hidden md:flex`),
// so dass die Ansicht nach dem Drehen eines Tablets ohne Nachladen stimmt.
//
// Ein Klick auf eine Karte zeigt sie groß in einem Popup, das sich zoomen und
// verschieben lässt (ein einziges Popup für beide Karten). Das Popup steht
// bewusst außerhalb des ausgeblendeten Bereichs.
export function ZuchtkarteAnsicht({
  foto,
  karte,
}: {
  foto: HochgeladeneZuchtkarte | null;
  /// Die erstellte eigene Karte, falls es sie gibt.
  karte: { inhalt: ZuchtkarteInhalt; stand: string } | null;
}) {
  const [offen, setOffen] = useState(false);
  const [gross, setGross] = useState<GrosseKarte | null>(null);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOffen(!offen)}
        aria-expanded={offen}
        className={`${knopfKlassen("secondary", "klein")} mb-3 md:hidden`}
      >
        {offen ? "Zuchtkarte ausblenden" : foto && karte ? "Zuchtkarten anzeigen" : "Zuchtkarte anzeigen"}
      </button>

      <div className={`${offen ? "flex" : "hidden"} flex-wrap items-start gap-6 md:flex`}>
        {foto && <HochgeladeneKarte foto={foto} onVergroessern={() => setGross("foto")} />}

        {karte && (
          <figure className="w-[320px] max-w-full shrink-0">
            <div className="relative">
              <ZuchtkarteKarte inhalt={karte.inhalt} stand={karte.stand} maxBreitePx={320} />
              {/* Der Knopf liegt über der Karte statt sie zu umschließen: eine
                  Karte aus lauter <div>s gehört nicht in einen <button>. */}
              <button
                type="button"
                onClick={() => setGross("karte")}
                aria-label={foto ? "Eigene Zuchtkarte vergrößern" : "Zuchtkarte vergrößern"}
                className="absolute inset-0 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-accent"
              />
            </div>
            <figcaption className="mt-1 text-xs text-muted">
              {foto ? "Eigene Zuchtkarte" : "Zuchtkarte"}, Stand {karte.stand} (zum Vergrößern antippen)
            </figcaption>
          </figure>
        )}
      </div>

      <ZoomDialog
        offen={gross !== null}
        titel={gross === "foto" ? "Zuchtkarte des Züchters" : foto ? "Eigene Zuchtkarte" : "Zuchtkarte"}
        onSchliessen={() => setGross(null)}
      >
        {gross === "foto" && foto && (
          <ZoomBild url={`/bilder/${foto.dateiname}`} alt="Zuchtkarte des Züchters" />
        )}
        {gross === "karte" && karte && (
          <ZoomFlaeche groesse={{ breite: KARTE_BREITE_PT, hoehe: KARTE_HOEHE_PT }} beschriftung="Eigene Zuchtkarte">
            {/* Die Fläche gibt die eingepasste Größe vor; die Karte passt sich
                ihrer Breite an. */}
            <ZuchtkarteKarte inhalt={karte.inhalt} stand={karte.stand} maxBreitePx={2000} />
          </ZoomFlaeche>
        )}
      </ZoomDialog>
    </div>
  );
}

// Foto/Scan oder PDF der Karte, die eine zugekaufte Königin mitbringt. Drei
// Fälle, damit die Karte nie einfach "weg" aussieht: die Datei fehlt auf dem
// Server (dann steht das da), der Browser kann das Bildformat nicht darstellen
// (z.B. HEIC am Windows-PC - dann gibt es einen Link zum Öffnen) oder es ist
// ein PDF (Kachel mit Link, ein PDF lässt sich nicht als Bild zeigen und
// zoomen - der Browser öffnet es in seiner eigenen PDF-Ansicht).
function HochgeladeneKarte({
  foto,
  onVergroessern,
}: {
  foto: HochgeladeneZuchtkarte;
  onVergroessern: () => void;
}) {
  const url = `/bilder/${foto.dateiname}`;
  const [bildKaputt, setBildKaputt] = useState(false);

  if (foto.dateiFehlt) {
    return (
      <div
        role="alert"
        className="min-w-0 max-w-xl flex-1 basis-72 rounded-md border border-warnung-rand bg-warnung-flaeche p-3 text-sm text-warnung"
      >
        <p className="flex items-center gap-2 font-medium">
          <IconWarnung className="h-4 w-4 shrink-0" />
          Die Datei der hochgeladenen Zuchtkarte fehlt auf dem Server.
        </p>
        <p className="mt-1">
          Die Karte ist noch eingetragen, die Datei selbst ist aber nicht mehr da. Über „bearbeiten“
          oben kannst du sie noch einmal hochladen.
        </p>
      </div>
    );
  }

  if (istPdf(foto.mimeType)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 max-w-xl flex-1 basis-72 items-center gap-3 rounded-md border border-border bg-card p-4 hover:border-accent"
      >
        <IconDokument className="h-10 w-10 shrink-0 text-muted" />
        <span>
          <span className="block font-medium">Zuchtkarte des Züchters (PDF)</span>
          <span className="block text-sm text-muted">Zum Ansehen antippen</span>
        </span>
      </a>
    );
  }

  return (
    <figure className="min-w-0 max-w-xl flex-1 basis-72">
      {bildKaputt ? (
        <p className="rounded-md border border-border bg-background p-3 text-sm">
          Dein Browser kann dieses Bildformat nicht anzeigen (typisch: HEIC-Foto am Windows-PC). Die Karte ist
          gespeichert:{" "}
          <a href={url} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
            Datei öffnen
          </a>
          {" · "}
          <a href={`${url}?download=1`} download className="font-medium text-accent hover:underline">
            herunterladen
          </a>
          .
        </p>
      ) : (
        <button
          type="button"
          onClick={onVergroessern}
          aria-label="Zuchtkarte des Züchters vergrößern"
          className="block max-w-full cursor-zoom-in"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            // Ein Bild, das schon vor dem Start der Seite nicht laden konnte,
            // löst kein Fehlerereignis mehr aus - deshalb beim Einhängen
            // einmal nachsehen.
            ref={(bild) => {
              if (bild && bild.complete && bild.naturalWidth === 0) setBildKaputt(true);
            }}
            onError={() => setBildKaputt(true)}
            src={url}
            alt="Zuchtkarte des Züchters"
            className="max-h-[36rem] max-w-full rounded-md border border-border bg-white object-contain"
          />
        </button>
      )}
      {!bildKaputt && (
        <figcaption className="mt-1 text-xs text-muted">
          Zuchtkarte des Züchters (zum Vergrößern antippen)
        </figcaption>
      )}
    </figure>
  );
}
