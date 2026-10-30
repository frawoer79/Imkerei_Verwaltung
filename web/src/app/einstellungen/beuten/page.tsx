import { prisma } from "@/lib/prisma";
import {
  beutensystemAnlegen,
  beutensystemLoeschen,
  wabenmassLoeschen,
  wabenmassSpeichern,
  wabenmasseErgaenzen,
  zargeLoeschen,
  zargeSpeichern,
} from "@/lib/actions";
import { Card } from "@/components/ui";
import {
  BeutensystemKarte,
  NeuesBeutensystem,
  type BeutensystemAnzeige,
} from "@/components/beuten-verwaltung";
import { BEUTENSYSTEM_KATALOG, fehlendeKatalogMasse } from "@/lib/beutensysteme";
import { katalogMasseSicherstellen } from "@/lib/beuten";
import { SeitenNavigation } from "@/components/seiten-navigation";

// Stammdaten für Brut- und Honigraum. Der Aufbau folgt der Reihenfolge, in
// der man das im Kopf hat: erst das Beutensystem, dann der Brutraum, dann der
// Honigraum. Die genormten Rähmchenmaße dahinter stehen aufgeklappt darunter -
// die fasst man nach dem Anlegen selten wieder an.
export default async function BeutenPage() {
  await katalogMasseSicherstellen();

  const rohdaten = await prisma.beutensystem.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      notizen: true,
      wabenmasse: {
        orderBy: [{ hoeheMm: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          breiteMm: true,
          hoeheMm: true,
          eignung: true,
          honigProWabeKg: true,
          zargen: {
            orderBy: { wabenAnzahl: "asc" },
            select: {
              id: true,
              name: true,
              wabenAnzahl: true,
              honigProZargeKg: true,
              _count: { select: { brutraumVoelker: true } },
            },
          },
        },
      },
    },
  });

  const systeme: BeutensystemAnzeige[] = rohdaten.map((system) => ({
    id: system.id,
    name: system.name,
    beschreibung:
      system.notizen ??
      BEUTENSYSTEM_KATALOG.find((eintrag) => eintrag.name === system.name)?.beschreibung ??
      null,
    wabenmasse: system.wabenmasse.map((mass) => ({
      id: mass.id,
      name: mass.name,
      breiteMm: mass.breiteMm,
      hoeheMm: mass.hoeheMm,
      eignung: mass.eignung,
      honigProWabeKg: mass.honigProWabeKg,
    })),
    zargen: system.wabenmasse.flatMap((mass) =>
      mass.zargen.map((zarge) => ({
        id: zarge.id,
        name: zarge.name,
        wabenmassId: mass.id,
        wabenmassName: mass.name,
        wabenAnzahl: zarge.wabenAnzahl,
        honigProZargeKg: zarge.honigProZargeKg,
      }))
    ),
    // Nach dem Selbstheilen oben normalerweise 0 - bleibt als Rückfallebene
    // für Systeme, deren Name der Katalog nicht kennt.
    fehlendeMasse: fehlendeKatalogMasse(
      system.name,
      system.wabenmasse.map((mass) => mass.name)
    ).length,
    anzahlVoelker: system.wabenmasse.reduce(
      (summe, mass) =>
        summe + mass.zargen.reduce((teil, zarge) => teil + zarge._count.brutraumVoelker, 0),
      0
    ),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Beutensysteme</h1>
        <p className="text-sm text-muted">
          Womit du imkerst. Je System legst du die Zargengrößen fest. Dieselbe Zarge wählst du
          dann beim Volk als Brutraum oder setzt sie in der Stockkarte als Honigraum auf.
        </p>
      </div>

      {systeme.length === 0 ? (
        <Card>
          <h2 className="mb-1 text-lg font-semibold">In zwei Schritten</h2>
          <ol className="mb-4 ml-4 list-decimal text-sm text-muted [&>li]:mb-1">
            <li>
              <b className="text-foreground">Beutensystem</b> wählen. Die genormten Rähmchenmaße
              kommen gleich mit.
            </li>
            <li>
              <b className="text-foreground">Zarge</b> festlegen: welches Maß, wie viele Waben.
              Die wählst du dann beim Volk als Brutraum aus (mit der Betriebsweise: ein- oder
              zweiräumig) oder setzt sie in der Stockkarte als Honigraum auf.
            </li>
          </ol>

          <NeuesBeutensystem
            action={beutensystemAnlegen}
            katalog={BEUTENSYSTEM_KATALOG.map((eintrag) => ({
              name: eintrag.name,
              beschreibung: eintrag.beschreibung,
            }))}
            vorhandeneNamen={[]}
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {systeme.map((system) => (
              <BeutensystemKarte
                key={system.id}
                system={system}
                beutensystemLoeschen={beutensystemLoeschen}
                wabenmassSpeichern={wabenmassSpeichern}
                wabenmassLoeschen={wabenmassLoeschen}
                wabenmasseErgaenzen={wabenmasseErgaenzen}
                zargeSpeichern={zargeSpeichern}
                zargeLoeschen={zargeLoeschen}
              />
            ))}
          </div>

          <Card>
            <NeuesBeutensystem
              action={beutensystemAnlegen}
              katalog={BEUTENSYSTEM_KATALOG.map((eintrag) => ({
                name: eintrag.name,
                beschreibung: eintrag.beschreibung,
              }))}
              vorhandeneNamen={systeme.map((system) => system.name)}
            />
            <p className="mt-3 text-xs text-muted">
              Löschen ist gefahrlos. Erfasste Ernten und aufgesetzte Honigräume behalten
              Bezeichnung und Gewicht als eigene Kopie. Nur die Zuordnung am Volk geht verloren.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
