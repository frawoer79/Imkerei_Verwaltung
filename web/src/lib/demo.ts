import { basisPrisma } from "@/lib/datenbank";

// Öffentliches Repository (wie REPOSITORY in lib/update.ts, hier ohne dessen
// Abhängigkeiten, weil proxy.ts diese Datei lädt).
const REPOSITORY = "frawoer79/Imkerei_Verwaltung";

// Öffentliche Demo: Mit DEMO_MODUS=1 wird eine eigene Installation zur
// Spielwiese für Besucher, ohne Anmeldung. Gedacht für eine getrennte
// Instanz mit eigener Datenbank (z.B. demo.example.org), nie für eine
// Installation mit echten Daten.
//
// Jeder Besucher bekommt einen "Platz": einen Testzugang mit der festen
// Kennung demo1, demo2, ... samt eigenem Schema "tester_demo<n>" voller
// Fantasiedaten (lib/beispieldaten.ts). Damit gilt für ihn alles, was für
// Tester gilt: eigene Tabellen, eigener Upload-Ordner, keine Admin-Seiten.
//
// Die Spalten des Testzugangs bekommen dabei diese Bedeutung:
//   eingerichtetAm   seit wann der Platz belegt ist (leer = frei)
//   letzteAnmeldung  letzter Seitenaufruf des Besuchers
//   notiz            "bereit" (frisch aufgebaut), "belegt" oder "aufbau"
//   sitzungenGueltigAb  beim Freigeben gesetzt, alte Cookies gelten nicht mehr
//
// Ein Platz wird frei nach RUHE_MINUTEN ohne Seitenaufruf oder beim
// Datumswechsel. Dann wird er gelöscht und im Hintergrund neu aufgebaut
// (lib/demo-aufbau.ts), immer nur einer zur Zeit.

export function istDemo(): boolean {
  return ["1", "ja", "an", "true"].includes((process.env.DEMO_MODUS ?? "").trim().toLowerCase());
}

export const REPOSITORY_URL = `https://github.com/${REPOSITORY}`;
export const RUHE_MINUTEN = 10;
const RUHE_MS = RUHE_MINUTEN * 60 * 1000;
// Seitenaufrufe nur alle 30 Sekunden vermerken, nicht bei jedem Bild.
const AKTIVITAET_ABSTAND_MS = 30 * 1000;

export function anzahlPlaetze(): number {
  const wert = Number(process.env.DEMO_PLAETZE);
  return Number.isInteger(wert) && wert >= 1 && wert <= 30 ? wert : 10;
}

export const PRAEFIX = "demo";
export const platzId = (nummer: number) => `${PRAEFIX}${nummer}`;

export function istDemoPlatz(kennung: string): boolean {
  return /^demo[0-9]+$/.test(kennung);
}

export const NUR_PLAETZE = { id: { startsWith: PRAEFIX } };

const berlinTag = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// --- Missbrauchsschutz -----------------------------------------------------
//
// Höchstens ein paar neue Plätze je Internetadresse und Stunde, sonst könnte
// einer mit einem Skript alle Plätze belegen. Nur im Arbeitsspeicher, ein
// Neustart setzt das zurück.
const NEUE_PLAETZE_JE_STUNDE = 6;
const MAX_GEMERKTE_ADRESSEN = 5000;
const vergeben = new Map<string, number[]>();

function gebremst(adresse: string): boolean {
  const grenze = Date.now() - 60 * 60 * 1000;
  const zeiten = (vergeben.get(adresse) ?? []).filter((zeit) => zeit > grenze);
  vergeben.set(adresse, zeiten);
  return zeiten.length >= NEUE_PLAETZE_JE_STUNDE;
}

function vergabeVermerken(adresse: string) {
  if (vergeben.size >= MAX_GEMERKTE_ADRESSEN) vergeben.clear();
  vergeben.set(adresse, [...(vergeben.get(adresse) ?? []), Date.now()]);
}

// --- Plätze ------------------------------------------------------------------

export type Belegung = { platz: string } | { grund: "voll" | "gebremst" };

// Gibt dem Besucher einen frisch aufgebauten Platz. Zwei gleichzeitige
// Besucher bekommen nie denselben: belegt wird nur, wenn der Platz in genau
// diesem Moment noch frei ist.
export async function platzBelegen(adresse: string): Promise<Belegung> {
  if (gebremst(adresse)) return { grund: "gebremst" };
  const freie = await basisPrisma.testzugang.findMany({
    where: { ...NUR_PLAETZE, notiz: "bereit", eingerichtetAm: null },
    select: { id: true },
    orderBy: { id: "asc" },
    take: 3,
  });
  for (const { id } of freie) {
    const jetzt = new Date();
    const { count } = await basisPrisma.testzugang.updateMany({
      where: { id, notiz: "bereit", eingerichtetAm: null },
      data: { notiz: "belegt", eingerichtetAm: jetzt, letzteAnmeldung: jetzt, sitzungenGueltigAb: jetzt },
    });
    if (count === 1) {
      vergabeVermerken(adresse);
      return { platz: id };
    }
  }
  return { grund: "voll" };
}

