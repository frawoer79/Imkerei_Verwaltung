import { prisma } from "@/lib/prisma";
import { zargenBestandsuebersicht, klimadeckelBestandsuebersicht, lagerorteListe } from "@/lib/lager";
import { katalogMasseSicherstellen } from "@/lib/beuten";
import {
  zargeBestandSpeichern,
  materialartikelAnlegen,
  materialartikelSpeichern,
  materialartikelLoeschen,
  lagerlisteErstellen,
} from "@/lib/actions";
import { Card } from "@/components/ui";
import { MaterialUebersicht } from "@/components/material-uebersicht";
import { LagerlisteExport } from "@/components/lagerliste-export";
import { LagerlistenKarte } from "@/components/lagerlisten-karte";
import { LagerUmschalter } from "@/components/lager-umschalter";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

// Lager, Teil Material: Zargen aus den Einstellungen, Klimadeckel und frei
// benanntes Zubehör. Lagerorte sind optional und mit den Erzeugnissen geteilt.
export default async function LagerMaterialPage() {
  await bereichPflicht("lager");
  await katalogMasseSicherstellen();

  const [zargen, klimadeckel, materialartikel, lagerorte] = await Promise.all([
    zargenBestandsuebersicht(),
    klimadeckelBestandsuebersicht(),
    prisma.materialartikel.findMany({
      where: { klimadeckel: false },
      orderBy: { name: "asc" },
      include: { lagerort: { select: { name: true } } },
    }),
    lagerorteListe(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SeitenNavigation hauptseite className="-mb-3" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Material</h1>
        <p className="text-sm text-muted">Zargen, Klimadeckel und Zubehör, das du vorrätig hast.</p>
      </div>
      <LagerUmschalter aktiv="material" />

      <Card>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 className="text-lg font-semibold">Bestand</h2>
          <LagerlisteExport art="MATERIAL" erstellen={lagerlisteErstellen} />
        </div>
        <p className="mb-4 text-sm text-muted">
          Zargen nutzen die Größen aus den Einstellungen. &bdquo;Im Einsatz&ldquo; und
          &bdquo;verfügbar&ldquo; errechnen sich aus aufgesetzten Honigräumen und belegten
          Brutraumzargen, bei Klimadeckeln aus den Völkern, die einen haben. Sonstiges Zubehör
          legst du mit eigenem Namen an.
        </p>
        <MaterialUebersicht
          zargen={zargen}
          klimadeckel={klimadeckel}
          materialartikel={materialartikel}
          lagerorte={lagerorte}
          zargeBestandSpeichern={zargeBestandSpeichern}
          materialartikelAnlegen={materialartikelAnlegen}
          materialartikelSpeichern={materialartikelSpeichern}
          materialartikelLoeschen={materialartikelLoeschen}
        />
      </Card>

      <LagerlistenKarte art="MATERIAL" />
    </div>
  );
}
