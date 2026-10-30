import { prisma } from "@/lib/prisma";
import { natuerlich } from "@/lib/sortierung";

// Sammelt alles, was in einem Behandlungsnachweis steht. Bewusst an einer
// Stelle, damit die Bildschirm-Vorschau und die erzeugte PDF-Datei garantiert
// denselben Inhalt zeigen.

export type NachweisAuswahl = {
  jahr: number;
  standId?: string | null;
  volkId?: string | null;
};

export type NachweisDaten = Awaited<ReturnType<typeof nachweisDatenLaden>>;

export async function nachweisDatenLaden({ jahr, standId, volkId }: NachweisAuswahl) {
  const vonDatum = new Date(jahr, 0, 1);
  const bisDatum = new Date(jahr + 1, 0, 1);

  const [betrieb, voelkerImUmfang] = await Promise.all([
    prisma.betrieb.findUnique({ where: { id: "standard" } }),
    prisma.volk.findMany({
      where: volkId ? { id: volkId } : standId ? { bienenstandId: standId } : {},
      orderBy: [{ bienenstand: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        rasse: true,
        archiviert: true,
        bienenstand: { select: { id: true, name: true, strasse: true, ort: true } },
      },
    }),
  ]);

  // Datenbank sortiert nur nach Text ("Volk 10" vor "Volk 2") - hier natürlich.
  voelkerImUmfang.sort(
    (a, b) => natuerlich(a.bienenstand.name, b.bienenstand.name) || natuerlich(a.name, b.name)
  );

  const volkIds = voelkerImUmfang.map((volk) => volk.id);

  const behandlungen = await prisma.behandlung.findMany({
    where: {
      datum: { gte: vonDatum, lt: bisDatum },
      voelker: { some: { volkId: { in: volkIds } } },
    },
    orderBy: [{ datum: "asc" }, { createdAt: "asc" }],
    include: { medikament: true, voelker: true },
  });

  // Im Nachweis stehen alle noch aktiven Völker des gewählten Umfangs, dazu
  // alle, die in diesem Jahr behandelt wurden (auch bereits aufgelöste).
  const behandelteVolkIds = new Set(
    behandlungen.flatMap((behandlung) => behandlung.voelker.map((eintrag) => eintrag.volkId))
  );
  const voelker = voelkerImUmfang.filter(
    (volk) => !volk.archiviert || behandelteVolkIds.has(volk.id)
  );

  // Namen nicht mit "Volk"/"Bienenstand" garnieren - die tragen das Wort in
  // der Praxis meist schon selbst ("Bienenstand Waldrand").
  const bezeichnung = volkId
    ? `${voelker[0]?.name ?? "Volk"} · ${voelker[0]?.bienenstand.name ?? ""}`
    : standId
      ? (voelker[0]?.bienenstand.name ?? "Bienenstand")
      : "Alle Bienenstände";

  const staende = Array.from(
    new Map(voelker.map((volk) => [volk.bienenstand.id, volk.bienenstand])).values()
  );

  // Wie viel von welchem Mittel insgesamt eingesetzt wurde (stornierte
  // Behandlungen zählen nicht mit).
  const verbrauch = new Map<string, { name: string; einheit: string; menge: number }>();
  for (const behandlung of behandlungen) {
    if (behandlung.storniertAm) continue;
    const betroffene = behandlung.voelker.filter((eintrag) =>
      volkIds.includes(eintrag.volkId)
    ).length;
    const bisher = verbrauch.get(behandlung.medikamentId);
    const menge = behandlung.mengeJeVolk * betroffene;
    if (bisher) {
      bisher.menge += menge;
    } else {
      verbrauch.set(behandlung.medikamentId, {
        name: behandlung.medikament.name,
        einheit: behandlung.medikament.einheit,
        menge,
      });
    }
  }

  return {
    jahr,
    betrieb,
    voelker,
    volkIds,
    behandlungen,
    bezeichnung,
    staende,
    verbrauch: Array.from(verbrauch.values()),
    /** true, wenn der Nachweis mehrere Stände umfasst - dann wird der Stand je Volk mitgeschrieben. */
    mehrereStaende: !standId && !volkId,
  };
}