// Platz zum Neuaufbau freigeben. Das Cookie des Besuchers gilt ab sofort
// nicht mehr (sitzungenGueltigAb), er landet beim nächsten Klick auf der
// Startseite der Demo.
export async function platzFreigeben(id: string): Promise<void> {
  if (!istDemoPlatz(id)) return;
  await basisPrisma.testzugang.updateMany({
    where: { id, eingerichtetAm: { not: null } },
    data: { notiz: "aufbau", eingerichtetAm: null, sitzungenGueltigAb: new Date() },
  });
}

// Aus proxy.ts bei jedem Seitenaufruf eines Demo-Besuchers.
export async function aktivitaetVermerken(id: string, letzte: Date | null): Promise<void> {
  if (letzte && Date.now() - letzte.getTime() < AKTIVITAET_ABSTAND_MS) return;
  await basisPrisma.testzugang.updateMany({
    where: { id, eingerichtetAm: { not: null } },
    data: { letzteAnmeldung: new Date() },
  });
}

// Ist der Platz abgelaufen, auch wenn der Hintergrund-Takt ihn noch nicht
// freigegeben hat?
export function platzAbgelaufen(platz: { eingerichtetAm: Date | null; letzteAnmeldung: Date | null }, jetzt = new Date()) {
  if (!platz.eingerichtetAm) return true;
  const letzte = platz.letzteAnmeldung ?? platz.eingerichtetAm;
  if (jetzt.getTime() - letzte.getTime() > RUHE_MS) return true;
  return berlinTag.format(platz.eingerichtetAm) !== berlinTag.format(jetzt);
}

export async function platzStand(): Promise<{ frei: number; gesamt: number; imAufbau: number }> {
  const plaetze = await basisPrisma.testzugang.findMany({ where: NUR_PLAETZE, select: { notiz: true, eingerichtetAm: true } });
  return {
    frei: plaetze.filter((platz) => platz.notiz === "bereit" && !platz.eingerichtetAm).length,
    imAufbau: plaetze.filter((platz) => platz.notiz === "aufbau").length,
    gesamt: plaetze.length,
  };
}

// Internetadresse des Besuchers. Vor der App sitzt Coolifys Proxy (Traefik),
// der sie in X-Real-Ip mitgibt; der letzte Eintrag in X-Forwarded-For stammt
// ebenfalls von ihm. Frühere Einträge könnte der Besucher selbst fälschen.
export function besucherAdresse(kopf: Headers): string {
  const echt = kopf.get("x-real-ip")?.trim();
  if (echt) return echt;
  const weitergeleitet = kopf.get("x-forwarded-for")?.split(",").map((teil) => teil.trim()).filter(Boolean);
  return weitergeleitet?.at(-1) ?? "unbekannt";
}

// --- Gesperrtes ---------------------------------------------------------------

export { DEMO_MAIL_MELDUNG, DEMO_UPLOAD_MELDUNG } from "@/lib/demo-texte";

// Einstellungen, die in der Demo nichts zu suchen haben (proxy.ts leitet um,
// lib/einstellungen-punkte.ts blendet sie aus).
export const DEMO_GESPERRTE_SEITEN = ["/einstellungen/email", "/einstellungen/kalender", "/einstellungen/passwort"];

// --- Impressum ----------------------------------------------------------------
//
// Steht nicht im Code, sondern in den Umgebungsvariablen der Demo-Instanz
// (Coolify), damit Name und Anschrift nicht im öffentlichen Repository liegen.
// Mehrere Zeilen der Anschrift mit "|" trennen.
export type Impressum = { name: string; anschrift: string[]; email: string; telefon: string | null };

export function impressum(): Impressum | null {
  const name = process.env.IMPRESSUM_NAME?.trim();
  const anschrift = (process.env.IMPRESSUM_ANSCHRIFT ?? "")
    .split("|")
    .map((zeile) => zeile.trim())
    .filter(Boolean);
  const email = process.env.IMPRESSUM_EMAIL?.trim();
  if (!name || anschrift.length === 0 || !email) return null;
  return { name, anschrift, email, telefon: process.env.IMPRESSUM_TELEFON?.trim() || null };
}

// --- Adresssuche --------------------------------------------------------------
//
// Nominatim (OpenStreetMap) erlaubt höchstens eine Abfrage pro Sekunde und
// sperrt sonst den ganzen Server. In der Demo deshalb gedrosselt: je
// Internetadresse 20 Abfragen pro Stunde, insgesamt eine pro Sekunde.
const SUCHEN_JE_STUNDE = 20;
const suchen = new Map<string, number[]>();
let letzteSuche = 0;

export function adresssucheGebremst(adresse: string): boolean {
  const jetzt = Date.now();
  if (jetzt - letzteSuche < 1000) return true;
  const zeiten = (suchen.get(adresse) ?? []).filter((zeit) => zeit > jetzt - 60 * 60 * 1000);
  if (zeiten.length >= SUCHEN_JE_STUNDE) return true;
  if (suchen.size >= MAX_GEMERKTE_ADRESSEN) suchen.clear();
  suchen.set(adresse, [...zeiten, jetzt]);
  letzteSuche = jetzt;
  return false;
}

export const DEMO_SUCHE_MELDUNG = "Die Adresssuche ist in der Demo gerade ausgelastet. Bitte gleich noch einmal versuchen.";
