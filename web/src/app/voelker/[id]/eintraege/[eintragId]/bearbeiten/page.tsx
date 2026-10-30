import { abgeschalteteBereiche } from "@/lib/bereiche";
import { fuettererLiegtAuf } from "@/lib/fuetterer";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  bildLoeschen,
  neueBilderHinzufuegen,
  stockkartenEintragAktualisieren,
  stockkartenEintragLoeschen,
} from "@/lib/actions";
import { Card, Label, Input, Button, LinkKnopf } from "@/components/ui";
import { LoeschenButton } from "@/components/loeschen-button";
import { StockkartenEintragFelder } from "@/components/stockkarten-eintrag-felder";
import { EntsperrbaresFormular } from "@/components/entsperrbares-formular";
import { MassnahmenListe } from "@/components/massnahmen-liste";
import { StockkartenEintragFormular } from "@/components/stockkarten-eintrag-formular";
import { FormularFehler } from "@/components/sicheres-formular";
import { FotoAuswahl } from "@/components/foto-auswahl";
import { stockkartenBildName } from "@/lib/bild-name";
import { beutenStammdatenLaden } from "@/lib/beuten";
import Link from "next/link";

// Für <input type="datetime-local"> - lokale Zeit, keine Zeitzonen-Umrechnung
// wie bei toISOString() (die würde auf UTC springen).
function alsInputWert(datum: Date): string {
  const zweistellig = (zahl: number) => zahl.toString().padStart(2, "0");
  return `${datum.getFullYear()}-${zweistellig(datum.getMonth() + 1)}-${zweistellig(datum.getDate())}T${zweistellig(datum.getHours())}:${zweistellig(datum.getMinutes())}`;
}

