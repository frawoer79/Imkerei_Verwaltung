"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DOKUMENT_TYP_LABEL, dateigroesseAnzeige, type DokumentTyp } from "@/lib/dokumente-typen";
import { verschluesseln } from "@/lib/geheim";
import {
  adressenPruefen,
  anhaengeLaden,
  empfaengerMerken,
  mailFehlerKurz,
  mailKonfigLaden,
  mailSenden,
  maxAnhangBytes,
} from "@/lib/mail";

export type MailErgebnis = { ok: true; meldung: string } | { ok: false; meldung: string };

const MAX_DOKUMENTE = 30;

// Name und eigene Adresse aus Einstellungen → Bienenhalter: Absendername,
// Antwortadresse und Ziel von "Kopie an mich" bzw. der Testmail.
async function eigeneAngaben(absender: string) {
  const betrieb = await prisma.betrieb.findUnique({
    where: { id: "standard" },
    select: { halterName: true, email: true },
  });
  return {
    name: betrieb?.halterName?.trim() || undefined,
    adresse: betrieb?.email?.trim() || absender,
  };
}

// Versendet die auf der Dokumente-Seite angekreuzten Dokumente als Anhänge
// einer E-Mail. `auswahl` kommt als JSON-Liste aus {typ, id}, wie sie die
// Liste kennt - geladen wird alles neu aus der Datenbank des angemeldeten
// Kontos, nichts davon wird ungeprüft übernommen.
export async function dokumenteVersenden(formData: FormData): Promise<MailErgebnis> {
  const konfig = await mailKonfigLaden();
  if (!konfig?.getestetAm || !konfig.passwortLesbar) {
    return { ok: false, meldung: "Der E-Mail-Versand ist unter Einstellungen → E-Mail-Versand nicht eingerichtet." };
  }

  let auswahl: { typ: DokumentTyp; id: string }[];
  try {
    const roh = JSON.parse(String(formData.get("auswahl") ?? "[]")) as unknown;
    if (!Array.isArray(roh)) throw new Error();
    auswahl = roh.map((eintrag) => {
      const { typ, id } = eintrag as { typ: unknown; id: unknown };
      if (typeof id !== "string" || typeof typ !== "string" || !(typ in DOKUMENT_TYP_LABEL)) throw new Error();
      return { typ: typ as DokumentTyp, id };
    });
  } catch {
    return { ok: false, meldung: "Die Auswahl der Dokumente ist ungültig." };
  }
  if (auswahl.length === 0) return { ok: false, meldung: "Bitte mindestens ein Dokument ankreuzen." };
  if (auswahl.length > MAX_DOKUMENTE) {
    return { ok: false, meldung: `Höchstens ${MAX_DOKUMENTE} Dokumente auf einmal.` };
  }

  const empfaenger = adressenPruefen(String(formData.get("an") ?? ""));
  if ("fehler" in empfaenger) return { ok: false, meldung: empfaenger.fehler };

  const betreff = String(formData.get("betreff") ?? "").trim() || "Dokumente";
  const text = String(formData.get("text") ?? "");

  const geladen = await anhaengeLaden(auswahl);
  if ("fehler" in geladen) return { ok: false, meldung: geladen.fehler };

  const gesamt = geladen.anhaenge.reduce((summe, anhang) => summe + anhang.content.byteLength, 0);
  if (gesamt > maxAnhangBytes()) {
    return {
      ok: false,
      meldung: `Die Auswahl ist mit ${dateigroesseAnzeige(gesamt)} zu groß für eine E-Mail (höchstens ${dateigroesseAnzeige(maxAnhangBytes())}). Bitte auf mehrere Mails aufteilen.`,
    };
  }

  const ich = await eigeneAngaben(konfig.absender);
  try {
    await mailSenden(konfig, {
      an: empfaenger.adressen,
      kopieAn: formData.get("kopie") === "on" ? ich.adresse : undefined,
      antwortAn: ich.adresse,
      absenderName: ich.name,
      betreff,
      text,
      anhaenge: geladen.anhaenge,
    });
  } catch (fehler) {
    console.error("E-Mail-Versand fehlgeschlagen:", fehler);
    return {
      ok: false,
      meldung: `Die E-Mail konnte nicht versendet werden (${mailFehlerKurz(fehler)}). Bitte später noch einmal versuchen.`,
    };
  }

  await empfaengerMerken(empfaenger.adressen);

  const anzahl = geladen.anhaenge.length;
  return {
    ok: true,
    meldung: `${anzahl} ${anzahl === 1 ? "Dokument" : "Dokumente"} an ${empfaenger.adressen.join(", ")} versendet.`,
  };
}

