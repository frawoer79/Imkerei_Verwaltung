import { randomBytes } from "crypto";
import { basisPrisma } from "@/lib/datenbank";
import { passwortHashen, passwortPasstZuHash, zeitkonstantGleich } from "@/lib/anmeldung";

// Der Hauptzugang (Konto "admin") kommt aus einer von zwei Quellen:
//   1. Umgebungsvariablen ANMELDUNG_BENUTZERNAME/ANMELDUNG_PASSWORT - so läuft
//      Franks eigene Instanz auf Coolify, daran ändert sich nichts.
//   2. Tabelle "Hauptzugang" - von einer selbst installierten Instanz beim
//      ersten Start über den Einrichtungsassistenten (/einrichtung) angelegt.
// Gibt es keins von beiden, ist die Instanz frisch installiert und alle
// Seiten leiten zum Assistenten.

function ausUmgebung(): { benutzername: string; passwort: string } | null {
  const benutzername = process.env.ANMELDUNG_BENUTZERNAME ?? "";
  const passwort = process.env.ANMELDUNG_PASSWORT ?? "";
  return benutzername !== "" && passwort !== "" ? { benutzername, passwort } : null;
}

// Testzugänge und Styleguide sind Werkzeuge für die Entwicklung. Sichtbar nur,
// wenn der Hauptzugang aus den Umgebungsvariablen kommt (Franks Instanz),
// nicht bei selbst installierten Instanzen.
export function entwicklerSeiten(): boolean {
  return ausUmgebung() !== null;
}

async function ausDatenbank() {
  return basisPrisma.hauptzugang.findUnique({ where: { id: "standard" } });
}

// Ist die Einrichtung einmal erledigt, bleibt sie es. Nur das "erledigt"
// merken, sonst fragte proxy.ts bei jedem Aufruf die Datenbank. Nach dem
// Zurücksetzen (scripts/hauptzugang-zuruecksetzen.mjs) startet das Skript den
// Container deshalb neu.
let eingerichtet = false;

export async function einrichtungNoetig(): Promise<boolean> {
  if (eingerichtet || ausUmgebung()) return false;
  if (await ausDatenbank()) {
    eingerichtet = true;
    return false;
  }
  return true;
}

export async function hauptBenutzername(): Promise<string> {
  const umgebung = ausUmgebung();
  if (umgebung) return umgebung.benutzername;
  return (await ausDatenbank())?.benutzername ?? "";
}

// Ist das der Benutzername des Hauptzugangs? Groß-/Kleinschreibung egal - so
// kann sich kein Tester einen Namen geben, der wie der Hauptzugang aussieht.
export async function istAdminBenutzername(benutzername: string): Promise<boolean> {
  const admin = await hauptBenutzername();
  return admin !== "" && benutzername.trim().toLowerCase() === admin.trim().toLowerCase();
}

export async function hauptzugangPruefen(benutzername: string, passwort: string): Promise<boolean> {
  const umgebung = ausUmgebung();
  if (umgebung) {
    return (
      zeitkonstantGleich(benutzername, umgebung.benutzername) &&
      zeitkonstantGleich(passwort, umgebung.passwort)
    );
  }
  const zugang = await ausDatenbank();
  if (!zugang) return false;
  return (
    benutzername.trim().toLowerCase() === zugang.benutzername.toLowerCase() &&
    passwortPasstZuHash(passwort, zugang.passwortHash)
  );
}

// Legt den Hauptzugang an. false, wenn schon einer existiert (zwei Browser
// gleichzeitig im Assistenten).
export async function hauptzugangAnlegen(benutzername: string, passwort: string): Promise<boolean> {
  try {
    await basisPrisma.hauptzugang.create({
      data: { id: "standard", benutzername, passwortHash: passwortHashen(passwort) },
    });
  } catch {
    return false;
  }
  eingerichtet = true;
  return true;
}

// Der Einrichtungscode verhindert, dass ein Fremder die frisch installierte
// Instanz vor dem Besitzer übernimmt. Das Installationsskript schreibt ihn in
// die .env und zeigt ihn am Ende an. Fehlt er dort (z.B. eigene
// docker-compose-Datei), würfelt der Server einen und schreibt ihn ins
// Protokoll ("docker compose logs app").
// Auf globalThis, weil Next.js Module je Seite getrennt laden kann - Seite und
// Aktion müssen denselben Code sehen.
const speicher = globalThis as unknown as { einrichtungscode?: string };

export function einrichtungscode(): string {
  const ausEnv = process.env.EINRICHTUNG_CODE?.trim();
  if (ausEnv) return ausEnv;
  if (!speicher.einrichtungscode) {
    speicher.einrichtungscode = randomBytes(4).toString("hex");
    console.log(`Einrichtungscode für den ersten Start: ${speicher.einrichtungscode}`);
  }
  return speicher.einrichtungscode;
}

// Groß-/Kleinschreibung, Leerzeichen und Bindestriche zählen nicht.
function normalisiert(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function einrichtungscodePruefen(eingabe: string): boolean {
  const erwartet = normalisiert(einrichtungscode());
  return erwartet !== "" && zeitkonstantGleich(normalisiert(eingabe), erwartet);
}
