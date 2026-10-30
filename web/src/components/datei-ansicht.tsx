"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import type { PDFDocumentLoadingTask } from "pdfjs-dist/legacy/build/pdf.mjs";

// Läuft die App als Home-Bildschirm-App (iPhone/iPad "Zum Home-Bildschirm",
// ab iOS 26 standardmäßig "Als Web-App öffnen"), gibt es keine
// Browser-Oberfläche: kein Zurück-Knopf, keine Tabs. Links mit
// target="_blank" (Dokumente, Belege, Nachweise, Fotos, Druckbögen) öffnet iOS
// dort trotzdem im selben Vollbild-Fenster - man sitzt dann auf der nackten
// PDF/dem Bild fest und kommt nur durch Beenden der App wieder heraus.
//
// Diese Komponente fängt in genau diesem Modus solche Links ab und zeigt die
// Datei stattdessen in einer eigenen Vollbild-Ansicht mit "Schließen"-Knopf.
// Im normalen Browser (Desktop, Safari mit Adressleiste) bleibt alles wie
// bisher: neuer Tab bzw. Download.

function laeuftAlsHomeBildschirmApp(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorMitStandalone = window.navigator as Navigator & { standalone?: boolean };
  return (
    navigatorMitStandalone.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  );
}

// `objektUrl` zeigt auf die schon geladene Datei im Speicher - Bild und
// Download brauchen so keinen zweiten Abruf.
type Datei = { url: string; name: string; typ: string; blob: Blob; objektUrl: string };
type Zustand =
  | { art: "zu" }
  | { art: "laedt"; url: string }
  | { art: "fehler"; url: string }
  | { art: "offen"; datei: Datei };

// Dateiname aus dem Content-Disposition-Kopf der Antwort (setzen alle
// Datei-Routen der App), sonst der letzte Teil der Adresse.
function dateinameAus(antwort: Response, url: URL): string {
  const kopf = antwort.headers.get("content-disposition") ?? "";
  const treffer = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(kopf);
  if (treffer) {
    try {
      return decodeURIComponent(treffer[1]);
    } catch {
      return treffer[1];
    }
  }
  return decodeURIComponent(url.pathname.split("/").pop() || "Datei");
}