// Speichert die Zugangsdaten unter Einstellungen → E-Mail-Versand und schickt danach
// gleich eine Testmail an die eigene Adresse. Erst wenn die durchgeht, gilt
// der Versand als eingerichtet (getestetAm) und der Knopf unter Dokumente
// erscheint. Ein leeres Passwortfeld behält das gespeicherte Passwort.
export async function mailEinstellungenSpeichern(formData: FormData): Promise<MailErgebnis> {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const host = text("host");
  const port = Number(text("port"));
  const benutzer = text("benutzer") || null;
  const neuesPasswort = String(formData.get("passwort") ?? "");
  const absender = text("absender");

  if (!host) return { ok: false, meldung: "Bitte den Postausgangsserver eintragen." };
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, meldung: "Bitte einen gültigen Port eintragen (meist 587 oder 465)." };
  }
  const absenderGeprueft = adressenPruefen(absender);
  if ("fehler" in absenderGeprueft || absenderGeprueft.adressen.length !== 1) {
    return { ok: false, meldung: "Bitte genau eine gültige Absenderadresse eintragen." };
  }

  const vorher = await prisma.mailEinstellung.findUnique({ where: { id: "standard" } });
  // Ohne Benutzer gibt es auch kein Passwort; sonst das neue, und wenn das
  // Feld leer blieb, das bisher gespeicherte.
  const passwortVerschluesselt = !benutzer
    ? null
    : neuesPasswort
      ? verschluesseln(neuesPasswort)
      : (vorher?.passwortVerschluesselt ?? null);

  const daten = { host, port, benutzer, passwortVerschluesselt, absender, getestetAm: null };
  await prisma.mailEinstellung.upsert({
    where: { id: "standard" },
    create: { id: "standard", ...daten },
    update: daten,
  });
  revalidatePath("/einstellungen", "layout");
  revalidatePath("/dokumente");

  const konfig = await mailKonfigLaden();
  if (!konfig?.passwortLesbar) {
    return { ok: false, meldung: "Gespeichert, aber das alte Passwort ist nicht mehr lesbar. Bitte neu eingeben." };
  }

  const ich = await eigeneAngaben(konfig.absender);
  try {
    await mailSenden(konfig, {
      an: [ich.adresse],
      absenderName: ich.name,
      betreff: "Testmail aus der Imkereiverwaltung",
      text: "Diese Mail bestätigt, dass der E-Mail-Versand der Imkereiverwaltung funktioniert. Unter „Dokumente“ kannst du jetzt Dokumente per E-Mail versenden.",
    });
  } catch (fehler) {
    console.error("Testmail fehlgeschlagen:", fehler);
    return {
      ok: false,
      meldung: `Gespeichert, aber die Testmail ging nicht raus (${mailFehlerKurz(fehler)}). Bis eine Testmail durchgeht, bleibt der Versand aus.`,
    };
  }

  await prisma.mailEinstellung.update({ where: { id: "standard" }, data: { getestetAm: new Date() } });
  revalidatePath("/einstellungen", "layout");
  revalidatePath("/dokumente");
  return { ok: true, meldung: `Gespeichert. Die Testmail an ${ich.adresse} ist raus, der Versand ist eingerichtet.` };
}

// Schaltet den Versand ab: Zugangsdaten samt Passwort werden gelöscht, der
// Knopf unter Dokumente verschwindet.
export async function mailEinstellungenEntfernen(): Promise<void> {
  await prisma.mailEinstellung.deleteMany({});
  revalidatePath("/einstellungen", "layout");
  revalidatePath("/dokumente");
}