export default async function StockkartenEintragBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string; eintragId: string }>;
}) {
  const { id, eintragId } = await params;
  const aus = await abgeschalteteBereiche();

  const eintrag = await prisma.stockkartenEintrag.findUnique({
    where: { id: eintragId },
    include: {
      volk: {
        include: {
          bienenstand: { select: { name: true } },
          koenigin: { select: { kennung: true } },
          brutraumZarge: {
            select: { wabenmass: { select: { beutensystem: { select: { id: true } } } } },
          },
          honigraumaufsaetze: { orderBy: { aufgesetztAm: "asc" } },
        },
      },
      bilder: true,
      massnahmen: { orderBy: { createdAt: "asc" } },
      honigernteAnteile: true,
      aufgesetzteHonigraeume: true,
      geernteteHonigraeume: { select: { id: true } },
    },
  });

  if (!eintrag || eintrag.volkId !== id) {
    notFound();
  }

  const beuten = await beutenStammdatenLaden();

  // Zur Auswahl stehen alle Honigräume, die noch oben sitzen - plus die, die
  // dieser Eintrag selbst geerntet hat (sonst wären sie beim Bearbeiten weg
  // und das Häkchen ließe sich nicht wieder setzen).
  const geernteteAufsatzIds = eintrag.geernteteHonigraeume.map((aufsatz) => aufsatz.id);
  const offeneAufsaetze = eintrag.volk.honigraumaufsaetze
    .filter(
      (aufsatz) =>
        (aufsatz.geerntetAm === null || geernteteAufsatzIds.includes(aufsatz.id)) &&
        // Was dieser Eintrag selbst aufgesetzt hat, steht oben im Formular -
        // nicht zusätzlich in der Ernte-Liste.
        aufsatz.aufgesetztEintragId !== eintrag.id
    )
    .map((aufsatz) => ({
      id: aufsatz.id,
      bezeichnung: aufsatz.bezeichnung,
      honigProZargeKg: aufsatz.honigProZargeKg,
      wabenbeschaffenheit: aufsatz.wabenbeschaffenheit,
      aufgesetztAm: aufsatz.aufgesetztAm,
    }));

  // Haken so, wie es nach diesem Eintrag war: seine eigene Aktion, sonst der
  // Stand davor.
  const fuettererAuf = eintrag.fuettererAktion
    ? eintrag.fuettererAktion === "AUFGESETZT"
    : await fuettererLiegtAuf(eintrag.volkId, eintrag.datum, eintrag);

  const aktualisieren = stockkartenEintragAktualisieren.bind(null, eintrag.id);
  const loeschen = stockkartenEintragLoeschen.bind(null, eintrag.id);

  // "Durchsicht schließen" führt zum Volk zurück, direkt an die Karte dieser
  // Durchsicht im Verlauf (statt der allgemeinen Zurück-Zeile).
  const zumVolk = `/voelker/${eintrag.volkId}#eintrag-${eintrag.id}`;
  const datumText = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(eintrag.datum);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <LinkKnopf href={zumVolk} variant="leise" groesse="mittel" className="-ml-3 mb-1 gap-1.5 font-semibold !text-accent">
          <span aria-hidden="true">✕</span> Durchsicht schließen
        </LinkKnopf>
        <h1 className="text-2xl font-semibold tracking-tight">Durchsicht vom {datumText}</h1>
        <p className="text-sm text-muted">
          <Link href={`/bienenstaende/${eintrag.volk.bienenstandId}`} className="hover:text-accent hover:underline">
            {eintrag.volk.bienenstand.name}
          </Link>
          {" › "}
          <Link href={`/voelker/${eintrag.volkId}`} className="hover:text-accent hover:underline">
            {eintrag.volk.name}
          </Link>
        </p>
      </div>

      <Card>
        <StockkartenEintragFormular
          action={aktualisieren}
          koeniginKennung={aus.includes("koeniginnen") ? null : (eintrag.volk.koenigin?.kennung ?? null)}
          className="flex flex-col gap-4"
        >
          <EntsperrbaresFormular>
            <div>
              <Label htmlFor="datum">Datum</Label>
              <Input
                id="datum"
                name="datum"
                type="datetime-local"
                defaultValue={alsInputWert(eintrag.datum)}
                required
              />
            </div>

            <StockkartenEintragFelder
              werte={{ ...eintrag, geernteteAufsatzIds }}
              honigraeume={beuten.honigraeume}
              wabenmasse={beuten.wabenmasse}
              offeneAufsaetze={offeneAufsaetze}
              eigenesSystemId={eintrag.volk.brutraumZarge?.wabenmass.beutensystem.id ?? null}
              behandlungenAn={!aus.includes("behandlungen")}
              fuettererAuf={fuettererAuf}
            />

            <FormularFehler />
            <div>
              <Button type="submit">Speichern</Button>
            </div>
          </EntsperrbaresFormular>
        </StockkartenEintragFormular>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Maßnahmen</h2>
        <MassnahmenListe volkId={id} stockkartenEintragId={eintrag.id} massnahmen={eintrag.massnahmen} heute={new Date()} />
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Fotos</h2>
        <FotoAuswahl
          bestehende={eintrag.bilder.map((bild, i) => ({
            id: bild.id,
            url: `/bilder/${bild.dateiname}`,
            alt: bild.beschreibung ?? bild.originalDateiname,
            speichername: stockkartenBildName(eintrag.volk.name, eintrag.datum, i + 1, bild.dateiname),
          }))}
          betrachterTitel={`${eintrag.volk.name}, ${new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(eintrag.datum)}`}
          aufBestehendesLoeschen={bildLoeschen}
          aufNeueDateien={neueBilderHinzufuegen.bind(null, eintrag.id)}
        />
      </Card>

      <Card className="border-gefahr-rand">
        <h2 className="mb-2 text-lg font-semibold">Eintrag löschen</h2>
        <p className="mb-3 text-sm text-muted">
          Löscht diesen Stockkarten-Eintrag mit allen zugehörigen Fotos unwiderruflich.
        </p>
        <LoeschenButton action={loeschen} bestaetigung="Diesen Eintrag wirklich unwiderruflich löschen?">
          Eintrag endgültig löschen
        </LoeschenButton>
      </Card>

      <LinkKnopf href={zumVolk} variant="secondary" className="w-full">
        Durchsicht schließen
      </LinkKnopf>
    </div>
  );
}
