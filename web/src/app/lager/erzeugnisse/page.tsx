import { erzeugnisBestandUebersicht, lagerorteListe, warenwertAn } from "@/lib/lager";
import {
  erzeugnisEinlagern,
  erzeugnisAuslagern,
  erzeugnisAbfuellen,
  erzeugnisBuchungLoeschen,
  erzeugnistypAnlegen,
  erzeugnistypUmbenennen,
  erzeugnistypLoeschen,
  lagerlisteErstellen,
  eimerNachwiegen,
} from "@/lib/actions";
import { Card } from "@/components/ui";
import { ErzeugnisUebersicht } from "@/components/erzeugnis-uebersicht";
import { LagerlisteExport } from "@/components/lagerliste-export";
import { LagerlistenKarte } from "@/components/lagerlisten-karte";
import { LagerUmschalter } from "@/components/lager-umschalter";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

// Lager, Teil Erzeugnisse: Honig, Wachs und Co. aus einem Zu-/Abgangsverlauf.
export default async function LagerErzeugnissePage() {
  await bereichPflicht("lager");

  const [erzeugnisse, lagerorte, warenwert] = await Promise.all([
    erzeugnisBestandUebersicht(),
    lagerorteListe(),
    warenwertAn(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SeitenNavigation hauptseite className="-mb-3" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Erzeugnisse</h1>
        <p className="text-sm text-muted">Honig, Wachs und Co., die du vorrätig hast.</p>
      </div>
      <LagerUmschalter aktiv="erzeugnisse" />

      <Card>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 className="text-lg font-semibold">Bestand</h2>
          <LagerlisteExport art="ERZEUGNISSE" erstellen={lagerlisteErstellen} />
        </div>
        <p className="mb-4 text-sm text-muted">
          Einlagern über den Knopf, Auslagern oder Abfüllen direkt am jeweiligen Posten.
        </p>
        <ErzeugnisUebersicht
          erzeugnisse={erzeugnisse}
          lagerorte={lagerorte}
          einlagern={erzeugnisEinlagern}
          auslagern={erzeugnisAuslagern}
          abfuellen={erzeugnisAbfuellen}
          buchungLoeschen={erzeugnisBuchungLoeschen}
          erzeugnisAnlegen={erzeugnistypAnlegen}
          erzeugnisUmbenennen={erzeugnistypUmbenennen}
          erzeugnisLoeschen={erzeugnistypLoeschen}
          nachwiegen={eimerNachwiegen}
          warenwert={warenwert}
        />
      </Card>

      <LagerlistenKarte art="ERZEUGNISSE" />
    </div>
  );
}
