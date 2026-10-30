import type { Metadata } from "next";
import { ANLEITUNG_CSS, ANLEITUNG_HTML } from "./inhalt";

export const metadata: Metadata = { title: "Anleitung · Imkereiverwaltung" };

// Die Anleitung für neue Nutzer und Tester als eigener Menüpunkt. Text,
// Stil und Bilder entstehen aus anleitung/vorlage.html im Repository (siehe
// anleitung/bauen.py), damit App, Einzeldatei und Artifact denselben Inhalt
// haben. Farben und Schrift übernimmt sie von der App.
export default function AnleitungPage() {
  return (
    <div className="anleitung">
      <style dangerouslySetInnerHTML={{ __html: ANLEITUNG_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: ANLEITUNG_HTML }} />
    </div>
  );
}
