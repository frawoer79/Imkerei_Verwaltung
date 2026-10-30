// Gruppierung für die Maßnahmen-Übersicht. Eine Maßnahme, die in einem Rutsch
// für mehrere Völker oder ganze Stände angelegt wurde, steht dort als eine
// Zeile; die Völker klappen darunter auf. Zuchtschritte bündeln wie bisher je
// Serie, die Schritte eines biotechnischen Verfahrens je Verfahren. Erkannt wird die Sammelmaßnahme ohne eigene Spalte: gleicher Text,
// gleicher Termin und praktisch dieselbe Anlegezeit - das gilt damit auch
// rückwirkend für alle bisherigen Sammelmaßnahmen.

/** Abstand der Anlegezeiten, bis zu dem Maßnahmen als ein Rutsch gelten. */
const GLEICHZEITIG_MS = 10_000;

export type GruppierbareMassnahme = {
  text: string;
  faelligAm: Date | null;
  createdAt: Date;
  zuchtserie: { id: string; bezeichnung: string } | null;
  bioVerfahren?: { id: string; titel: string } | null;
};

export type MassnahmenEintrag<T extends GruppierbareMassnahme> =
  | { art: "einzeln"; massnahme: T }
  | { art: "zucht"; serie: { id: string; bezeichnung: string }; massnahmen: T[] }
  | { art: "verfahren"; verfahren: { id: string; titel: string }; massnahmen: T[] }
  | { art: "sammel"; schluessel: string; massnahmen: T[] };

/// Die Gruppe steht dort, wo ihr erstes Mitglied in der (nach Fälligkeit
/// sortierten) Liste stünde.
export function massnahmenGruppieren<T extends GruppierbareMassnahme>(massnahmen: T[]): MassnahmenEintrag<T>[] {
  const eintraege: (MassnahmenEintrag<T> | { art: "sammel-roh"; schluessel: string; massnahmen: T[] })[] = [];
  const zucht = new Map<string, Extract<MassnahmenEintrag<T>, { art: "zucht" }>>();
  const verfahren = new Map<string, Extract<MassnahmenEintrag<T>, { art: "verfahren" }>>();
  const sammel = new Map<string, { art: "sammel-roh"; schluessel: string; massnahmen: T[] }[]>();

  for (const massnahme of massnahmen) {
    if (massnahme.zuchtserie) {
      let gruppe = zucht.get(massnahme.zuchtserie.id);
      if (!gruppe) {
        gruppe = { art: "zucht", serie: massnahme.zuchtserie, massnahmen: [] };
        zucht.set(massnahme.zuchtserie.id, gruppe);
        eintraege.push(gruppe);
      }
      gruppe.massnahmen.push(massnahme);
      continue;
    }

    if (massnahme.bioVerfahren) {
      let gruppe = verfahren.get(massnahme.bioVerfahren.id);
      if (!gruppe) {
        gruppe = { art: "verfahren", verfahren: massnahme.bioVerfahren, massnahmen: [] };
        verfahren.set(massnahme.bioVerfahren.id, gruppe);
        eintraege.push(gruppe);
      }
      gruppe.massnahmen.push(massnahme);
      continue;
    }

    const schluessel = `${massnahme.text}|${massnahme.faelligAm?.getTime() ?? ""}`;
    const kandidaten = sammel.get(schluessel) ?? [];
    let gruppe = kandidaten.find(
      (kandidat) =>
        Math.abs(kandidat.massnahmen[0]!.createdAt.getTime() - massnahme.createdAt.getTime()) <= GLEICHZEITIG_MS
    );
    if (!gruppe) {
      gruppe = {
        art: "sammel-roh",
        schluessel: `${schluessel}|${massnahme.createdAt.getTime()}`,
        massnahmen: [],
      };
      kandidaten.push(gruppe);
      sammel.set(schluessel, kandidaten);
      eintraege.push(gruppe);
    }
    gruppe.massnahmen.push(massnahme);
  }

  // Eine "Gruppe" mit nur einer Maßnahme bleibt eine ganz normale Zeile.
  return eintraege.map((eintrag) =>
    eintrag.art !== "sammel-roh"
      ? eintrag
      : eintrag.massnahmen.length === 1
        ? { art: "einzeln", massnahme: eintrag.massnahmen[0]! }
        : { art: "sammel", schluessel: eintrag.schluessel, massnahmen: eintrag.massnahmen }
  );
}

/// Gehört die Maßnahme zum selben Rutsch wie die Gruppe? Für die Zahl der
/// schon erledigten Völker einer offenen Sammelmaßnahme ("3/9 erledigt").
export function gleicherRutsch(a: GruppierbareMassnahme, b: GruppierbareMassnahme): boolean {
  return (
    !a.zuchtserie &&
    !b.zuchtserie &&
    !a.bioVerfahren &&
    !b.bioVerfahren &&
    a.text === b.text &&
    (a.faelligAm?.getTime() ?? null) === (b.faelligAm?.getTime() ?? null) &&
    Math.abs(a.createdAt.getTime() - b.createdAt.getTime()) <= GLEICHZEITIG_MS
  );
}
