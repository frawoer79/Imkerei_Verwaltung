import { readFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";
import { uploadPfad } from "@/lib/uploads";
import { entschluesseln } from "@/lib/geheim";
import { zuchtkartenPdfErzeugen } from "@/lib/zuchtkarte-druck";
import type { DokumentTyp } from "@/lib/dokumente-typen";

// Versand von Dokumenten per E-Mail. Der Zugang zum Postausgangsserver (SMTP -
// das Protokoll, mit dem Mailprogramme Nachrichten an den Mailanbieter
// übergeben) wird unter Einstellungen → E-Mail-Versand eingetragen und liegt je Konto
// in der Datenbank, das Passwort verschlüsselt (siehe lib/geheim.ts). Ohne
// Eintrag - oder solange noch keine Testmail durchging - ist der Versand aus
// und der Knopf unter Dokumente erscheint gar nicht.

export type MailKonfig = {
  host: string;
  port: number;
  benutzer: string | null;
  passwort: string | null;
  absender: string;
};

// Gespeicherte Zugangsdaten samt entschlüsseltem Passwort. `passwortLesbar`
// ist false, wenn ein Passwort gespeichert ist, sich aber nicht mehr
// entschlüsseln lässt (ANMELDUNG_GEHEIMNIS wurde geändert). Ohne Sitzung
// (Passwort vergessen) gibt der Aufrufer den Client für Franks Daten mit.
export async function mailKonfigLaden(client: Pick<PrismaClient, "mailEinstellung"> = prisma): Promise<
  (MailKonfig & { getestetAm: Date | null; passwortLesbar: boolean }) | null
> {
  const eintrag = await client.mailEinstellung.findUnique({ where: { id: "standard" } });
  if (!eintrag) return null;
  const passwort = eintrag.passwortVerschluesselt ? entschluesseln(eintrag.passwortVerschluesselt) : null;
  return {
    host: eintrag.host,
    port: eintrag.port,
    benutzer: eintrag.benutzer,
    passwort,
    absender: eintrag.absender,
    getestetAm: eintrag.getestetAm,
    passwortLesbar: !eintrag.passwortVerschluesselt || passwort !== null,
  };
}

// Eingetragen und mit einer Testmail bestätigt? Nur dann gibt es den Knopf.
export async function mailBereit(client: Pick<PrismaClient, "mailEinstellung"> = prisma): Promise<boolean> {
  const konfig = await mailKonfigLaden(client);
  return Boolean(konfig?.getestetAm && konfig.passwortLesbar);
}

// Viele Anbieter nehmen Mails bis 20-25 MB an. Anhänge wachsen beim Versand
// um ein Drittel (Base64-Kodierung), 15 MB Dateien werden also gut 20 MB Mail.
export function maxAnhangBytes(): number {
  return 15 * 1024 * 1024;
}

// Wie viele zuletzt benutzte Empfänger als Vorschlag aufgehoben werden.
const MAX_LETZTE_EMPFAENGER = 8;

export async function letzteEmpfaengerLaden(): Promise<string[]> {
  const eintraege = await prisma.mailEmpfaenger.findMany({
    orderBy: { zuletztAm: "desc" },
    take: MAX_LETZTE_EMPFAENGER,
  });
  return eintraege.map((eintrag) => eintrag.adresse);
}

export async function empfaengerMerken(adressen: string[]): Promise<void> {
  const jetzt = new Date();
  for (const adresse of adressen) {
    await prisma.mailEmpfaenger.upsert({
      where: { adresse },
      create: { adresse, zuletztAm: jetzt },
      update: { zuletztAm: jetzt },
    });
  }
  const behalten = await prisma.mailEmpfaenger.findMany({
    orderBy: { zuletztAm: "desc" },
    take: MAX_LETZTE_EMPFAENGER,
    select: { adresse: true },
  });
  await prisma.mailEmpfaenger.deleteMany({
    where: { adresse: { notIn: behalten.map((eintrag) => eintrag.adresse) } },
  });
}

// Bewusst einfache Prüfung: genau ein @, davor etwas, dahinter ein Punkt.
// Ob es die Adresse wirklich gibt, weiß ohnehin erst der Mailserver.
export function adressenPruefen(eingabe: string): { adressen: string[] } | { fehler: string } {
  const adressen = [...new Set(eingabe.split(/[,;\s]+/).map((teil) => teil.trim()).filter(Boolean))];
  if (adressen.length === 0) return { fehler: "Bitte eine Empfänger-Adresse eingeben." };
  const falsch = adressen.find((adresse) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adresse));
  if (falsch) return { fehler: `„${falsch}“ ist keine gültige E-Mail-Adresse.` };
  if (adressen.length > 10) return { fehler: "Höchstens 10 Empfänger auf einmal." };
  return { adressen };
}

