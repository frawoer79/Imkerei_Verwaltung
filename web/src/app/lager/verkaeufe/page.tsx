import { verkaeufeLaden } from "@/lib/verkaeufe-daten";
import { erzeugnisVerkaufAendern, verkaufAendern, verkaufAnlegen, verkaufLoeschen } from "@/lib/actions";
import { Card } from "@/components/ui";
import { LagerUmschalter } from "@/components/lager-umschalter";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { VerkaufsListe } from "@/components/verkaufs-liste";
import { bereichPflicht } from "@/lib/bereiche";

// Lager, Teil Verkäufe: alles, was verkauft wurde, mit Erlös. Erzeugnisse
// aus dem Lager (Abgang mit Grund "Verkauf") und Völker, Ableger, Königinnen.
export default async function LagerVerkaeufePage() {
  await bereichPflicht("lager");
  const zeilen = await verkaeufeLaden();

  return (
    <div className="flex flex-col gap-6">
      <SeitenNavigation hauptseite className="-mb-3" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verkäufe</h1>
        <p className="text-sm text-muted">Was du verkauft hast und was es eingebracht hat.</p>
      </div>
      <LagerUmschalter aktiv="verkaeufe" />

      <Card>
        <VerkaufsListe
          zeilen={zeilen}
          anlegen={verkaufAnlegen}
          aendern={verkaufAendern}
          lagerAendern={erzeugnisVerkaufAendern}
          loeschen={verkaufLoeschen}
        />
      </Card>
    </div>
  );
}
