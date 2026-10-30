"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { basisPrisma } from "@/lib/datenbank";
import { aktuellesKonto, istAdmin } from "@/lib/konto";
import { passwortHashen, passwortPasstZuHash } from "@/lib/anmeldung";
import { sitzungSetzen } from "@/lib/sitzung";
import { anmeldenameVergeben, NUTZER_PASSWORT_MINDESTLAENGE, nutzerKonto } from "@/lib/nutzer";
import {
  helferEmailPruefen,
  helferZuResetToken,
  resetLinkAnfordern,
  zugangsMailSenden,
  zuruecksetzenHinweisSenden,
} from "@/lib/helfer-mail";

// Server-Aktionen rund um die Helfer-Zugänge (siehe lib/nutzer.ts). Anlegen,
// Zurücksetzen, Sperren und Entfernen darf nur der Admin - jede Aktion prüft
// das selbst, weil der Browser Server-Aktionen direkt aufrufen kann,
// unabhängig davon, welche Knöpfe eine Seite anzeigt.

const VERWALTUNG_PFAD = "/einstellungen/helfer";

async function nurAdmin() {
  if (!(await istAdmin())) {
    throw new Error("Nur der Admin darf Helfer verwalten.");
  }
}

function stufeAusFormular(formData: FormData): "SCHREIBEN" | "LESEN" {
  return formData.get("stufe")?.toString() === "LESEN" ? "LESEN" : "SCHREIBEN";
}

function startpasswortPruefen(passwort: string): string | null {
  if (passwort.length < NUTZER_PASSWORT_MINDESTLAENGE) {
    return `Das Startpasswort braucht mindestens ${NUTZER_PASSWORT_MINDESTLAENGE} Zeichen.`;
  }
  return null;
}

// `erfolg` zeigt dem Admin Name und Startpasswort noch einmal zum Weitergeben,
// `mail` ob die Mail an den Helfer rausging (null: keine verschickt).
export type HelferFormularState = {
  error: string | null;
  erfolg?: { name: string; passwort: string; mail: { an: string; fehler: string | null } | null };
};

export async function helferAnlegen(
  _vorherigerZustand: HelferFormularState,
  formData: FormData,
): Promise<HelferFormularState> {
  await nurAdmin();
  const name = (formData.get("name") ?? "").toString().trim();
  const passwort = (formData.get("passwort") ?? "").toString().trim();

  if (name.length < 2 || name.length > 40) return { error: "Bitte einen Namen mit 2 bis 40 Zeichen eingeben." };
  if (/[\s.]/.test(name)) return { error: "Der Name darf keine Leerzeichen und keine Punkte enthalten." };
  const passwortFehler = startpasswortPruefen(passwort);
  if (passwortFehler) return { error: passwortFehler };
  const emailErgebnis = helferEmailPruefen((formData.get("email") ?? "").toString());
  if ("fehler" in emailErgebnis) return { error: emailErgebnis.fehler };
  const { email } = emailErgebnis;
  if (await anmeldenameVergeben(name)) return { error: "Dieser Name ist schon vergeben." };

  try {
    await basisPrisma.nutzer.create({
      data: {
        name,
        nameKlein: name.toLowerCase(),
        passwortHash: passwortHashen(passwort),
        stufe: stufeAusFormular(formData),
        passwortAendern: true,
        email,
      },
    });
  } catch {
    // Eindeutigkeit verletzt: im selben Moment doppelt abgeschickt.
    return { error: "Dieser Name ist schon vergeben." };
  }
  revalidatePath(VERWALTUNG_PFAD);
  const mail =
    email && formData.get("mailSenden") === "ja" ? { an: email, ...(await zugangsMailSenden({ name, email })) } : null;
  return { error: null, erfolg: { name, passwort, mail } };
}

