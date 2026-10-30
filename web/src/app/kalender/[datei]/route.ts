import { NextResponse } from "next/server";
import { basisPrisma, mitSchema, prisma } from "@/lib/prisma";
import { SICHTBARE_MASSNAHMEN } from "@/lib/massnahmen-sichtbar";
import { BASIS_SCHEMA } from "@/lib/datenbank";
import { testerSchema } from "@/lib/konto";
import { kalenderErzeugen } from "@/lib/kalender";

// Kalender-Feed zum Abonnieren. Kalender-Apps können sich nicht wie ein
// Browser anmelden, deshalb steckt die Berechtigung in der geheimen Kennung
// in der Adresse. Ohne Sitzung weiß die Route auch nicht, wessen Kalender
// gemeint ist - sie sucht die Kennung deshalb erst in Franks Daten, dann in
// denen der Testzugänge, und liefert nur Maßnahmen aus genau diesem Bereich.
export async function GET(
  _request: Request,
  context: { params: Promise<{ datei: string }> },
) {
  const { datei } = await context.params;
  const token = datei.replace(/\.ics$/i, "");
  if (!token) {
    return new NextResponse("Kalender nicht gefunden", { status: 404 });
  }

  const tester = await basisPrisma.testzugang.findMany({
    where: { eingerichtetAm: { not: null } },
    select: { id: true },
  });
  const schemas = [BASIS_SCHEMA, ...tester.map((eintrag) => testerSchema(eintrag.id))];
  for (const schema of schemas) {
    const antwort = await mitSchema(schema, () => kalenderAusliefern(token));
    if (antwort) return antwort;
  }
  return new NextResponse("Kalender nicht gefunden", { status: 404 });
}

async function kalenderAusliefern(token: string): Promise<NextResponse | null> {
  const betrieb = await prisma.betrieb.findFirst({
    where: { kalenderToken: token },
    select: { kalenderErinnerung: true, kalenderFarbe: true, kalenderTitel: true },
  });
  if (!betrieb) return null;

  // Ohne Königinnen gibt es keine Zucht - deren Schritte kommen nicht in den Kalender.
  // (direkt gelesen: die Anfrage läuft nacheinander durch mehrere Schemas)
  const bereichswahl = await prisma.bereichswahl.findUnique({ where: { id: "standard" } });
  const ohneZucht = bereichswahl?.abgeschaltet.includes("koeniginnen") ?? false;
  const massnahmen = await prisma.massnahme.findMany({
    where: {
      ...SICHTBARE_MASSNAHMEN,
      erledigt: false,
      imKalender: true,
      faelligAm: { not: null },
      ...(ohneZucht ? { zuchtserieId: null } : {}),
    },
    orderBy: { faelligAm: "asc" },
    select: {
      id: true,
      text: true,
      faelligAm: true,
      createdAt: true,
      volk: {
        select: { name: true, bienenstand: { select: { name: true, ort: true } } },
      },
    },
  });

  const kalender = kalenderErzeugen(
    massnahmen.map((massnahme) => ({
      id: massnahme.id,
      text: massnahme.text,
      faelligAm: massnahme.faelligAm!,
      createdAt: massnahme.createdAt,
      volkName: massnahme.volk.name,
      bienenstandName: massnahme.volk.bienenstand.name,
      bienenstandOrt: massnahme.volk.bienenstand.ort,
    })),
    {
      erinnerung: betrieb.kalenderErinnerung,
      farbe: betrieb.kalenderFarbe,
      titelMuster: betrieb.kalenderTitel,
    },
  );

  return new NextResponse(kalender, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="imkerei-massnahmen.ics"',
      // Kalender-Apps sollen den Feed nicht aus dem Zwischenspeicher nehmen.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
