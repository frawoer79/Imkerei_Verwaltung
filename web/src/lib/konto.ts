import { cache } from "react";
import { cookies } from "next/headers";
import { basisPrisma, BASIS_SCHEMA } from "@/lib/datenbank";
import { hauptBenutzername } from "@/lib/hauptzugang";
import { ADMIN_KONTO, SITZUNGS_COOKIE_NAME, sitzungAusWert, testerSitzungGueltig } from "@/lib/anmeldung";
import { nutzerIdAusKonto, nutzerSitzungGueltig } from "@/lib/nutzer";

// Wer ist gerade angemeldet? Frank (Admin, seine Daten im Schema "public"),
// ein Helfer (arbeitet an Franks Daten mit, siehe nutzer.ts) oder ein Tester
// (eigenes Schema "tester_<id>", siehe testzugang.ts).

export type Konto =
  | { art: "admin"; schema: string; name: string }
  | {
      art: "nutzer";
      schema: string;
      name: string;
      nutzerId: string;
      nurLesen: boolean;
      passwortAendern: boolean;
    }
  | { art: "tester"; schema: string; name: string; testzugangId: string };

// Nur Kleinbuchstaben und Ziffern (so sehen die Kennungen aus, die Prisma
// erzeugt) - der Schemaname landet in SQL-Befehlen und darf nichts anderes
// enthalten.
export function testerSchema(testzugangId: string): string {
  if (!/^[a-z0-9]+$/.test(testzugangId)) {
    throw new Error("Ungültige Kennung eines Testzugangs.");
  }
  return `tester_${testzugangId}`;
}

// Einmal je Anfrage ermittelt (React `cache`), auch wenn eine Seite viele
// Datenbankabfragen macht.
export const aktuellesKonto = cache(async (): Promise<Konto | null> => {
  const cookieStore = await cookies();
  const sitzung = sitzungAusWert(cookieStore.get(SITZUNGS_COOKIE_NAME)?.value);
  if (!sitzung) return null;
  const { konto } = sitzung;
  if (konto === ADMIN_KONTO) {
    return { art: "admin", schema: BASIS_SCHEMA, name: await hauptBenutzername() };
  }
  // Helfer: gesperrt, entfernt oder Passwort seit dem Anmelden zurückgesetzt
  // heißt sofort abgemeldet, wie bei den Testzugängen.
  const nutzerId = nutzerIdAusKonto(konto);
  if (nutzerId) {
    const nutzer = await basisPrisma.nutzer.findUnique({
      where: { id: nutzerId },
      select: { id: true, name: true, stufe: true, aktiv: true, passwortAendern: true, sitzungenGueltigAb: true },
    });
    if (!nutzer || !nutzerSitzungGueltig(nutzer, sitzung.ausgestelltAm)) return null;
    return {
      art: "nutzer",
      schema: BASIS_SCHEMA,
      name: nutzer.name,
      nutzerId: nutzer.id,
      nurLesen: nutzer.stufe === "LESEN",
      passwortAendern: nutzer.passwortAendern,
    };
  }
  // Ein entfernter Testzugang (oder einer, dessen Passwort Frank seit dem
  // Anmelden zurückgesetzt hat) hat zwar noch ein gültig signiertes Cookie,
  // gilt aber ab sofort nicht mehr als angemeldet.
  const testzugang = await basisPrisma.testzugang.findUnique({
    where: { id: konto },
    select: { id: true, name: true, eingerichtetAm: true, sitzungenGueltigAb: true },
  });
  if (!testzugang || !testerSitzungGueltig(testzugang, sitzung.ausgestelltAm)) return null;
  return {
    art: "tester",
    schema: testerSchema(testzugang.id),
    name: testzugang.name ?? "",
    testzugangId: testzugang.id,
  };
});

export async function istAdmin(): Promise<boolean> {
  return (await aktuellesKonto())?.art === "admin";
}

export async function istHelfer(): Promise<boolean> {
  return (await aktuellesKonto())?.art === "nutzer";
}

// Darf das angemeldete Konto Daten ändern? Nur Helfer mit "Nur lesen" nicht.
export async function darfSchreiben(): Promise<boolean> {
  const konto = await aktuellesKonto();
  return konto !== null && !(konto.art === "nutzer" && konto.nurLesen);
}