// Neues Startpasswort: das alte gilt sofort nicht mehr, der Helfer wird auf
// allen Geräten abgemeldet und muss beim nächsten Anmelden ein eigenes
// Passwort vergeben.
export async function helferPasswortZuruecksetzen(
  nutzerId: string,
  _vorherigerZustand: HelferFormularState,
  formData: FormData,
): Promise<HelferFormularState> {
  await nurAdmin();
  const passwort = (formData.get("passwort") ?? "").toString().trim();
  const passwortFehler = startpasswortPruefen(passwort);
  if (passwortFehler) return { error: passwortFehler };

  // Ein offener "Passwort vergessen"-Link gilt danach nicht mehr.
  const nutzer = await basisPrisma.nutzer.update({
    where: { id: nutzerId },
    data: {
      passwortHash: passwortHashen(passwort),
      passwortAendern: true,
      sitzungenGueltigAb: new Date(),
      resetTokenHash: null,
      resetGueltigBis: null,
    },
  });
  revalidatePath(VERWALTUNG_PFAD);
  const mail =
    nutzer.email && formData.get("mailSenden") === "ja"
      ? { an: nutzer.email, ...(await zuruecksetzenHinweisSenden({ name: nutzer.name, email: nutzer.email })) }
      : null;
  return { error: null, erfolg: { name: nutzer.name, passwort, mail } };
}

// --- E-Mail-Adresse eines Helfers -------------------------------------------

export type HelferEmailState = { error: string | null; meldung?: string };

export async function helferEmailSpeichern(
  nutzerId: string,
  _vorherigerZustand: HelferEmailState,
  formData: FormData,
): Promise<HelferEmailState> {
  await nurAdmin();
  const ergebnis = helferEmailPruefen((formData.get("email") ?? "").toString());
  if ("fehler" in ergebnis) return { error: ergebnis.fehler };
  // Neue Adresse: ein Link an die alte gilt nicht mehr.
  await basisPrisma.nutzer.update({
    where: { id: nutzerId },
    data: { email: ergebnis.email, resetTokenHash: null, resetGueltigBis: null },
  });
  revalidatePath(VERWALTUNG_PFAD);
  return { error: null, meldung: ergebnis.email ? "Gespeichert." : "Adresse entfernt." };
}

// Link zur App (noch einmal) schicken, z.B. wenn die erste Mail nicht ankam.
export async function helferZugangsMailSenden(nutzerId: string): Promise<HelferEmailState> {
  await nurAdmin();
  const nutzer = await basisPrisma.nutzer.findUnique({ where: { id: nutzerId } });
  if (!nutzer?.email) return { error: "Für diesen Helfer ist keine E-Mail-Adresse hinterlegt." };
  const { fehler } = await zugangsMailSenden({ name: nutzer.name, email: nutzer.email });
  if (fehler) return { error: `Mail ging nicht raus: ${fehler}.` };
  return { error: null, meldung: `Link an ${nutzer.email} geschickt.` };
}

export async function helferStufeSetzen(nutzerId: string, stufe: "SCHREIBEN" | "LESEN") {
  await nurAdmin();
  await basisPrisma.nutzer.update({ where: { id: nutzerId }, data: { stufe: stufe === "LESEN" ? "LESEN" : "SCHREIBEN" } });
  revalidatePath(VERWALTUNG_PFAD);
}

// Sperren meldet sofort auf allen Geräten ab. Entsperren lässt ihn mit seinem
// bisherigen Passwort wieder hinein.
export async function helferAktivSetzen(nutzerId: string, aktiv: boolean) {
  await nurAdmin();
  await basisPrisma.nutzer.update({
    where: { id: nutzerId },
    data: aktiv ? { aktiv: true } : { aktiv: false, sitzungenGueltigAb: new Date() },
  });
  revalidatePath(VERWALTUNG_PFAD);
}

// Entfernt nur den Zugang. Was der Helfer eingetragen hat, bleibt.
export async function helferEntfernen(nutzerId: string) {
  await nurAdmin();
  await basisPrisma.nutzer.deleteMany({ where: { id: nutzerId } });
  revalidatePath(VERWALTUNG_PFAD);
}

