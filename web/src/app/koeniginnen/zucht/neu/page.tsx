import { Card } from "@/components/ui";
import { zuchtserieAnlegen } from "@/lib/actions";
import { ZuchtserieFormular } from "@/components/zuchtserie-formular";
import { bezeichnungVorschlagen, zuchtAuswahlenLaden } from "@/lib/zucht-daten";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

export default async function ZuchtserieAnlegenPage({
  searchParams,
}: {
  searchParams: Promise<{ koenigin?: string; volk?: string }>;
}) {
  await bereichPflicht("koeniginnen");
  const { koenigin, volk } = await searchParams;
  const [auswahlen, bezeichnung] = await Promise.all([
    zuchtAuswahlenLaden(),
    bezeichnungVorschlagen(new Date().getFullYear()),
  ]);
  // Vorauswahl per Link: direkt die Königin oder das Volk, in dem sie sitzt.
  const vorauswahl = auswahlen.kandidaten.find(
    (kandidat) => kandidat.koeniginId === koenigin || (volk && kandidat.volkId === volk)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation pfad={[{ href: "/koeniginnen/zucht", label: "Zuchtplanung" }]} className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Neue Zuchtserie</h1>
      </div>

      <Card>
        <ZuchtserieFormular
          action={zuchtserieAnlegen}
          auswahlen={auswahlen}
          abbrechenHref="/koeniginnen/zucht"
          werte={{
            bezeichnung,
            mutterKoeniginId: vorauswahl?.koeniginId ?? "",
            pflegeart: "UNBEKANNT",
            pflegeVolkId: "",
            brutschrank: false,
            umlarvDatum: "",
            begattungsart: "UNBEKANNT",
            belegstelleId: "",
            begattungsStandId: "",
            notizen: "",
          }}
        />
      </Card>
    </div>
  );
}
