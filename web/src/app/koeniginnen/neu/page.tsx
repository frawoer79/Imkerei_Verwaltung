import { Card } from "@/components/ui";
import { koeniginAnlegen, kennungVorschlagen } from "@/lib/actions";
import { KoeniginFormular } from "@/components/koenigin-formular";
import { auswahlenLaden } from "@/lib/koeniginnen-daten";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

export default async function KoeniginAnlegenPage({
  searchParams,
}: {
  searchParams: Promise<{ volk?: string }>;
}) {
  await bereichPflicht("koeniginnen");
  const { volk } = await searchParams;
  const jahr = new Date().getFullYear();
  const [auswahlen, kennung] = await Promise.all([auswahlenLaden(), kennungVorschlagen(jahr)]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Neue Königin</h1>
      </div>

      <Card>
        <KoeniginFormular
          action={koeniginAnlegen}
          auswahlen={auswahlen}
          volkVorauswahl={volk ?? ""}
          abbrechenHref={volk ? `/voelker/${volk}` : "/koeniginnen"}
          werte={{
            kennung: "",
            kennungVorschlag: kennung,
            zuchtbuchnummer: "",
            rasse: "",
            jahrgang: String(jahr),
            schlupfDatum: "",
            zeichenFarbe: "",
            zeichenNummer: "",
            herkunft: "EIGENE_NACHZUCHT",
            herkunftText: "",
            herkunftsVolkId: "",
            begattungsart: "UNBEKANNT",
            belegstelleId: "",
            begattungsStandId: "",
            begattungVon: "",
            begattungBis: "",
            vaterlinie: "",
            mutterKoeniginId: "",
            notizen: "",
            status: "RESERVE",
          }}
        />
      </Card>
    </div>
  );
}