export type Anhang = { filename: string; content: Buffer; contentType: string };

// Lädt die ausgewählten Dokumente als Anhänge, je nach Art aus ihrer eigenen
// Tabelle bzw. bei der eigenen Zuchtkarte frisch als PDF erzeugt. Läuft über
// `prisma` und `uploadPfad`, also immer nur mit Daten des angemeldeten Kontos.
export async function anhaengeLaden(
  auswahl: { typ: DokumentTyp; id: string }[],
): Promise<{ anhaenge: Anhang[] } | { fehler: string }> {
  const anhaenge: Anhang[] = [];

  for (const { typ, id } of auswahl) {
    try {
      switch (typ) {
        case "DOKUMENT": {
          const dokument = await prisma.dokument.findUnique({ where: { id } });
          if (!dokument) return { fehler: "Ein ausgewähltes Dokument gibt es nicht mehr." };
          anhaenge.push({
            filename: dokument.originalDateiname,
            content: await readFile(await uploadPfad(dokument.dateiname)),
            contentType: dokument.mimeType,
          });
          break;
        }
        case "BEHANDLUNGSNACHWEIS": {
          const nachweis = await prisma.nachweisDatei.findUnique({ where: { id } });
          if (!nachweis) return { fehler: "Einen ausgewählten Nachweis gibt es nicht mehr." };
          anhaenge.push({
            filename: nachweis.originalDateiname,
            content: await readFile(await uploadPfad(nachweis.dateiname)),
            contentType: "application/pdf",
          });
          break;
        }
        case "LAGERLISTE": {
          const lagerliste = await prisma.lagerlisteDatei.findUnique({ where: { id } });
          if (!lagerliste) return { fehler: "Eine ausgewählte Lagerliste gibt es nicht mehr." };
          anhaenge.push({
            filename: lagerliste.originalDateiname,
            content: await readFile(await uploadPfad(lagerliste.dateiname)),
            contentType: "application/pdf",
          });
          break;
        }
        case "MEDIKAMENTENBELEG": {
          const beleg = await prisma.medikamentBeleg.findUnique({ where: { id } });
          if (!beleg) return { fehler: "Einen ausgewählten Beleg gibt es nicht mehr." };
          anhaenge.push({
            filename: beleg.originalDateiname,
            content: await readFile(await uploadPfad(beleg.dateiname)),
            contentType: beleg.mimeType,
          });
          break;
        }
        case "ZUCHTKARTE": {
          // Die hochgeladene Karte des Züchters trägt in der Liste die Kennung
          // "<koeniginId>-zuechterkarte", die selbst erstellte nur die Id.
          if (id.endsWith("-zuechterkarte")) {
            const koenigin = await prisma.koenigin.findUnique({
              where: { id: id.slice(0, -"-zuechterkarte".length) },
              select: { kennung: true, zuchtkarteFotoDateiname: true, zuchtkarteFotoMimeType: true },
            });
            if (!koenigin?.zuchtkarteFotoDateiname) return { fehler: "Eine ausgewählte Zuchtkarte gibt es nicht mehr." };
            const sauber = koenigin.kennung.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
            anhaenge.push({
              filename: `Zuchtkarte-Zuechter-${sauber || "koenigin"}${path.extname(koenigin.zuchtkarteFotoDateiname)}`,
              content: await readFile(await uploadPfad(koenigin.zuchtkarteFotoDateiname)),
              contentType: koenigin.zuchtkarteFotoMimeType ?? "application/octet-stream",
            });
          } else {
            const ergebnis = await zuchtkartenPdfErzeugen([id]);
            if ("fehler" in ergebnis) return { fehler: ergebnis.fehler };
            anhaenge.push({ filename: ergebnis.dateiname, content: ergebnis.pdf, contentType: "application/pdf" });
          }
          break;
        }
        default:
          return { fehler: "Unbekannte Dokumentart." };
      }
    } catch (fehler) {
      if ((fehler as NodeJS.ErrnoException).code === "ENOENT") {
        return { fehler: "Die Datei eines ausgewählten Dokuments fehlt auf dem Server." };
      }
      throw fehler;
    }
  }

  return { anhaenge: eindeutigeDateinamen(anhaenge) };
}

