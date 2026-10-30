"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { basisPrisma } from "@/lib/datenbank";
import { istAdmin, testerSchema } from "@/lib/konto";
import { beispieldatenAnlegen } from "@/lib/beispieldaten";
import { passwortHashen } from "@/lib/anmeldung";
import { anmeldenameVergeben } from "@/lib/nutzer";
import { sitzungSetzen } from "@/lib/sitzung";
import {
  MAX_TESTZUGAENGE,
  PASSWORT_MINDESTLAENGE,
  testerDatenAnlegen,
  testerDatenLoeschen,
} from "@/lib/testzugang";

// Server-Aktionen rund um die Testzugänge. Einladen und Entfernen darf nur
// Frank (Admin) - jede Aktion prüft das selbst, weil der Browser
// Server-Aktionen direkt aufrufen kann, unabhängig davon, welche Knöpfe eine
// Seite anzeigt.

const VERWALTUNG_PFAD = "/einstellungen/testzugaenge";

async function nurAdmin() {
  if (!(await istAdmin())) {
    throw new Error("Nur der Administrator darf Testzugänge verwalten.");
  }
}

export async function testzugangEinladen(formData: FormData) {
  await nurAdmin();
  const notiz = (formData.get("notiz") ?? "").toString().trim().slice(0, 100) || null;

  const anzahl = await basisPrisma.testzugang.count();
  if (anzahl >= MAX_TESTZUGAENGE) {
    throw new Error(`Es sind höchstens ${MAX_TESTZUGAENGE} Testzugänge möglich.`);
  }

  await basisPrisma.testzugang.create({
    data: { einladungToken: randomBytes(24).toString("base64url"), notiz },
  });
  revalidatePath(VERWALTUNG_PFAD);
}

// Entfernt einen Testzugang samt aller seiner Daten, egal ob die Einladung
// schon eingelöst wurde. Der Tester ist ab sofort abgemeldet.
export async function testzugangEntfernen(testzugangId: string) {
  await nurAdmin();
  const testzugang = await basisPrisma.testzugang.findUnique({ where: { id: testzugangId } });
  if (!testzugang) return;

  // Erst die Daten, dann den Eintrag: schlägt das Löschen der Daten fehl,
  // bleibt der Testzugang sichtbar und Frank kann es erneut versuchen.
  await testerDatenLoeschen(testzugang.id);
  await basisPrisma.testzugang.delete({ where: { id: testzugang.id } });
  revalidatePath(VERWALTUNG_PFAD);
}

// Beispielstand nachträglich anlegen, etwa für Testzugänge, die es schon vor
// den Beispieldaten gab. Liegt er schon da, passiert nichts.
export async function beispieldatenNachreichen(testzugangId: string) {
  await nurAdmin();
  const testzugang = await basisPrisma.testzugang.findUnique({ where: { id: testzugangId } });
  if (!testzugang?.eingerichtetAm) return;
  await beispieldatenAnlegen(testerSchema(testzugang.id));
  revalidatePath(VERWALTUNG_PFAD);
}

// `name` geht zurück ans Formular, damit er nach einem Fehler stehen bleibt.
// Bei Erfolg setzt die Aktion das Sitzungs-Cookie und gibt kein Ergebnis
// zurück: Next.js lädt die Seite danach neu, und die Einladungsseite zeigt dem
// nun angemeldeten Tester die Willkommenskarte (siehe einladung/[token]/page.tsx).
export type EinloesenState = { error: string | null; name?: string };

