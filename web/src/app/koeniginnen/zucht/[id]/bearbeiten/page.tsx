import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { zuchtserieAktualisieren, zuchtserieLoeschen } from "@/lib/actions";
import { ZuchtserieFormular } from "@/components/zuchtserie-formular";
import { LoeschenBestaetigen } from "@/components/loeschen-bestaetigen";
import { zuchtAuswahlenLaden } from "@/lib/zucht-daten";
import { alsDatumWert } from "@/lib/koeniginnen-daten";
import type { Begattungsart } from "@/lib/koeniginnen";
import { prisma } from "@/lib/prisma";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

export default async function ZuchtserieBearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  await bereichPflicht("koeniginnen");
  const { id } = await params;
  const serie = await prisma.zuchtserie.findUnique({ where: { id } });
  if (!serie) notFound();
  const auswahlen = await zuchtAuswahlenLaden(serie.mutterKoeniginId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation pfad={[
            { href: "/koeniginnen/zucht", label: "Zuchtplanung" },
            { href: `/koeniginnen/zucht/${serie.id}`, label: serie.bezeichnung },
          ]} className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Zuchtserie bearbeiten</h1>
      </div>

      <Card>
        <ZuchtserieFormular
          action={zuchtserieAktualisieren.bind(null, serie.id)}
          auswahlen={auswahlen}
          abbrechenHref={`/koeniginnen/zucht/${serie.id}`}
          werte={{
            bezeichnung: serie.bezeichnung,
            mutterKoeniginId: serie.mutterKoeniginId ?? "",
            pflegeart: serie.pflegeart,
            pflegeVolkId: serie.pflegeVolkId ?? "",
            brutschrank: serie.brutschrank,
            umlarvDatum: alsDatumWert(serie.umlarvDatum),
            begattungsart: serie.begattungsart as Begattungsart,
            belegstelleId: serie.belegstelleId ?? "",
            begattungsStandId: serie.begattungsStandId ?? "",
            notizen: serie.notizen ?? "",
          }}
        />
        <p className="mt-3 text-xs text-muted">
          Ein geänderter Umlarvtermin verschiebt alle noch offenen Schritte mit. Erledigte bleiben
          unverändert.
        </p>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Zuchtserie löschen</h2>
        <p className="mb-3 text-sm text-muted">
          Löscht die Serie und ihre Arbeitsschritte. Bereits angelegte Königinnen bleiben samt
          Mutter erhalten.
        </p>
        <LoeschenBestaetigen
          action={zuchtserieLoeschen.bind(null, serie.id)}
          knopfText="Serie löschen"
          frage={`Zuchtserie „${serie.bezeichnung}“ löschen?`}
          hinweis="Die Serie und ihre Arbeitsschritte verschwinden, auch aus Maßnahmen und Kalender. Bereits angelegte Königinnen bleiben samt Mutter erhalten."
        />
      </Card>
    </div>
  );
}
