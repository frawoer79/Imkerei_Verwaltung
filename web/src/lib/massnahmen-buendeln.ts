// Die Arbeitsschritte einer Zuchtserie sind einzelne Maßnahmen, zählen in
// Übersichten aber wie eine: sonst stünde an Stand und Navigation schnell
// eine zweistellige Zahl, obwohl nur eine Serie läuft. Behalten wird je
// Serie der erste Eintrag - bei nach Fälligkeit sortierten Listen also der
// nächste Schritt.
//
// Schritte eines biotechnischen Verfahrens (TBE, Käfigen, ...) ebenso, nur
// dass alle Schritte mit demselben Termin wie der nächste bleiben: am Tag 25
// nach dem Käfigen gehören "Königin freilassen" und "Oxalsäure" zusammen.
export function massnahmenBuendeln<
  T extends { zuchtserieId: string | null; bioVerfahrenId?: string | null; faelligAm?: Date | null },
>(massnahmen: T[]): T[] {
  const gesehen = new Set<string>();
  const naechsterTermin = new Map<string, number | null>();
  return massnahmen.filter((massnahme) => {
    if (massnahme.bioVerfahrenId) {
      const termin = massnahme.faelligAm?.getTime() ?? null;
      if (!naechsterTermin.has(massnahme.bioVerfahrenId)) {
        naechsterTermin.set(massnahme.bioVerfahrenId, termin);
        return true;
      }
      return naechsterTermin.get(massnahme.bioVerfahrenId) === termin;
    }
    if (!massnahme.zuchtserieId) return true;
    if (gesehen.has(massnahme.zuchtserieId)) return false;
    gesehen.add(massnahme.zuchtserieId);
    return true;
  });
}