export function DateiAnsicht() {
  const [zustand, setZustand] = useState<Zustand>({ art: "zu" });
  const abrufNummer = useRef(0);

  const oeffnen = useCallback(async (adresse: string) => {
    const nummer = ++abrufNummer.current;
    const url = new URL(adresse, window.location.href);
    // Download-Zusatz entfernen - in der Ansicht gibt es eigens "Teilen/Sichern".
    url.searchParams.delete("download");
    setZustand({ art: "laedt", url: url.toString() });
    try {
      const antwort = await fetch(url, { credentials: "same-origin" });
      if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
      const blob = await antwort.blob();
      if (nummer !== abrufNummer.current) return;
      const typ = (antwort.headers.get("content-type") ?? blob.type).split(";")[0].trim();
      setZustand({
        art: "offen",
        datei: { url: url.toString(), name: dateinameAus(antwort, url), typ, blob, objektUrl: URL.createObjectURL(blob) },
      });
    } catch {
      if (nummer !== abrufNummer.current) return;
      setZustand({ art: "fehler", url: url.toString() });
    }
  }, []);

  const schliessen = useCallback(() => {
    abrufNummer.current++;
    setZustand({ art: "zu" });
  }, []);

  // Klicks auf Links (und Absenden von Formularen) abfangen, die sonst ein
  // neues Fenster öffnen oder eine Datei herunterladen würden.
  useEffect(() => {
    if (!laeuftAlsHomeBildschirmApp()) return;

    function eigeneAdresse(adresse: string): boolean {
      try {
        return new URL(adresse, window.location.href).origin === window.location.origin;
      } catch {
        return false;
      }
    }

    function beiKlick(ereignis: MouseEvent) {
      if (ereignis.defaultPrevented || ereignis.button !== 0) return;
      const link = (ereignis.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const neuesFenster = link.target === "_blank" || link.hasAttribute("download");
      // blob:-Adressen sind der Download-Knopf der Ansicht selbst.
      if (!neuesFenster || link.protocol === "blob:" || !eigeneAdresse(link.href)) return;
      ereignis.preventDefault();
      void oeffnen(link.href);
    }

    function beimAbsenden(ereignis: SubmitEvent) {
      const formular = ereignis.target;
      if (!(formular instanceof HTMLFormElement) || ereignis.defaultPrevented) return;
      if (formular.target !== "_blank" || formular.method.toLowerCase() !== "get") return;
      if (!eigeneAdresse(formular.action)) return;
      ereignis.preventDefault();
      const url = new URL(formular.action, window.location.href);
      const daten = new FormData(formular, ereignis.submitter);
      for (const [schluessel, wert] of daten) {
        if (typeof wert === "string") url.searchParams.append(schluessel, wert);
      }
      void oeffnen(url.toString());
    }

    document.addEventListener("click", beiKlick);
    document.addEventListener("submit", beimAbsenden);
    return () => {
      document.removeEventListener("click", beiKlick);
      document.removeEventListener("submit", beimAbsenden);
    };
  }, [oeffnen]);

  // Speicher der geladenen Datei wieder freigeben, sobald sie nicht mehr
  // angezeigt wird.
  const objektUrl = zustand.art === "offen" ? zustand.datei.objektUrl : null;
  useEffect(() => {
    if (!objektUrl) return;
    return () => URL.revokeObjectURL(objektUrl);
  }, [objektUrl]);

  // Hintergrundseite nicht mitscrollen lassen, Escape schließt (Tastatur am
  // iPad).
  useEffect(() => {
    if (zustand.art === "zu") return;
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function beiTaste(ereignis: KeyboardEvent) {
      if (ereignis.key === "Escape") schliessen();
    }
    document.addEventListener("keydown", beiTaste);
    return () => {
      document.body.style.overflow = vorher;
      document.removeEventListener("keydown", beiTaste);
    };
  }, [zustand.art, schliessen]);

  if (zustand.art === "zu") return null;

  const datei = zustand.art === "offen" ? zustand.datei : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={datei?.name ?? "Datei"}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Button type="button" variant="secondary" onClick={schliessen} autoFocus>
          ✕ Schließen
        </Button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{datei?.name ?? ""}</p>
        {datei && <TeilenKnopf datei={datei} />}
      </div>

      <div className="min-h-0 flex-1 overflow-auto pb-[env(safe-area-inset-bottom)]">
        {zustand.art === "laedt" && <p className="p-6 text-center text-sm text-muted">Wird geladen …</p>}
        {zustand.art === "fehler" && (
          <p className="p-6 text-center text-sm">
            Die Datei konnte nicht geladen werden. Bitte die Ansicht schließen und erneut versuchen.
          </p>
        )}
        {datei && <DateiInhalt datei={datei} />}
      </div>
    </div>
  );
}

// "Teilen" öffnet auf dem iPhone/iPad das System-Teilen-Menü mit der Datei
// selbst - darüber geht Drucken, "In Dateien sichern", Mail usw. Wo der
// Browser keine Dateien teilen kann, gibt es stattdessen einen Download.
function TeilenKnopf({ datei }: { datei: Datei }) {
  const dateiObjekt = new File([datei.blob], datei.name, { type: datei.typ });
  const kannTeilen =
    typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [dateiObjekt] });

  if (kannTeilen) {
    return (
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          navigator.share({ files: [dateiObjekt], title: datei.name }).catch(() => {
            // Abbrechen im Teilen-Menü ist kein Fehler.
          });
        }}
      >
        Teilen
      </Button>
    );
  }

  return (
    <a href={datei.objektUrl} download={datei.name}>
      <Button type="button" variant="secondary">
        Herunterladen
      </Button>
    </a>
  );
}

