import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { basisPrisma } from "@/lib/datenbank";
import { mailBereit, mailFehlerKurz, mailKonfigLaden, mailSenden } from "@/lib/mail";

// Mails an Helfer: Link zur App beim Anlegen, Hinweis nach dem Zurücksetzen
// durch den Admin und der Link bei "Passwort vergessen". Bewusst nie ein
// Passwort in der Mail, das Startpasswort gibt der Admin auf anderem Weg
// weiter. Versendet wird über den Zugang unter Einstellungen -> E-Mail-Versand
// (lib/mail.ts), immer der des Hauptzugangs: Helfer arbeiten an seinen Daten.

// "Passwort vergessen"-Link: eine Stunde gültig, frühestens alle zwei
// Minuten ein neuer, damit niemand per Knopf Mails auf fremde Postfächer regnen
// lässt.
export const RESET_GUELTIG_MINUTEN = 60;
const RESET_PAUSE_MS = 2 * 60 * 1000;

export const PASSWORT_VERGESSEN_PFAD = "/passwort-vergessen";

export function helferMailBereit(): Promise<boolean> {
  return mailBereit(basisPrisma);
}

// Einfache Prüfung wie in lib/mail.ts. Leer ist erlaubt (keine Adresse).
export function helferEmailPruefen(eingabe: string): { email: string | null } | { fehler: string } {
  const email = eingabe.trim();
  if (email === "") return { email: null };
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { fehler: `„${email}“ ist keine gültige E-Mail-Adresse.` };
  }
  return { email };
}

// Adresse der App, wie der Browser sie gerade aufgerufen hat. Vertrauenswürdig,
// weil davor Coolify bzw. Caddy nur Anfragen an die eingetragene Domain
// durchlassen.
export async function appAdresse(): Promise<string> {
  const kopfzeilen = await headers();
  const gastgeber = kopfzeilen.get("host") ?? "localhost";
  const protokoll = kopfzeilen.get("x-forwarded-proto") ?? "https";
  return `${protokoll}://${gastgeber}`;
}

// Name aus Einstellungen -> Bienenhalter, damit der Helfer weiß, von wem die
// Mail kommt.
async function absenderName(): Promise<string | null> {
  const betrieb = await basisPrisma.betrieb.findUnique({ where: { id: "standard" }, select: { halterName: true } });
  return betrieb?.halterName.trim() || null;
}

// Versendet eine Mail und meldet einen verständlichen Fehler zurück statt zu
// werfen. Der Aufrufer entscheidet, ob er ihn anzeigt.
async function senden(an: string, betreff: string, text: string): Promise<{ fehler: string | null }> {
  const konfig = await mailKonfigLaden(basisPrisma);
  if (!konfig?.getestetAm || !konfig.passwortLesbar) {
    return { fehler: "E-Mail-Versand ist nicht eingerichtet." };
  }
  try {
    await mailSenden(konfig, { an: [an], absenderName: (await absenderName()) ?? undefined, betreff, text });
    return { fehler: null };
  } catch (fehler) {
    return { fehler: mailFehlerKurz(fehler) };
  }
}

function abschluss(): string {
  return "Diese Mail kommt automatisch aus der Imkereiverwaltung.";
}

export async function zugangsMailSenden(helfer: { name: string; email: string }): Promise<{ fehler: string | null }> {
  const adresse = await appAdresse();
  const von = (await absenderName()) ?? "Dein Imker";
  const text = [
    `Hallo ${helfer.name},`,
    "",
    `${von} hat dir einen Zugang zur Imkereiverwaltung eingerichtet.`,
    "",
    `Adresse: ${adresse}/login`,
    `Benutzername: ${helfer.name}`,
    "",
    `Das Startpasswort bekommst du von ${von} auf anderem Weg. Beim ersten Anmelden vergibst du ein eigenes Passwort.`,
    "",
    "Tipp fürs Handy: Seite öffnen und zum Home-Bildschirm hinzufügen. Dann startet sie wie eine App.",
    "",
    `Passwort vergessen? Auf der Anmeldeseite unter „Passwort vergessen“ bekommst du einen Link an diese Adresse.`,
    "",
    abschluss(),
  ].join("\n");
  return senden(helfer.email, "Dein Zugang zur Imkereiverwaltung", text);
}

export async function zuruecksetzenHinweisSenden(helfer: { name: string; email: string }): Promise<{ fehler: string | null }> {
  const adresse = await appAdresse();
  const von = (await absenderName()) ?? "Dein Imker";
  const text = [
    `Hallo ${helfer.name},`,
    "",
    "dein Passwort für die Imkereiverwaltung wurde zurückgesetzt. Du bist auf allen Geräten abgemeldet.",
    "",
    `Das neue Startpasswort bekommst du von ${von} auf anderem Weg. Beim nächsten Anmelden vergibst du wieder ein eigenes Passwort.`,
    "",
    `Adresse: ${adresse}/login`,
    `Benutzername: ${helfer.name}`,
    "",
    abschluss(),
  ].join("\n");
  return senden(helfer.email, "Dein Passwort wurde zurückgesetzt", text);
}

export function resetTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// "Passwort vergessen": Gibt es zum Namen einen aktiven Helfer mit Adresse,
// bekommt er einen Link. Der Aufrufer zeigt in jedem Fall dieselbe Meldung,
// damit niemand ausprobieren kann, welche Namen es gibt.
export async function resetLinkAnfordern(benutzername: string): Promise<void> {
  const nameKlein = benutzername.trim().toLowerCase();
  if (!nameKlein) return;
  const helfer = await basisPrisma.nutzer.findUnique({ where: { nameKlein } });
  if (!helfer?.aktiv || !helfer.email) return;
  if (helfer.resetAngefordertAm && Date.now() - helfer.resetAngefordertAm.getTime() < RESET_PAUSE_MS) return;
  if (!(await helferMailBereit())) return;

  const token = randomBytes(32).toString("base64url");
  const jetzt = new Date();
  await basisPrisma.nutzer.update({
    where: { id: helfer.id },
    data: {
      resetTokenHash: resetTokenHash(token),
      resetGueltigBis: new Date(jetzt.getTime() + RESET_GUELTIG_MINUTEN * 60 * 1000),
      resetAngefordertAm: jetzt,
    },
  });

  const adresse = await appAdresse();
  const text = [
    `Hallo ${helfer.name},`,
    "",
    "für deinen Zugang zur Imkereiverwaltung wurde ein neues Passwort angefordert. Über diesen Link vergibst du es:",
    "",
    `${adresse}${PASSWORT_VERGESSEN_PFAD}/${token}`,
    "",
    `Der Link gilt ${RESET_GUELTIG_MINUTEN} Minuten und nur einmal.`,
    "Hast du nichts angefordert, ignoriere diese Mail. Dein bisheriges Passwort bleibt dann gültig.",
    "",
    abschluss(),
  ].join("\n");
  const { fehler } = await senden(helfer.email, "Neues Passwort für die Imkereiverwaltung", text);
  if (fehler) console.error(`Passwort-vergessen-Mail an Helfer ${helfer.id} ging nicht raus: ${fehler}`);
}

// Zum Link aus der Mail den Helfer finden, solange der Link gilt.
export async function helferZuResetToken(token: string) {
  if (!token) return null;
  const helfer = await basisPrisma.nutzer.findUnique({ where: { resetTokenHash: resetTokenHash(token) } });
  if (!helfer?.aktiv || !helfer.resetGueltigBis || helfer.resetGueltigBis.getTime() < Date.now()) return null;
  return helfer;
}
