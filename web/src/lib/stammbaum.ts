import { prisma } from "@/lib/prisma";
import { belegjahr } from "@/lib/koeniginnen";

// Stammbaum über die Mutter-Verknüpfung der Königinnen. Der Bestand ist klein
// (einige Dutzend bis wenige Hundert Königinnen), deshalb wird alles auf
// einmal geladen und im Speicher verknüpft statt rekursiv abgefragt.

export type StammbaumKoenigin = {
  id: string;
  kennung: string;
  jahrgang: number | null;
  zeichenFarbe: string | null;
  status: string;
  stern: boolean;
  mutterKoeniginId: string | null;
  volkName: string | null;
  /// Vaterseite in Kurzform für den Baum ("Vogelsberg 2025") und, falls
  /// bekannt, die Drohnenvölker ausgeschrieben. Null, wenn nichts bekannt ist.
  vater: { kurz: string; lang: string | null } | null;
};

export type Stammbaum = {
  nachId: Map<string, StammbaumKoenigin>;
  toechter: Map<string, StammbaumKoenigin[]>;
};

export async function stammbaumLaden(): Promise<Stammbaum> {
  const [koeniginnen, belegjahre] = await Promise.all([
    prisma.koenigin.findMany({
      orderBy: [{ jahrgang: "asc" }, { kennung: "asc" }],
      select: {
        id: true,
        kennung: true,
        jahrgang: true,
        zeichenFarbe: true,
        status: true,
        stern: true,
        mutterKoeniginId: true,
        begattungsart: true,
        begattungVon: true,
        vaterlinie: true,
        belegstelle: { select: { id: true, name: true } },
        volk: { select: { name: true } },
      },
    }),
    prisma.belegstelleJahr.findMany({ select: { belegstelleId: true, jahr: true, drohnenvoelker: true } }),
  ]);
  const drohnen = new Map(belegjahre.map((eintrag) => [`${eintrag.belegstelleId}:${eintrag.jahr}`, eintrag.drohnenvoelker]));

  const nachId = new Map<string, StammbaumKoenigin>();
  const toechter = new Map<string, StammbaumKoenigin[]>();
  for (const koenigin of koeniginnen) {
    const { begattungsart, vaterlinie, belegstelle, volk, ...rest } = koenigin;
    let vater: StammbaumKoenigin["vater"] = null;
    if (begattungsart === "BELEGSTELLE" && belegstelle) {
      const jahr = belegjahr(koenigin);
      vater = {
        kurz: jahr ? `${belegstelle.name} ${jahr}` : belegstelle.name,
        lang: vaterlinie ?? (jahr ? (drohnen.get(`${belegstelle.id}:${jahr}`) ?? null) : null),
      };
    } else if (begattungsart === "KUENSTLICHE_BESAMUNG") {
      vater = { kurz: vaterlinie ? `KB ${vaterlinie}` : "KB", lang: vaterlinie };
    }
    nachId.set(koenigin.id, { ...rest, volkName: volk?.name ?? null, vater });
  }
  for (const koenigin of nachId.values()) {
    if (!koenigin.mutterKoeniginId) continue;
    const liste = toechter.get(koenigin.mutterKoeniginId) ?? [];
    liste.push(koenigin);
    toechter.set(koenigin.mutterKoeniginId, liste);
  }
  return { nachId, toechter };
}

/// Mutter, Großmutter, ... - älteste zuerst. Bricht bei einem Kreis ab, den
/// es eigentlich nicht geben kann, der sich über das Bearbeiten-Formular aber
/// eintragen ließe.
export function vorfahren(baum: Stammbaum, koeniginId: string): StammbaumKoenigin[] {
  const kette: StammbaumKoenigin[] = [];
  const gesehen = new Set([koeniginId]);
  let mutterId = baum.nachId.get(koeniginId)?.mutterKoeniginId ?? null;
  while (mutterId && !gesehen.has(mutterId)) {
    const mutter = baum.nachId.get(mutterId);
    if (!mutter) break;
    kette.unshift(mutter);
    gesehen.add(mutterId);
    mutterId = mutter.mutterKoeniginId;
  }
  return kette;
}

/// Anzahl aller Nachkommen (Töchter, Enkelinnen, ...).
export function nachkommenAnzahl(baum: Stammbaum, koeniginId: string, gesehen = new Set<string>()): number {
  if (gesehen.has(koeniginId)) return 0;
  gesehen.add(koeniginId);
  return (baum.toechter.get(koeniginId) ?? []).reduce(
    (summe, tochter) => summe + 1 + nachkommenAnzahl(baum, tochter.id, gesehen),
    0
  );
}

/// Stammmütter: Königinnen ohne (erfasste) Mutter, die Nachkommen haben.
export function stammmuetter(baum: Stammbaum): StammbaumKoenigin[] {
  return [...baum.nachId.values()].filter(
    (koenigin) =>
      (!koenigin.mutterKoeniginId || !baum.nachId.has(koenigin.mutterKoeniginId)) &&
      baum.toechter.has(koenigin.id)
  );
}
