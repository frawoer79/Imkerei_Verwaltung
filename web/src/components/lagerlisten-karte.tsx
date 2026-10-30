import { prisma } from "@/lib/prisma";
import { buchungslisteErstellen, lagerlisteLoeschen } from "@/lib/actions";
import { BuchungslisteExport } from "@/components/buchungsliste-export";
import { Button, Card } from "@/components/ui";
import { LoeschenButton } from "@/components/loeschen-button";
import { IconDokument } from "@/components/icons";
import { datumAnzeige } from "@/lib/behandlung";
import { dateigroesseAnzeige } from "@/lib/dokumente-typen";
import { LAGERLISTE_TITEL, type LagerlisteArtWert } from "@/lib/lagerliste";

// Erstellte Lagerlisten (PDF) einer Art, unten auf der Material- bzw.
// Erzeugnisse-Seite des Lagers. Bei Erzeugnissen auch die Buchungslisten
// (Zu- und Abgänge in einem Zeitraum) samt Knopf zum Erstellen.
export async function LagerlistenKarte({ art }: { art: Exclude<LagerlisteArtWert, "BUCHUNGEN"> }) {
  const mitBuchungen = art === "ERZEUGNISSE";
  const [lagerlisten, erzeugnisse] = await Promise.all([
    prisma.lagerlisteDatei.findMany({
      where: { art: { in: mitBuchungen ? [art, "BUCHUNGEN"] : [art] } },
      orderBy: { erstelltAm: "desc" },
    }),
    mitBuchungen
      ? prisma.erzeugnistyp.findMany({ orderBy: [{ reihenfolge: "asc" }, { name: "asc" }], select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  return (
    <div id="lagerlisten" className="scroll-mt-6">
      <Card>
        <h2 className="mb-1 text-lg font-semibold">
          Lagerlisten als PDF
          {lagerlisten.length > 0 && <span className="text-muted"> ({lagerlisten.length})</span>}
        </h2>
        <p className="mb-3 text-sm text-muted">
          Gesamtbestand, wo was lagert und was gerade im Einsatz ist, jeweils mit dem Stand vom
          Erstelltag. Erstellen über &bdquo;PDF erstellen&ldquo; oben. Die Listen liegen auch
          unter Dokumente.
          {mitBuchungen && " Alle Zu- und Abgänge eines Zeitraums gibt es über „Buchungen als PDF“."}
        </p>
        {mitBuchungen && (
          <div id="buchungen-pdf" className="mb-3 scroll-mt-6">
            <BuchungslisteExport erzeugnisse={erzeugnisse} erstellen={buchungslisteErstellen} />
          </div>
        )}

        {lagerlisten.length > 0 && (
          <div className="border-t border-border pt-2">
            <ul className="flex flex-col">
              {lagerlisten.map((lagerliste) => (
                <li
                  key={lagerliste.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <a
                      href={`/lagerlisten/${lagerliste.dateiname}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                    >
                      <IconDokument className="h-4 w-4 shrink-0" /> {LAGERLISTE_TITEL[lagerliste.art]}
                    </a>
                    <p className="text-xs text-muted">
                      {lagerliste.art === "BUCHUNGEN" ? (
                        <>
                          {lagerliste.zeitraum ? `${lagerliste.zeitraum} · ` : ""}
                          {lagerliste.anzahlPositionen} {lagerliste.anzahlPositionen === 1 ? "Buchung" : "Buchungen"}
                        </>
                      ) : (
                        <>
                          {lagerliste.anzahlPositionen} {lagerliste.anzahlPositionen === 1 ? "Position" : "Positionen"}
                        </>
                      )}{" "}
                      ·{" "}
                      {dateigroesseAnzeige(lagerliste.groesse)} · erstellt {datumAnzeige(lagerliste.erstelltAm)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a href={`/lagerlisten/${lagerliste.dateiname}?download=1`} download>
                      <Button type="button" variant="secondary">
                        Herunterladen
                      </Button>
                    </a>
                    <LoeschenButton
                      action={lagerlisteLoeschen.bind(null, lagerliste.id)}
                      bestaetigung="Diese Lagerliste wirklich löschen?"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