function DateiInhalt({ datei }: { datei: Datei }) {
  if (datei.typ.startsWith("image/")) return <BildInhalt datei={datei} />;
  if (datei.typ === "application/pdf") return <PdfInhalt datei={datei} />;
  return (
    <p className="p-6 text-center text-sm">
      Diese Datei lässt sich hier nicht anzeigen. Über &bdquo;Teilen&ldquo; kannst du sie in einer passenden App öffnen.
    </p>
  );
}

function BildInhalt({ datei }: { datei: Datei }) {
  const [kaputt, setKaputt] = useState(false);

  if (kaputt) {
    return (
      <p className="p-6 text-center text-sm">
        Dieses Bildformat lässt sich hier nicht anzeigen. Über &bdquo;Teilen&ldquo; kannst du es in einer anderen
        App öffnen.
      </p>
    );
  }
  return (
    <div className="flex min-h-full items-center justify-center p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={datei.objektUrl} alt={datei.name} className="max-w-full" onError={() => setKaputt(true)} />
    </div>
  );
}

// PDFs werden mit pdf.js Seite für Seite selbst gezeichnet statt in einem
// <iframe> angezeigt: Safari auf iPhone/iPad zeigt eine PDF im <iframe> nur
// als Standbild der ersten Seite. Der "legacy"-Build läuft auch auf älteren
// iOS-Versionen.
function PdfInhalt({ datei }: { datei: Datei }) {
  const behaelter = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"laedt" | "fertig" | "fehler">("laedt");

  useEffect(() => {
    let abgebrochen = false;
    let ladeAufgabe: PDFDocumentLoadingTask | null = null;
    const ziel = behaelter.current;
    if (!ziel) return;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const daten = new Uint8Array(await datei.blob.arrayBuffer());
        if (abgebrochen) return;
        ladeAufgabe = pdfjs.getDocument({ data: daten });
        const pdf = await ladeAufgabe.promise;
        if (abgebrochen) return;

        // Schärfe: in Bildschirm-Pixeldichte zeichnen (höchstens 3-fach),
        // damit Text auch nach dem Heranzoomen mit zwei Fingern lesbar bleibt.
        const breite = Math.max(200, ziel.clientWidth - 16);
        const dichte = Math.min(3, Math.max(2, window.devicePixelRatio || 1));

        for (let nummer = 1; nummer <= pdf.numPages; nummer++) {
          const seite = await pdf.getPage(nummer);
          if (abgebrochen) return;
          const grund = seite.getViewport({ scale: 1 });
          const massstab = Math.min(breite, 1000) / grund.width;
          const ansicht = seite.getViewport({ scale: massstab * dichte });
          const leinwand = document.createElement("canvas");
          leinwand.width = Math.floor(ansicht.width);
          leinwand.height = Math.floor(ansicht.height);
          leinwand.style.width = `${Math.floor(ansicht.width / dichte)}px`;
          leinwand.className = "mx-auto mb-3 block max-w-full bg-white shadow";
          leinwand.setAttribute("aria-label", `Seite ${nummer} von ${pdf.numPages}`);
          ziel.appendChild(leinwand);
          await seite.render({ canvas: leinwand, viewport: ansicht }).promise;
          if (nummer === 1 && !abgebrochen) setStatus("fertig");
        }
      } catch {
        if (!abgebrochen) setStatus("fehler");
      }
    })();

    return () => {
      abgebrochen = true;
      ziel.replaceChildren();
      void ladeAufgabe?.destroy();
    };
  }, [datei.blob]);

  return (
    <div className="p-2">
      {status === "laedt" && <p className="p-4 text-center text-sm text-muted">PDF wird aufbereitet …</p>}
      {status === "fehler" && (
        <p className="p-4 text-center text-sm">
          Die PDF lässt sich hier nicht anzeigen. Über &bdquo;Teilen&ldquo; kannst du sie in einer anderen App öffnen.
        </p>
      )}
      <div ref={behaelter} />
    </div>
  );
}
