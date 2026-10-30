import { randomInt } from "crypto";
import { basisPrisma } from "@/lib/datenbank";
import { istAdminBenutzername } from "@/lib/hauptzugang";

// Helfer-Zugänge: Personen, die mit an Franks Daten arbeiten (Familie,
// Mitimker). Anders als Testzugänge haben sie keinen eigenen Datenbereich,
// sondern sehen dieselben Stände und Völker wie der Hauptzugang. Der Admin legt
// sie unter Einstellungen -> Helfer mit einem Startpasswort an. Beim ersten
// Anmelden muss der Helfer ein eigenes Passwort vergeben (proxy.ts leitet bis
// dahin alles auf die Passwortseite um).
//
// Stufen: "Lesen und schreiben" darf Daten eintragen, ändern und löschen,
// "Nur lesen" darf nur ansehen. Die Sperre für "Nur lesen" sitzt zentral im
// Datenbankzugriff (lib/prisma.ts), damit keine Server-Aktion sie vergessen
// kann.

export const NUTZER_PASSWORT_MINDESTLAENGE = 8;

// Hier vergibt ein Helfer sein eigenes Passwort, beim ersten Anmelden
// zwangsweise, später freiwillig.
export const PASSWORT_SEITE = "/einstellungen/passwort";

// Im Sitzungs-Cookie steht statt "admin" oder der Kennung eines Testzugangs
// "nutzer-<id>". Testzugang-Kennungen bestehen nur aus Kleinbuchstaben und
// Ziffern, ein Bindestrich kann also nicht verwechselt werden.
const NUTZER_PRAEFIX = "nutzer-";

export function nutzerKonto(nutzerId: string): string {
  return `${NUTZER_PRAEFIX}${nutzerId}`;
}

export function nutzerIdAusKonto(konto: string): string | null {
  return konto.startsWith(NUTZER_PRAEFIX) ? konto.slice(NUTZER_PRAEFIX.length) : null;
}

// Gilt die Sitzung eines Helfers noch? Er muss aktiv sein, und das Cookie darf
// nicht vor dem letzten Zurücksetzen, Sperren oder Passwortwechsel ausgestellt
// worden sein.
export function nutzerSitzungGueltig(
  nutzer: { aktiv: boolean; sitzungenGueltigAb: Date | null } | null,
  ausgestelltAm: number,
): boolean {
  if (!nutzer?.aktiv) return false;
  return !nutzer.sitzungenGueltigAb || ausgestelltAm >= nutzer.sitzungenGueltigAb.getTime();
}

// Ist der Name schon vergeben, als Hauptzugang, Testzugang oder anderer
// Helfer? Alle melden sich über dasselbe Formular an, der Name muss also
// eindeutig sein.
export async function anmeldenameVergeben(name: string, ausserNutzerId?: string): Promise<boolean> {
  const nameKlein = name.trim().toLowerCase();
  if (await istAdminBenutzername(name)) return true;
  if (await basisPrisma.testzugang.findUnique({ where: { nameKlein }, select: { id: true } })) return true;
  const nutzer = await basisPrisma.nutzer.findUnique({ where: { nameKlein }, select: { id: true } });
  return nutzer !== null && nutzer.id !== ausserNutzerId;
}

// Vorschlag für ein Startpasswort, gut vorzulesen oder abzutippen
// ("Honig-Zarge-47"). Der Admin kann es im Feld überschreiben.
const WOERTER = ["Wabe", "Honig", "Drohne", "Zarge", "Pollen", "Weisel", "Rahmen", "Beute", "Nektar", "Linde", "Raps", "Klee"];

export function startpasswortVorschlag(): string {
  const zufall = (n: number) => randomInt(n);
  const erstes = WOERTER[zufall(WOERTER.length)];
  let zweites = WOERTER[zufall(WOERTER.length)];
  while (zweites === erstes) zweites = WOERTER[zufall(WOERTER.length)];
  return `${erstes}-${zweites}-${10 + zufall(90)}`;
}
