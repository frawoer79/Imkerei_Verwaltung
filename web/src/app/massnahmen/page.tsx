import { abgeschalteteBereiche } from "@/lib/bereiche";
import { SICHTBARE_MASSNAHMEN } from "@/lib/massnahmen-sichtbar";
import { prisma } from "@/lib/prisma";
import { MassnahmenUebersicht } from "@/components/massnahmen-uebersicht";
import { MassnahmeNeuDialog } from "@/components/massnahme-neu-dialog";
import { MassnahmenMitKalender } from "@/components/massnahmen-kalender";
import { massnahmenGruppieren } from "@/lib/massnahmen-gruppen";
import { nachNamen } from "@/lib/sortierung";
import { verfahrenTitel } from "@/lib/bio-verfahren";
import { SeitenNavigation } from "@/components/seiten-navigation";

export default async function MassnahmenPage() {
  // Ohne Königinnen gibt es keine Zucht - deren Schritte bleiben dann ausgeblendet.
  const ohneZucht = (await abgeschalteteBereiche()).includes("koeniginnen");
  const [massnahmenRoh, bienenstaendeRoh] = await Promise.all([
    prisma.massnahme.findMany({
      where: { ...SICHTBARE_MASSNAHMEN, ...(ohneZucht ? { zuchtserieId: null } : {}) },
      include: {
        volk: { select: { id: true, name: true, bienenstand: { select: { name: true } } } },
        zuchtserie: { select: { id: true, bezeichnung: true } },
        bioVerfahren: { select: { id: true, art: true, bezeichnung: true } },
      },
      orderBy: [{ erledigt: "asc" }, { faelligAm: "asc" }, { createdAt: "desc" }],
    }),
    // Alle Stände mit ihren Völkern für die Volk-Auswahl - archivierte oder
    // gelöschte Stände bzw. Völker tauchen hier bewusst nicht auf.
    prisma.bienenstand.findMany({
      where: { archiviert: false },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        voelker: {
          where: { archiviert: false },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        },
      },
    }),
  ]);

  const massnahmen = massnahmenRoh.map((massnahme) => ({
    id: massnahme.id,
    text: massnahme.text,
    faelligAm: massnahme.faelligAm,
    erledigt: massnahme.erledigt,
    volkId: massnahme.volk.id,
    volkName: massnahme.volk.name,
    bienenstandName: massnahme.volk.bienenstand.name,
    imKalender: massnahme.imKalender,
    createdAt: massnahme.createdAt,
    zuchtserie: massnahme.zuchtserie,
    bioVerfahren: massnahme.bioVerfahren && {
      id: massnahme.bioVerfahren.id,
      titel: verfahrenTitel(massnahme.bioVerfahren.art, massnahme.bioVerfahren.bezeichnung),
    },
  }));

  const heute = new Date();
  const offene = massnahmen.filter((massnahme) => !massnahme.erledigt);
  const erledigte = massnahmen.filter((massnahme) => massnahme.erledigt);
  // Wie in der Liste: eine Zuchtserie, ein Verfahren oder eine Sammelmaßnahme
  // zählt als eine Zeile.
  const anzahl = (liste: typeof massnahmen) => massnahmenGruppieren(liste).length;

  // Die Datenbank sortiert nur nach Text ("Volk 10" vor "Volk 2") - hier natürlich.
  const staende = nachNamen(bienenstaendeRoh)
    .filter((bienenstand) => bienenstand.voelker.length > 0)
    .map((bienenstand) => ({
      id: bienenstand.id,
      name: bienenstand.name,
      voelker: nachNamen(bienenstand.voelker),
    }));

  return (
    <div className="flex flex-col gap-6">
      <SeitenNavigation className="-mb-3" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Maßnahmen</h1>
          <p className="text-sm text-muted">Offene und erledigte Maßnahmen aller Völker.</p>
        </div>
        {/* Neuer key nach dem Speichern: der Dialog schließt sich und startet leer. */}
        <MassnahmeNeuDialog key={massnahmenRoh.length} staende={staende} />
      </div>

      <MassnahmenMitKalender offene={offene} erledigte={erledigte} heute={heute} />

      {erledigte.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Erledigt ({anzahl(erledigte)})</h2>
          <MassnahmenUebersicht massnahmen={erledigte} heute={heute} />
        </div>
      )}
    </div>
  );
}
