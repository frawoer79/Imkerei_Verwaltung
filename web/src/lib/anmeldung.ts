import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Eigene Anmeldung statt der Passwortabfrage über Coolify/Traefik (HTTP
// Basic Auth): Safaris eingebaute Basic-Auth-Abfrage hat auf dem
// iPhone/iPad praktisch keine Anbindung an Face ID/Schlüsselbund und baut
// sich zudem träge auf - ein normales Formular auf einer eigenen Seite
// bekommt beides, weil iOS es wie jedes andere Login-Formular behandelt.
//
// Sitzung als signiertes Cookie statt einer Datenbank-Tabelle. Der Wert ist
// "<Konto>.<Ablaufzeitpunkt>.<Signatur>" - die Signatur (HMAC mit einem nur
// dem Server bekannten Geheimnis) beweist, dass Konto und Ablaufzeitpunkt
// tatsächlich von uns gesetzt und nicht im Cookie verändert wurden. Konto ist
// "admin" (Hauptzugang, siehe web/src/lib/hauptzugang.ts) oder die Kennung
// eines Testzugangs (siehe web/src/lib/konto.ts). Ältere Cookies ohne Konto
// ("<Ablaufzeitpunkt>.<Signatur>") stammen noch aus der Zeit, als es nur
// Frank gab, und gelten deshalb weiter als "admin".

export const SITZUNGS_COOKIE_NAME = "imkerei_sitzung";
const GUELTIGKEIT_MS = 1000 * 60 * 60 * 24 * 30; // 30 Tage, danach erneut anmelden

function geheimnis(): string {
  const wert = process.env.ANMELDUNG_GEHEIMNIS;
  if (!wert) {
    throw new Error(
      "Umgebungsvariable ANMELDUNG_GEHEIMNIS fehlt - siehe web/.env.example."
    );
  }
  return wert;
}

// Vergleicht zwei Texte ohne durch die benötigte Zeit zu verraten, an
// welcher Stelle sie sich unterscheiden (schützt vor Timing-Angriffen auf
// Benutzername/Passwort bzw. die Cookie-Signatur).
export function zeitkonstantGleich(a: string, b: string): boolean {
  const aPuffer = Buffer.from(a);
  const bPuffer = Buffer.from(b);
  if (aPuffer.length !== bPuffer.length) return false;
  return timingSafeEqual(aPuffer, bPuffer);
}

function signieren(inhalt: string): string {
  return createHmac("sha256", geheimnis()).update(inhalt).digest("hex");
}

export const ADMIN_KONTO = "admin";

// Benutzername/Passwort des Hauptzugangs prüft web/src/lib/hauptzugang.ts.

// --- Passwörter der Testzugänge ---------------------------------------------
//
// Gespeichert wird nie das Passwort selbst, sondern nur ein "Hash" (eine
// Einweg-Prüfsumme mit Zufallswert): "<Salz>:<Prüfsumme>". Selbst wer die
// Datenbank liest, kann daraus das Passwort nicht zurückrechnen.

export function passwortHashen(passwort: string): string {
  const salz = randomBytes(16).toString("hex");
  const pruefsumme = scryptSync(passwort, salz, 64).toString("hex");
  return `${salz}:${pruefsumme}`;
}

export function passwortPasstZuHash(passwort: string, hash: string): boolean {
  const [salz, pruefsumme] = hash.split(":");
  if (!salz || !pruefsumme) return false;
  return zeitkonstantGleich(scryptSync(passwort, salz, 64).toString("hex"), pruefsumme);
}

// --- Sperre nach Fehlversuchen ----------------------------------------------
//
// Schützt gegen automatisiertes Durchprobieren (Bots): nach ein paar
// Fehlversuchen wird die Anmeldung für diesen Benutzernamen eine Weile
// komplett gesperrt. Seit es Testzugänge gibt, getrennt je Benutzername -
// sonst könnte ein Tester, der sich fünfmal vertippt, Frank aussperren.
// Merkt sich das nur im Arbeitsspeicher des Servers (keine
// Datenbank-Tabelle nötig) - ein Neustart/Deployment setzt die Sperre
// zurück, das ist für diesen Zweck unbedenklich.
const MAX_FEHLVERSUCHE = 5;
const SPERRDAUER_MS = 1000 * 60 * 5; // 5 Minuten
const ZAEHLER_VERFAELLT_NACH_MS = 1000 * 60 * 15; // 15 Minuten Ruhe setzt zurück
// Obergrenze, damit ein Bot mit immer neuen Fantasienamen den Speicher nicht
// beliebig füllen kann.
const MAX_GEMERKTE_NAMEN = 1000;

type Fehlversuche = { zaehler: number; letzterFehler: number; gesperrtBis: number };
const fehlversuche = new Map<string, Fehlversuche>();

function schluessel(benutzername: string): string {
  return benutzername.trim().toLowerCase();
}

// Liefert die verbleibenden Sekunden, falls die Anmeldung für diesen Namen
// gerade gesperrt ist, sonst null.
export function anmeldungGesperrt(benutzername: string): number | null {
  const eintrag = fehlversuche.get(schluessel(benutzername));
  if (eintrag && Date.now() < eintrag.gesperrtBis) {
    return Math.ceil((eintrag.gesperrtBis - Date.now()) / 1000);
  }
  return null;
}

export function fehlversuchVermerken(benutzername: string): void {
  const jetzt = Date.now();
  const name = schluessel(benutzername);
  let eintrag = fehlversuche.get(name);
  if (!eintrag || jetzt - eintrag.letzterFehler > ZAEHLER_VERFAELLT_NACH_MS) {
    if (!eintrag && fehlversuche.size >= MAX_GEMERKTE_NAMEN) {
      fehlversuche.clear();
    }
    eintrag = { zaehler: 0, letzterFehler: jetzt, gesperrtBis: 0 };
    fehlversuche.set(name, eintrag);
  }
  eintrag.zaehler += 1;
  eintrag.letzterFehler = jetzt;
  if (eintrag.zaehler >= MAX_FEHLVERSUCHE) {
    eintrag.gesperrtBis = jetzt + SPERRDAUER_MS;
  }
}

export function erfolgreicheAnmeldungVermerken(benutzername: string): void {
  fehlversuche.delete(schluessel(benutzername));
}

export function sitzungswertErzeugen(konto: string): string {
  const ablaufZeitpunkt = Date.now() + GUELTIGKEIT_MS;
  return `${konto}.${ablaufZeitpunkt}.${signieren(`${konto}.${ablaufZeitpunkt}`)}`;
}

// Liefert Konto ("admin" oder die Kennung eines Testzugangs) und
// Ausstellungszeitpunkt aus einem gültigen Sitzungs-Cookie, sonst null. Ob ein
// Testzugang inzwischen entfernt wurde oder seine Sitzungen beendet wurden
// (Passwort zurückgesetzt), prüfen erst proxy.ts und web/src/lib/konto.ts gegen
// die Datenbank.
export function sitzungAusWert(
  wert: string | undefined,
): { konto: string; ausgestelltAm: number } | null {
  if (!wert) return null;
  const teile = wert.split(".");
  let konto: string;
  let ablaufZeitpunktText: string;
  let signatur: string;
  let signierterInhalt: string;
  if (teile.length === 2) {
    // Altes Format aus der Zeit vor den Testzugängen - nur Frank.
    [ablaufZeitpunktText, signatur] = teile;
    konto = ADMIN_KONTO;
    signierterInhalt = ablaufZeitpunktText;
  } else if (teile.length === 3) {
    [konto, ablaufZeitpunktText, signatur] = teile;
    signierterInhalt = `${konto}.${ablaufZeitpunktText}`;
  } else {
    return null;
  }
  const ablaufZeitpunkt = Number(ablaufZeitpunktText);
  if (!konto || !signatur || !Number.isFinite(ablaufZeitpunkt) || Date.now() > ablaufZeitpunkt) {
    return null;
  }
  if (!zeitkonstantGleich(signatur, signieren(signierterInhalt))) return null;
  return { konto, ausgestelltAm: ablaufZeitpunkt - GUELTIGKEIT_MS };
}

// Gilt die Sitzung eines Testzugangs noch? Er muss eingerichtet sein, und das
// Cookie darf nicht vor dem letzten Zurücksetzen des Passworts ausgestellt
// worden sein - sonst bliebe etwa ein verlorenes Handy trotz neuem Passwort
// angemeldet.
export function testerSitzungGueltig(
  testzugang: { eingerichtetAm: Date | null; sitzungenGueltigAb: Date | null } | null,
  ausgestelltAm: number,
): boolean {
  if (!testzugang?.eingerichtetAm) return false;
  return !testzugang.sitzungenGueltigAb || ausgestelltAm >= testzugang.sitzungenGueltigAb.getTime();
}

// Nur Ziele innerhalb der eigenen Seite für die Weiterleitung nach der
// Anmeldung zulassen. Ein einfacher Blick auf "/" am Anfang genügt nicht:
// Browser lesen etwa "/\\fremde-seite.de" (Schrägstrich, Backslash) als Adresse
// einer fremden Seite. Deshalb wird das Ziel wie vom Browser aufgelöst und muss
// auf derselben Seite bleiben.
export function sicheresWeiterleitungsziel(weiter: string): string {
  const basis = "https://imkerei.invalid";
  try {
    const ziel = new URL(weiter, basis);
    if (ziel.origin === basis && weiter.startsWith("/")) {
      return `${ziel.pathname}${ziel.search}${ziel.hash}`;
    }
  } catch {
    // ungültige Adresse - zur Startseite
  }
  return "/";
}