// Zwei Anhänge mit gleichem Namen (z.B. zweimal "scan.pdf") würden im
// Mailprogramm des Empfängers verwechselt - der zweite heißt dann "scan (2).pdf".
function eindeutigeDateinamen(anhaenge: Anhang[]): Anhang[] {
  const vergeben = new Set<string>();
  return anhaenge.map((anhang) => {
    let name = anhang.filename;
    const endung = path.extname(name);
    const stamm = name.slice(0, name.length - endung.length);
    for (let nummer = 2; vergeben.has(name.toLowerCase()); nummer++) {
      name = `${stamm} (${nummer})${endung}`;
    }
    vergeben.add(name.toLowerCase());
    return { ...anhang, filename: name };
  });
}

export async function mailSenden(
  konfig: MailKonfig,
  nachricht: {
    an: string[];
    kopieAn?: string;
    antwortAn?: string;
    absenderName?: string;
    betreff: string;
    text: string;
    anhaenge?: Anhang[];
  },
): Promise<void> {
  const transport = nodemailer.createTransport({
    host: konfig.host,
    port: konfig.port,
    // 465 ist von Anfang an verschlüsselt; 587 beginnt unverschlüsselt und
    // schaltet per STARTTLS um - das verlangen wir dann auch.
    secure: konfig.port === 465,
    requireTLS: konfig.port === 587,
    auth: konfig.benutzer ? { user: konfig.benutzer, pass: konfig.passwort ?? "" } : undefined,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 60_000,
  });

  await transport.sendMail({
    from: nachricht.absenderName ? { name: nachricht.absenderName, address: konfig.absender } : konfig.absender,
    to: nachricht.an,
    bcc: nachricht.kopieAn,
    replyTo: nachricht.antwortAn && nachricht.antwortAn !== konfig.absender ? nachricht.antwortAn : undefined,
    subject: nachricht.betreff,
    text: nachricht.text,
    attachments: nachricht.anhaenge,
  });
}

// Kurze, verständliche Fehlerursache aus dem, was der Mailserver meldet - ohne
// Zugangsdaten oder lange technische Ausgaben.
export function mailFehlerKurz(fehler: unknown): string {
  const code = (fehler as { code?: string }).code;
  switch (code) {
    case "EAUTH":
      return "Anmeldung am Mailserver abgelehnt, Benutzer und Passwort prüfen";
    case "ECONNECTION":
    case "ETIMEDOUT":
    case "ESOCKET":
    case "EDNS":
      return "Mailserver nicht erreichbar, Server und Port prüfen";
    case "EENVELOPE":
      return "Absender oder Empfänger vom Mailserver abgelehnt";
    case "EMESSAGE":
      return "Mail vom Mailserver abgelehnt, evtl. zu groß";
    default:
      return "Fehler beim Mailserver";
  }
}