// --- Eigenes Passwort ändern (Helfer) ---------------------------------------

export type PasswortAendernState = { error: string | null; gespeichert?: boolean };

export async function eigenesPasswortAendern(
  _vorherigerZustand: PasswortAendernState,
  formData: FormData,
): Promise<PasswortAendernState> {
  const konto = await aktuellesKonto();
  if (konto?.art !== "nutzer") return { error: "Nur Helfer ändern ihr Passwort hier." };

  const bisher = (formData.get("bisher") ?? "").toString();
  const neu = (formData.get("passwort") ?? "").toString();
  const wiederholung = (formData.get("passwortWiederholung") ?? "").toString();

  const nutzer = await basisPrisma.nutzer.findUnique({ where: { id: konto.nutzerId } });
  if (!nutzer || !passwortPasstZuHash(bisher, nutzer.passwortHash)) {
    return { error: "Das bisherige Passwort stimmt nicht." };
  }
  if (neu.length < NUTZER_PASSWORT_MINDESTLAENGE) {
    return { error: `Das neue Passwort braucht mindestens ${NUTZER_PASSWORT_MINDESTLAENGE} Zeichen.` };
  }
  if (neu !== wiederholung) return { error: "Die beiden neuen Passwörter stimmen nicht überein." };
  if (neu === bisher) return { error: "Bitte ein anderes Passwort als das bisherige wählen." };

  // Andere Geräte abmelden, dieses gleich wieder anmelden (neues Cookie, das
  // nach dem Stichtag ausgestellt ist).
  const warStartpasswort = nutzer.passwortAendern;
  await basisPrisma.nutzer.update({
    where: { id: nutzer.id },
    data: { passwortHash: passwortHashen(neu), passwortAendern: false, sitzungenGueltigAb: new Date() },
  });
  await sitzungSetzen(nutzerKonto(nutzer.id));

  if (warStartpasswort) redirect("/");
  return { error: null, gespeichert: true };
}

// --- Passwort vergessen (ohne Anmeldung) -------------------------------------

export type PasswortVergessenState = { error: string | null; gesendet?: boolean };

// Antwortet immer gleich, ob es den Namen gibt oder nicht.
export async function passwortVergessenAnfordern(
  _vorherigerZustand: PasswortVergessenState,
  formData: FormData,
): Promise<PasswortVergessenState> {
  const benutzername = (formData.get("benutzername") ?? "").toString();
  if (!benutzername.trim()) return { error: "Bitte deinen Benutzernamen eingeben." };
  await resetLinkAnfordern(benutzername);
  return { error: null, gesendet: true };
}

export async function passwortPerLinkSetzen(
  token: string,
  _vorherigerZustand: PasswortAendernState,
  formData: FormData,
): Promise<PasswortAendernState> {
  const nutzer = await helferZuResetToken(token);
  if (!nutzer) return { error: "Der Link ist abgelaufen oder wurde schon benutzt. Fordere einen neuen an." };

  const neu = (formData.get("passwort") ?? "").toString();
  const wiederholung = (formData.get("passwortWiederholung") ?? "").toString();
  if (neu.length < NUTZER_PASSWORT_MINDESTLAENGE) {
    return { error: `Das neue Passwort braucht mindestens ${NUTZER_PASSWORT_MINDESTLAENGE} Zeichen.` };
  }
  if (neu !== wiederholung) return { error: "Die beiden Passwörter stimmen nicht überein." };

  // Link verbrauchen, alle Geräte abmelden, dieses gleich anmelden.
  await basisPrisma.nutzer.update({
    where: { id: nutzer.id },
    data: {
      passwortHash: passwortHashen(neu),
      passwortAendern: false,
      sitzungenGueltigAb: new Date(),
      resetTokenHash: null,
      resetGueltigBis: null,
      letzteAnmeldung: new Date(),
    },
  });
  await sitzungSetzen(nutzerKonto(nutzer.id));
  redirect("/");
}
