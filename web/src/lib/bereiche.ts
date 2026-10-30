import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Bereiche, die sich in den Einstellungen ausblenden lassen. Bienenstände,
// Maßnahmen und Einstellungen sind immer da. Ausblenden löscht nichts - die
// Daten bleiben, beim Wiedereinschalten ist alles wie vorher.
export const BEREICHE = [
  {
    schluessel: "scannen",
    name: "Scannen",
    hinweis: "QR-Codes an den Beuten scannen und anzeigen.",
  },
  {
    schluessel: "koeniginnen",
    name: "Königinnen und Zucht",
    hinweis: "Königinnen, Stammbaum, Zuchtserien und Zuchtkarten. Offene Zuchtschritte verschwinden aus den Maßnahmen.",
  },
  {
    schluessel: "behandlungen",
    name: "Behandlungen",
    hinweis:
      "Medikamente und Behandlungsnachweis. Den Nachweis nach THAMNV brauchst du trotzdem. Führe ihn dann anderweitig.",
  },
  {
    schluessel: "dokumente",
    name: "Dokumente",
    hinweis: "Dateien ablegen, Mailversand und die Sammelstelle für erzeugte PDFs.",
  },
  {
    schluessel: "lager",
    name: "Lager",
    hinweis: "Material, Honig und andere Erzeugnisse, Lagerorte und Lagerlisten.",
  },
  {
    schluessel: "velutina",
    name: "Velutina",
    hinweis: "Warnung vor der Asiatischen Hornisse und Nestsuche. Der Abruf der Meldungen ruht dann.",
  },
] as const;

export type Bereich = (typeof BEREICHE)[number]["schluessel"];

// Pro Anfrage nur einmal aus der Datenbank lesen (Menü, Seite und Formulare
// fragen alle danach).
export const abgeschalteteBereiche = cache(async (): Promise<Bereich[]> => {
  const zeile = await prisma.bereichswahl.findUnique({ where: { id: "standard" } });
  const gueltig = new Set<string>(BEREICHE.map((b) => b.schluessel));
  return (zeile?.abgeschaltet ?? []).filter((s): s is Bereich => gueltig.has(s));
});

export async function bereichAn(bereich: Bereich): Promise<boolean> {
  return !(await abgeschalteteBereiche()).includes(bereich);
}

// Für Seiten und Routen eines Bereichs: ist er aus, geht es zur Startseite
// (Lesezeichen, alte Links, aufgeklebte QR-Codes).
export async function bereichPflicht(bereich: Bereich): Promise<void> {
  if (!(await bereichAn(bereich))) redirect("/");
}
