import { prisma } from "@/lib/prisma";
import {
  BEURTEILUNGS_KRITERIEN,
  type BeurteilungsFeld,
  type LetzteBewertungen,
  type LetzteWabenzahlen,
} from "@/components/stockkarten-eintrag-felder";

// Vorbelegung für eine neue Durchsicht: je Volk die besetzten Wabengassen
// und bebrüteten Waben der letzten Durchsicht, in der sie erfasst wurden.
// Je Feld getrennt gesucht - eine reine Fütterung dazwischen soll die
// Vorgabe nicht leeren. 0 zählt nicht: ältere Einträge haben nicht
// angefasste Steller als 0 gespeichert.
export async function letzteWabenzahlenLaden(bienenstandId: string): Promise<Map<string, LetzteWabenzahlen>> {
  const reihenfolge = [{ datum: "desc" as const }, { createdAt: "desc" as const }];
  const [besetzt, bebruetet] = await Promise.all([
    prisma.stockkartenEintrag.findMany({
      where: { volk: { bienenstandId }, volksstaerke: { gt: 0 } },
      orderBy: reihenfolge,
      distinct: ["volkId"],
      select: { volkId: true, volksstaerke: true },
    }),
    prisma.stockkartenEintrag.findMany({
      where: { volk: { bienenstandId }, bebrueteteWaben: { gt: 0 } },
      orderBy: reihenfolge,
      distinct: ["volkId"],
      select: { volkId: true, bebrueteteWaben: true },
    }),
  ]);
  const ergebnis = new Map<string, LetzteWabenzahlen>();
  const eintragFuer = (volkId: string) => {
    const vorhanden = ergebnis.get(volkId) ?? { volksstaerke: null, bebrueteteWaben: null };
    ergebnis.set(volkId, vorhanden);
    return vorhanden;
  };
  for (const eintrag of besetzt) eintragFuer(eintrag.volkId).volksstaerke = eintrag.volksstaerke;
  for (const eintrag of bebruetet) eintragFuer(eintrag.volkId).bebrueteteWaben = eintrag.bebrueteteWaben;
  return ergebnis;
}

// Anzeige an den Bewertungs-Reglern einer neuen Durchsicht: je Volk und
// Kriterium die letzte gesetzte Wertung samt Datum. Wie bei den Wabenzahlen
// je Feld getrennt gesucht - wer beim letzten Mal nur die Sanftmut bewertet
// hat, sieht bei der Volksstärke trotzdem den Wert davor. Nur zum Ansehen:
// in den Regler übernommen wird nichts.
export async function letzteBewertungenLaden(bienenstandId: string): Promise<Map<string, LetzteBewertungen>> {
  const reihenfolge = [{ datum: "desc" as const }, { createdAt: "desc" as const }];
  const jeKriterium = await Promise.all(
    BEURTEILUNGS_KRITERIEN.map(async ({ feld }) => {
      // Feldname kommt aus der Liste - Prisma kann den Typ dann nicht mehr
      // ablesen, darum die Note unten selbst herausziehen.
      const eintraege = (await prisma.stockkartenEintrag.findMany({
        where: { volk: { bienenstandId }, [feld]: { not: null } },
        orderBy: reihenfolge,
        distinct: ["volkId"],
        select: { volkId: true, datum: true, [feld]: true },
      })) as unknown as Array<{ volkId: string; datum: Date } & Partial<Record<BeurteilungsFeld, number | null>>>;
      return { feld, eintraege };
    })
  );
  const ergebnis = new Map<string, LetzteBewertungen>();
  for (const { feld, eintraege } of jeKriterium) {
    for (const eintrag of eintraege) {
      const note = eintrag[feld];
      if (note == null) continue;
      const vorhanden = ergebnis.get(eintrag.volkId) ?? {};
      vorhanden[feld] = { note, datum: eintrag.datum };
      ergebnis.set(eintrag.volkId, vorhanden);
    }
  }
  return ergebnis;
}
