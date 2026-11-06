import { prisma } from "@/lib/prisma";
import { WABEN_AENDERUNGS_ARTEN, aenderungSumme, startSumme } from "@/lib/waben";

// Wabenbestand eines Volkes: wie viele Waben gerade im Brutraum hängen.
//
// Grundlage ist der Ist-Stand, der beim Anlegen des Volkes (oder später beim
// Bearbeiten) je Art erfasst wurde (Volk.wabenBrut ... wabenStandAm). Darauf
// werden alle Durchsichten nach diesem Zeitpunkt gerechnet: positive Werte
// sind gegebene, negative entnommene Waben. Fortgeschrieben wird nur die
// Gesamtzahl - welche Art eine Wabe hat, ändert sich im Volk von selbst
// (Mittelwand wird ausgebaut, Brut schlüpft), die Anzahl nur durch dich.

const AENDERUNG_SELECT = {
  volkId: true,
  datum: true,
  brutwaben: true,
  futterwaben: true,
  leerwaben: true,
  mittelwaende: true,
  baurahmenDrohnenrahmen: true,
} as const;

/// Bestand je Volk (null = noch nicht erfasst). `ohneEintragId` lässt einen
/// Eintrag außen vor - beim Bearbeiten zählt der eigene alte Wert nicht mit.
export async function wabenbestaendeLaden(
  volkIds: string[],
  ohneEintragId?: string
): Promise<Map<string, number | null>> {
  const ergebnis = new Map<string, number | null>();
  if (volkIds.length === 0) return ergebnis;
  const voelker = await prisma.volk.findMany({
    where: { id: { in: volkIds } },
    select: {
      id: true,
      wabenBrut: true,
      wabenFutter: true,
      wabenLeer: true,
      wabenMittelwaende: true,
      wabenStandAm: true,
    },
  });
  const erfasst = voelker.filter((volk) => volk.wabenStandAm !== null);
  for (const volk of voelker) ergebnis.set(volk.id, null);
  if (erfasst.length === 0) return ergebnis;

  const fruehester = new Date(Math.min(...erfasst.map((volk) => volk.wabenStandAm!.getTime())));
  const eintraege = await prisma.stockkartenEintrag.findMany({
    where: {
      volkId: { in: erfasst.map((volk) => volk.id) },
      datum: { gt: fruehester },
      ...(ohneEintragId ? { id: { not: ohneEintragId } } : {}),
    },
    select: AENDERUNG_SELECT,
  });
  for (const volk of erfasst) {
    const aenderungen = eintraege
      .filter((eintrag) => eintrag.volkId === volk.id && eintrag.datum > volk.wabenStandAm!)
      .reduce((summe, eintrag) => summe + aenderungSumme(eintrag), 0);
    ergebnis.set(volk.id, startSumme(volk) + aenderungen);
  }
  return ergebnis;
}

export async function wabenbestandLaden(volkId: string, ohneEintragId?: string): Promise<number | null> {
  return (await wabenbestaendeLaden([volkId], ohneEintragId)).get(volkId) ?? null;
}

/// Hat sich seit dem Erfassen etwas getan? Dann passt die Aufteilung je Art
/// nicht mehr zum Bestand und wird beim Korrigieren nicht vorbelegt.
export async function wabenSeitErfassungGeaendert(volkId: string, standAm: Date): Promise<boolean> {
  const eintraege = await prisma.stockkartenEintrag.findMany({
    where: { volkId, datum: { gt: standAm } },
    select: AENDERUNG_SELECT,
  });
  return eintraege.some((eintrag) => WABEN_AENDERUNGS_ARTEN.some((art) => (eintrag[art.feld] ?? 0) !== 0));
}
