import { prisma } from "@/lib/prisma";
import { leistungLaden, schulnotenFarbe } from "@/lib/koenigin-leistung";
import type { ZuchtserieAuswahlen } from "@/components/zuchtserie-formular";

/// `mutterKoeniginId`: bisherige Mutter einer Serie, damit sie beim
/// Bearbeiten auswählbar bleibt, auch wenn sie in keinem Volk mehr sitzt.
export async function zuchtAuswahlenLaden(mutterKoeniginId?: string | null): Promise<ZuchtserieAuswahlen> {
  const [kandidaten, voelker, belegstellen, bienenstaende] = await Promise.all([
    zuchtmutterKandidatenLaden(mutterKoeniginId),
    prisma.volk.findMany({
      where: { archiviert: false },
      orderBy: [{ bienenstand: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        bienenstand: { select: { name: true } },
      },
    }),
    prisma.belegstelle.findMany({
      where: { archiviert: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.bienenstand.findMany({
      where: { archiviert: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    kandidaten,
    voelker: voelker.map((volk) => ({
      id: volk.id,
      name: volk.name,
      standName: volk.bienenstand.name,
    })),
    belegstellen,
    bienenstaende,
  };
}

/// "Serie 3/2026" - fortlaufend je Jahr.
export async function bezeichnungVorschlagen(jahr: number): Promise<string> {
  const anzahl = await prisma.zuchtserie.count({
    where: { createdAt: { gte: new Date(jahr, 0, 1), lt: new Date(jahr + 1, 0, 1) } },
  });
  return `Serie ${anzahl + 1}/${jahr}`;
}

export type Zuchtmutterkandidat = {
  /// Leer bei einer Königin, die nicht mehr in einem Volk sitzt (nur beim
  /// Bearbeiten einer älteren Serie möglich).
  volkId: string | null;
  volkName: string | null;
  standName: string | null;
  koeniginId: string;
  kennung: string;
  stern: boolean;
  jahrgang: number | null;
  zeichenFarbe: string | null;
  rasse: string | null;
  gesamtnote: number | null;
  /// Tailwind-Klassen fürs Notenschild (die Farbstufen liegen serverseitig).
  gesamtnoteFarbe: string | null;
  anzahlBewertungen: number;
  kriterien: { label: string; schulnote: number }[];
  honigSummeKg: number;
  anzahlToechter: number;
};

/// Alle Königinnen, die gerade in einem Volk sitzen, samt ihrer Bewertung aus
/// dem Lebenslauf - Entscheidungshilfe, von welcher Königin nachgezogen wird.
/// Beste Gesamtnote zuerst, unbewertete ans Ende. `zusaetzlicheKoeniginId`
/// holt die bisherige Mutter einer Serie dazu, auch wenn sie in keinem Volk
/// mehr sitzt.
export async function zuchtmutterKandidatenLaden(zusaetzlicheKoeniginId?: string | null): Promise<Zuchtmutterkandidat[]> {
  const voelker = await prisma.volk.findMany({
    where: { archiviert: false, koeniginId: { not: null } },
    select: {
      id: true,
      name: true,
      bienenstand: { select: { name: true } },
      koenigin: {
        select: {
          id: true,
          kennung: true,
          stern: true,
          jahrgang: true,
          zeichenFarbe: true,
          rasse: true,
          schlupfDatum: true,
          createdAt: true,
          volk: { select: { id: true } },
          ereignisse: { select: { art: true, datum: true, volkId: true } },
          _count: { select: { toechter: true } },
        },
      },
    },
  });

  type Eintrag = {
    volk: { id: string; name: string; standName: string } | null;
    koenigin: NonNullable<(typeof voelker)[number]["koenigin"]>;
  };
  const eintraege: Eintrag[] = voelker.map((volk) => ({
    volk: { id: volk.id, name: volk.name, standName: volk.bienenstand.name },
    koenigin: volk.koenigin!,
  }));
  if (zusaetzlicheKoeniginId && !eintraege.some((eintrag) => eintrag.koenigin.id === zusaetzlicheKoeniginId)) {
    const koenigin = await prisma.koenigin.findUnique({
      where: { id: zusaetzlicheKoeniginId },
      select: {
        id: true,
        kennung: true,
        stern: true,
        jahrgang: true,
        zeichenFarbe: true,
        rasse: true,
        schlupfDatum: true,
        createdAt: true,
        volk: { select: { id: true } },
        ereignisse: { select: { art: true, datum: true, volkId: true } },
        _count: { select: { toechter: true } },
      },
    });
    if (koenigin) eintraege.push({ volk: null, koenigin });
  }

  const kandidaten = await Promise.all(
    eintraege.map(async ({ volk, koenigin }) => {
      const leistung = await leistungLaden(koenigin);
      return {
        volkId: volk?.id ?? null,
        volkName: volk?.name ?? null,
        standName: volk?.standName ?? null,
        koeniginId: koenigin.id,
        kennung: koenigin.kennung,
        stern: koenigin.stern,
        jahrgang: koenigin.jahrgang,
        zeichenFarbe: koenigin.zeichenFarbe,
        rasse: koenigin.rasse,
        gesamtnote: leistung?.gesamtnote ?? null,
        gesamtnoteFarbe: leistung?.gesamtnote != null ? schulnotenFarbe(leistung.gesamtnote) : null,
        anzahlBewertungen: leistung?.anzahlBewertungen ?? 0,
        kriterien: (leistung?.kriterien ?? []).map((kriterium) => ({
          label: kriterium.label,
          schulnote: kriterium.schulnote,
        })),
        honigSummeKg: leistung?.honigSummeKg ?? 0,
        anzahlToechter: koenigin._count.toechter,
      };
    })
  );

  return kandidaten.sort((a, b) => {
    if (a.gesamtnote === null && b.gesamtnote === null) return a.kennung.localeCompare(b.kennung, "de");
    if (a.gesamtnote === null) return 1;
    if (b.gesamtnote === null) return -1;
    return a.gesamtnote - b.gesamtnote;
  });
}
