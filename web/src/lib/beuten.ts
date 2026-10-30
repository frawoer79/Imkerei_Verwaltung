import { prisma } from "@/lib/prisma";
import { BEUTENSYSTEM_KATALOG, fehlendeKatalogMasse, katalogNameVon, passtZu } from "@/lib/beutensysteme";
import { runden, type WabenmassAuswahl, type ZargeAuswahl } from "@/lib/honig";

// Legt für frisch angelegte Rähmchenmaße die passende Zarge an (Wabenzahl
// und kg-Wert aus dem Katalog, falls bekannt, sonst 10 Waben als Vorschlag).
// Kennt der Katalog zu einem Maß mehrere Zargen (Miniplus: Standard- und
// Überwinterungszarge), entstehen alle.
// Wird überall dort aufgerufen, wo ein Wabenmass entsteht - beutensystem-
// Anlegen (Katalog-Kopie), wabenmasseErgaenzen und die Selbstheilung unten -
// damit jedes Maß genau einmal, bei seiner Geburt, eine Zarge bekommt.
// Bewusst KEIN nachträglicher Lauf über bestehende Maße ohne Zarge: eine
// gelöschte Zarge würde sonst beim nächsten Laden der Seite wieder auftauchen.
export async function zargenFuerNeueMasse(
  masse: { id: string; name: string; honigProWabeKg: number }[],
  systemName: string
): Promise<void> {
  const vorlage = BEUTENSYSTEM_KATALOG.find((eintrag) => eintrag.name === systemName);

  for (const mass of masse) {
    const katalogMass = vorlage?.wabenmasse.find(
      (eintrag) => eintrag.name === katalogNameVon(systemName, mass.name)
    );
    // Mehrere gebräuchliche Zargen zum selben Maß (Miniplus) kommen alle mit.
    const zargen = katalogMass?.zargen ?? [
      { name: mass.name, wabenAnzahl: katalogMass?.wabenAnzahl ?? 10 },
    ];

    await prisma.zarge.createManyAndReturn({
      data: zargen.map((zarge) => ({
        wabenmassId: mass.id,
        name: zarge.name,
        wabenAnzahl: zarge.wabenAnzahl,
        honigProZargeKg: runden(zarge.wabenAnzahl * mass.honigProWabeKg),
      })),
    });
  }
}

// Selbstheilung: ein System, das vor diesem Katalog angelegt wurde oder dem
// noch Maße fehlen, bekommt sie beim nächsten Laden automatisch ergänzt -
// kein Klick mehr nötig. Vorhandene Maße bleiben unberührt; älter/abweichend
// benannte werden über katalogNameVon() erkannt statt dupliziert. Für jedes
// so neu angelegte Maß gibt es sofort auch eine Zarge (zargenFuerNeueMasse).
export async function katalogMasseSicherstellen(): Promise<void> {
  const systeme = await prisma.beutensystem.findMany({
    select: {
      id: true,
      name: true,
      wabenmasse: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  for (const system of systeme) {
    const fehlendeMasse = fehlendeKatalogMasse(
      system.name,
      system.wabenmasse.map((mass) => mass.name)
    );
    if (fehlendeMasse.length === 0) continue;

    const neueMasse = await prisma.wabenmass.createManyAndReturn({
      data: fehlendeMasse.map((mass) => ({
        beutensystemId: system.id,
        name: mass.name,
        breiteMm: mass.breiteMm,
        hoeheMm: mass.hoeheMm,
        eignung: mass.eignung,
        honigProWabeKg: mass.honigProWabeKg,
      })),
      select: { id: true, name: true, honigProWabeKg: true },
    });

    await zargenFuerNeueMasse(neueMasse, system.name);
  }
}

/// Alles, was die Formulare an Stammdaten brauchen - flach und mit dem Namen
/// des Beutensystems davor. Dieselbe Zarge kann sowohl als Brutraum wie als
/// Honigraum auftauchen; `honigraeume`/`brutraeume` sind nur nach
/// Wabenmass.eignung gefilterte Sichten auf dieselbe Liste (passtZu()) - ein
/// reines Brutraum-Maß (z.B. "1.5") landet nicht bei den Honigräumen und
/// umgekehrt.
export type BeutenStammdaten = {
  /// Zargen für den Honigraum (Ernte, Aufsetzen).
  honigraeume: ZargeAuswahl[];
  /// Zargen für den Brutraum (Volk anlegen/bearbeiten).
  brutraeume: ZargeAuswahl[];
  /// Einzelne Waben (Teilernten).
  wabenmasse: WabenmassAuswahl[];
};

// Wird von den Stockkarten-Seiten und vom Volk-Formular genutzt, damit die
// Auswahl überall identisch aussieht.
export async function beutenStammdatenLaden(): Promise<BeutenStammdaten> {
  await katalogMasseSicherstellen();

  const systeme = await prisma.beutensystem.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      wabenmasse: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          eignung: true,
          honigProWabeKg: true,
          zargen: {
            orderBy: [{ wabenAnzahl: "asc" }],
            select: { id: true, name: true, wabenAnzahl: true, honigProZargeKg: true },
          },
        },
      },
    },
  });

  const alleZargen: ZargeAuswahl[] = systeme.flatMap((system) =>
    system.wabenmasse.flatMap((wabenmass) =>
      wabenmass.zargen.map((zarge) => ({
        id: zarge.id,
        name: zarge.name,
        systemName: system.name,
        systemId: system.id,
        wabenmassEignung: wabenmass.eignung,
        wabenAnzahl: zarge.wabenAnzahl,
        honigProZargeKg: zarge.honigProZargeKg,
      }))
    )
  );

  return {
    honigraeume: alleZargen.filter((zarge) => passtZu(zarge.wabenmassEignung, "HONIGRAUM")),
    brutraeume: alleZargen.filter((zarge) => passtZu(zarge.wabenmassEignung, "BRUTRAUM")),
    wabenmasse: systeme.flatMap((system) =>
      system.wabenmasse.map((wabenmass) => ({
        id: wabenmass.id,
        name: wabenmass.name,
        systemName: system.name,
        honigProWabeKg: wabenmass.honigProWabeKg,
      }))
    ),
  };
}
