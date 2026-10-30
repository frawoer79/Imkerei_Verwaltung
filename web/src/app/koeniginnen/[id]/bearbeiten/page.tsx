import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { koeniginAktualisieren, koeniginLoeschen } from "@/lib/actions";
import { KoeniginFormular } from "@/components/koenigin-formular";
import { alsDatumWert, auswahlenLaden } from "@/lib/koeniginnen-daten";
import type { Begattungsart, Herkunft, KoeniginStatus } from "@/lib/koeniginnen";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

export default async function KoeniginBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await bereichPflicht("koeniginnen");
  const { id } = await params;

  const koenigin = await prisma.koenigin.findUnique({ where: { id } });
  if (!koenigin) notFound();

  const auswahlen = await auswahlenLaden();
  // Sich selbst als eigene Mutter auszuwählen wäre ein Kreis - raus damit.
  auswahlen.muetter = auswahlen.muetter.filter((mutter) => mutter.id !== koenigin.id);

  const aktualisieren = koeniginAktualisieren.bind(null, koenigin.id);
  const loeschen = koeniginLoeschen.bind(null, koenigin.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation pfad={[{ href: `/koeniginnen/${koenigin.id}`, label: koenigin.kennung }]} className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Königin bearbeiten</h1>
      </div>

      <Card>
        <KoeniginFormular
          action={aktualisieren}
          auswahlen={auswahlen}
          mitStatus
          zuchtkarteUrl={
            koenigin.zuchtkarteFotoDateiname ? `/bilder/${koenigin.zuchtkarteFotoDateiname}` : null
          }
          zuchtkarteMimeType={koenigin.zuchtkarteFotoMimeType}
          abbrechenHref={`/koeniginnen/${koenigin.id}`}
          werte={{
            kennung: koenigin.kennung,
            kennungVorschlag: koenigin.kennung,
            zuchtbuchnummer: koenigin.zuchtbuchnummer ?? "",
            rasse: koenigin.rasse ?? "",
            jahrgang: koenigin.jahrgang ? String(koenigin.jahrgang) : "",
            schlupfDatum: alsDatumWert(koenigin.schlupfDatum),
            zeichenFarbe: koenigin.zeichenFarbe ?? "",
            zeichenNummer: koenigin.zeichenNummer ?? "",
            herkunft: koenigin.herkunft as Herkunft,
            herkunftText: koenigin.herkunftText ?? "",
            herkunftsVolkId: koenigin.herkunftsVolkId ?? "",
            begattungsart: koenigin.begattungsart as Begattungsart,
            belegstelleId: koenigin.belegstelleId ?? "",
            begattungsStandId: koenigin.begattungsStandId ?? "",
            begattungVon: alsDatumWert(koenigin.begattungVon),
            begattungBis: alsDatumWert(koenigin.begattungBis),
            vaterlinie: koenigin.vaterlinie ?? "",
            mutterKoeniginId: koenigin.mutterKoeniginId ?? "",
            notizen: koenigin.notizen ?? "",
            status: koenigin.status as KoeniginStatus,
          }}
        />
      </Card>

      <Card className="border-gefahr-rand">
        <h2 className="mb-2 text-lg font-semibold">Endgültig löschen</h2>
        <p className="mb-3 text-sm text-muted">
          Löscht die Königin samt Lebenslauf. Bei ihren Töchtern bleibt die Abstammung dann leer.
          Meist ist es besser, sie über ein Ereignis als verstorben oder verkauft zu führen.
        </p>
        <form action={loeschen}>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md border border-gefahr px-4 py-2 text-sm font-medium text-gefahr transition-colors hover:bg-gefahr-flaeche"
          >
            Königin löschen
          </button>
        </form>
      </Card>
    </div>
  );
}