// Der Tester öffnet seinen persönlichen Link zum ersten Mal: Name und
// Passwort vergeben, Hinweis zur Testinstanz bestätigen. Danach bekommt er
// seinen eigenen, leeren Datenbereich und ist gleich angemeldet.
export async function einladungEinloesen(
  token: string,
  _vorherigerZustand: EinloesenState,
  formData: FormData,
): Promise<EinloesenState> {
  const testzugang = await basisPrisma.testzugang.findUnique({ where: { einladungToken: token } });
  if (!testzugang || testzugang.eingerichtetAm) {
    return { error: "Dieser Einladungslink ist ungültig oder wurde schon verwendet." };
  }

  const name = (formData.get("name") ?? "").toString().trim();
  const passwort = (formData.get("passwort") ?? "").toString();
  const passwortWiederholung = (formData.get("passwortWiederholung") ?? "").toString();
  const hinweisGelesen = formData.get("hinweisGelesen")?.toString() === "ja";

  if (name.length < 2 || name.length > 40) {
    return { error: "Bitte einen Namen mit 2 bis 40 Zeichen wählen.", name };
  }
  if (passwort.length < PASSWORT_MINDESTLAENGE) {
    return { error: `Das Passwort braucht mindestens ${PASSWORT_MINDESTLAENGE} Zeichen.`, name };
  }
  if (passwort !== passwortWiederholung) {
    return { error: "Die beiden Passwörter stimmen nicht überein.", name };
  }
  if (!hinweisGelesen) {
    return { error: "Bitte bestätige den Hinweis zur Testversion.", name };
  }

  const nameKlein = name.toLowerCase();
  if (await anmeldenameVergeben(name)) {
    return { error: "Dieser Name ist schon vergeben. Bitte einen anderen wählen.", name };
  }

  try {
    await testerDatenAnlegen(testzugang.id);
  } catch (fehler) {
    console.error("Testzugang einrichten fehlgeschlagen:", fehler);
    return { error: "Das Einrichten hat nicht geklappt. Bitte später erneut versuchen.", name };
  }

  // Beispielstand mit drei Völkern, damit der Tester nicht vor einer leeren
  // App sitzt. Klappt das nicht, ist der Zugang trotzdem brauchbar - Frank
  // kann die Beispieldaten unter Einstellungen -> Testzugänge nachreichen.
  try {
    await beispieldatenAnlegen(testerSchema(testzugang.id));
  } catch (fehler) {
    console.error("Beispieldaten anlegen fehlgeschlagen:", fehler);
  }

  // Nur einlösen, wenn das nicht inzwischen jemand anderes getan hat (zwei
  // gleichzeitige Absendungen) oder Frank den Zugang gerade entfernt hat.
  let eingeloest: number;
  try {
    eingeloest = (
      await basisPrisma.testzugang.updateMany({
        where: { id: testzugang.id, eingerichtetAm: null },
        data: {
          name,
          nameKlein,
          passwortHash: passwortHashen(passwort),
          eingerichtetAm: new Date(),
          letzteAnmeldung: new Date(),
        },
      })
    ).count;
  } catch {
    // Eindeutigkeit von nameKlein verletzt: im selben Moment hat jemand
    // anderes denselben Namen gewählt.
    return { error: "Dieser Name ist schon vergeben. Bitte einen anderen wählen.", name };
  }
  if (eingeloest === 0) {
    // Hat Frank den Zugang in der Zwischenzeit entfernt, das eben angelegte
    // Schema nicht verwaist liegen lassen.
    if (!(await basisPrisma.testzugang.findUnique({ where: { id: testzugang.id } }))) {
      await testerDatenLoeschen(testzugang.id);
    }
    return { error: "Dieser Einladungslink ist ungültig oder wurde schon verwendet.", name };
  }

  await sitzungSetzen(testzugang.id);
  return { error: null, name };
}

// Frank setzt das Passwort eines Testers zurück (z.B. weil es vergessen wurde):
// Name und Daten bleiben, das alte Passwort und der Zugang damit sofort
// gesperrt - auch auf Geräten, auf denen der Tester noch angemeldet ist - und
// es entsteht ein neuer einmaliger Link zum Neuvergeben.
export async function passwortLinkErzeugen(testzugangId: string) {
  await nurAdmin();
  await basisPrisma.testzugang.updateMany({
    where: { id: testzugangId, eingerichtetAm: { not: null } },
    data: {
      passwortHash: null,
      einladungToken: randomBytes(24).toString("base64url"),
      sitzungenGueltigAb: new Date(),
    },
  });
  revalidatePath(VERWALTUNG_PFAD);
}

// Der Tester öffnet den Link zum Neuvergeben des Passworts.
export async function passwortNeuVergeben(
  token: string,
  _vorherigerZustand: EinloesenState,
  formData: FormData,
): Promise<EinloesenState> {
  const testzugang = await basisPrisma.testzugang.findUnique({ where: { einladungToken: token } });
  if (!testzugang?.eingerichtetAm || testzugang.passwortHash) {
    return { error: "Dieser Link ist ungültig oder wurde schon verwendet." };
  }

  const passwort = (formData.get("passwort") ?? "").toString();
  const passwortWiederholung = (formData.get("passwortWiederholung") ?? "").toString();
  if (passwort.length < PASSWORT_MINDESTLAENGE) {
    return { error: `Das Passwort braucht mindestens ${PASSWORT_MINDESTLAENGE} Zeichen.` };
  }
  if (passwort !== passwortWiederholung) {
    return { error: "Die beiden Passwörter stimmen nicht überein." };
  }

  // Nur wenn der Link in der Zwischenzeit nicht schon benutzt wurde.
  const gesetzt = await basisPrisma.testzugang.updateMany({
    where: { id: testzugang.id, passwortHash: null },
    data: {
      passwortHash: passwortHashen(passwort),
      letzteAnmeldung: new Date(),
    },
  });
  if (gesetzt.count === 0) {
    return { error: "Dieser Link ist ungültig oder wurde schon verwendet." };
  }

  await sitzungSetzen(testzugang.id);
  return { error: null };
}
