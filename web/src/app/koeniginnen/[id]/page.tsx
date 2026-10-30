import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, knopfKlassen } from "@/components/ui";
import {
  koeniginEreignisAktualisieren,
  koeniginEreignisHinzufuegen,
  koeniginEreignisLoeschen,
  koeniginFotoAktualisieren,
  koeniginFotoAusschnittAktualisieren,
  koeniginHonigertragBemerkungSpeichern,
  koeniginSternUmschalten,
  kriteriumAusschlussUmschalten,
  dokumentLoeschen,
} from "@/lib/actions";
import { DokumenteMiniListe } from "@/components/dokumente-mini-liste";
import { KoeniginEreignisFormular } from "@/components/koenigin-ereignis-formular";
import { KoeniginEreignisListe } from "@/components/koenigin-ereignis-liste";
import { KoeniginFoto } from "@/components/koenigin-foto";
import { KoeniginSternKnopf } from "@/components/koenigin-stern";
import { HonigertragBemerkung } from "@/components/honigertrag-bemerkung";
import { ZuchtkarteAnsicht } from "@/components/zuchtkarte-ansicht";
import { dateiVorhanden } from "@/lib/uploads";
import { inhaltBereinigen } from "@/lib/zuchtkarte-inhalt";
import { standAnzeige } from "@/lib/zuchtkarte-daten";
import { KoeniginLinie } from "@/components/stammbaum";
import { stammbaumLaden } from "@/lib/stammbaum";
import { auswahlenLaden } from "@/lib/koeniginnen-daten";
import { leistungLaden, schulnotenFarbe, stufenText } from "@/lib/koenigin-leistung";
import { KOENIGINS_BEURTEILUNGS_KRITERIEN, noteText, stufeText } from "@/components/stockkarten-eintrag-felder";
import {
  BEGATTUNGSART_LABEL,
  HERKUNFT_LABEL,
  STATUS_LABEL,
  anzeigeFarbe,
  belegjahr,
  kurzesDatum,
  type Begattungsart,
  type EreignisArt,
  type Herkunft,
  type KoeniginStatus,
} from "@/lib/koeniginnen";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

function Angabe({ bezeichnung, children }: { bezeichnung: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="flex gap-3 py-1.5">
      <span className="w-40 shrink-0 text-sm text-muted">{bezeichnung}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

// Vaterseite der Königin: bei Belegstellenbegattung die Drohnenvölker aus
// dem Belegjahr (Historie der Belegstelle), sonst die eigene Angabe.
function Vaterseite({
  begattungsart,
  belegstelle,
  belegjahr,
  drohnenvoelker,
  vaterlinie,
  standName,
}: {
  begattungsart: Begattungsart;
  belegstelle: { name: string } | null;
  belegjahr: number | null;
  drohnenvoelker: string | null;
  vaterlinie: string | null;
  standName: string | null;
}) {
  if (begattungsart === "BELEGSTELLE") {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <p>
          {belegstelle ? (
            <>
              Belegstelle{" "}
              <Link href="/einstellungen/belegstellen" className="text-accent hover:underline">
                {belegstelle.name}
              </Link>
            </>
          ) : (
            "Belegstelle nicht angegeben"
          )}
          {belegjahr !== null && <span className="text-muted"> · Belegjahr {belegjahr}</span>}
        </p>
        {drohnenvoelker && <p className="whitespace-pre-wrap">{drohnenvoelker}</p>}
        {belegstelle && !drohnenvoelker && (
          <p className="text-muted">
            {belegjahr === null
              ? "Ohne Jahrgang oder Begattungsdatum ist das Belegjahr unbekannt."
              : `Für ${belegjahr} sind bei der Belegstelle keine Drohnenvölker eingetragen.`}
          </p>
        )}
        {vaterlinie && vaterlinie !== drohnenvoelker && (
          <p>
            <span className="text-muted">Eigene Angabe: </span>
            {vaterlinie}
          </p>
        )}
      </div>
    );
  }
  if (begattungsart === "KUENSTLICHE_BESAMUNG") {
    return <p className="text-sm">{vaterlinie ?? <span className="text-muted">Künstlich besamt, Vaterlinie nicht angegeben.</span>}</p>;
  }
  if (begattungsart === "STANDBEGATTUNG") {
    return (
      <p className="text-sm text-muted">
        Standbegattet{standName ? ` auf ${standName}` : ""}. Die Drohnen sind nicht bekannt.
      </p>
    );
  }
  return <p className="text-sm text-muted">Nicht bekannt.</p>;
}

export default async function KoeniginPage({ params }: { params: Promise<{ id: string }> }) {
  await bereichPflicht("koeniginnen");
  const { id } = await params;

  const koenigin = await prisma.koenigin.findUnique({
    where: { id },
    include: {
      belegstelle: true,
      begattungsStand: { select: { id: true, name: true } },
      herkunftsVolk: { select: { id: true, name: true } },
      mutterKoenigin: { select: { id: true } },
      toechter: { select: { id: true } },
      zuchtserie: { select: { id: true, bezeichnung: true } },
      volk: { select: { id: true, name: true, bienenstand: { select: { id: true, name: true } } } },
      ereignisse: {
        orderBy: [{ datum: "desc" }, { createdAt: "desc" }],
        include: {
          volk: { select: { id: true, name: true, bienenstand: { select: { name: true } } } },
          // Nur bei art === "BEWERTUNG" gesetzt - die Rohwerte, aus denen sich
          // einzelne Kriterien aus der Königin-Bewertung ausschließen lassen.
          stockkartenEintrag: {
            select: {
              volksstaerkeEinschaetzung: true,
              futtermengeEinschaetzung: true,
              sanftmut: true,
              schwarmtrieb: true,
              wabensitz: true,
              legeleistung: true,
              // gesamteindruck wird mitgeladen, damit der generische
              // Feldzugriff unten für jedes BeurteilungsFeld typsicher
              // bleibt - KOENIGINS_BEURTEILUNGS_KRITERIEN lässt es zur
              // Laufzeit aber links liegen, es zählt nicht zur
              // Königin-Bewertung.
              gesamteindruck: true,
              ausschlussKriterien: true,
            },
          },
        },
      },
      dokumente: { orderBy: { datum: "desc" }, include: { kategorie: { select: { name: true } } } },
      zuchtkarte: { select: { inhalt: true, updatedAt: true } },
    },
  });

  if (!koenigin) notFound();

  // Vaterseite einer Belegstellen-Königin: die Drohnenvölker, die in ihrem
  // Belegjahr auf der Belegstelle standen.
  const jahrDerBelegung = koenigin.begattungsart === "BELEGSTELLE" ? belegjahr(koenigin) : null;
  const [{ voelker }, leistung, stammbaum, drohnen] = await Promise.all([
    auswahlenLaden(),
    leistungLaden(koenigin),
    stammbaumLaden(),
    koenigin.belegstelleId && jahrDerBelegung !== null
      ? prisma.belegstelleJahr.findUnique({
          where: { belegstelleId_jahr: { belegstelleId: koenigin.belegstelleId, jahr: jahrDerBelegung } },
        })
      : null,
  ]);
  const farbe = anzeigeFarbe(koenigin.jahrgang, koenigin.zeichenFarbe);
  const status = koenigin.status as KoeniginStatus;
  const zuchtkarte = koenigin.zuchtkarte
    ? { inhalt: inhaltBereinigen(koenigin.zuchtkarte.inhalt), stand: standAnzeige(koenigin.zuchtkarte.updatedAt) }
    : null;
  // Die hochgeladene Karte des Züchters; fehlt ihre Datei auf dem Server,
  // soll die Seite das sagen, statt ein kaputtes Bild zu zeigen.
  const zuchtkarteFoto = koenigin.zuchtkarteFotoDateiname
    ? {
        dateiname: koenigin.zuchtkarteFotoDateiname,
        mimeType: koenigin.zuchtkarteFotoMimeType,
        dateiFehlt: !(await dateiVorhanden(koenigin.zuchtkarteFotoDateiname)),
      }
    : null;
  // Gibt es überhaupt etwas anzuzeigen im Bewertungsteil? Sonst bliebe eine
  // Überschrift ohne jeden Inhalt darunter stehen.
  const hatBewertung =
    leistung !== null &&
    (leistung.kriterien.length > 0 ||
      leistung.anzahlErnten > 0 ||
      leistung.bebrueteteWabenSchnitt !== null ||
      leistung.brutwabenSchnitt !== null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <div className="flex flex-wrap items-center gap-3">
          <KoeniginFoto
            koeniginId={koenigin.id}
            dateiname={koenigin.fotoDateiname}
            kennung={koenigin.kennung}
            ausschnitt={{
              zoom: koenigin.fotoZoom,
              fokusX: koenigin.fotoFokusX,
              fokusY: koenigin.fotoFokusY,
            }}
            action={koeniginFotoAktualisieren}
            ausschnittAction={koeniginFotoAusschnittAktualisieren}
          />
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-sm font-semibold border border-rand-bedienung"
            style={{
              background: farbe?.hex ?? "transparent",
              color: farbe?.dunklerText ? "#17191b" : "#ffffff",
            }}
            title={farbe ? `gezeichnet ${farbe.name}` : "keine Zeichenfarbe"}
          >
            {koenigin.jahrgang ? String(koenigin.jahrgang).slice(-2) : "–"}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{koenigin.kennung}</h1>
            <p className="text-sm text-muted">
              {[koenigin.rasse, koenigin.jahrgang && `Jahrgang ${koenigin.jahrgang}`, STATUS_LABEL[status]]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Link
            href={`/koeniginnen/${koenigin.id}/bearbeiten`}
            className="text-sm text-muted hover:text-accent"
          >
            bearbeiten
          </Link>
          <KoeniginSternKnopf aktiv={koenigin.stern} action={koeniginSternUmschalten.bind(null, koenigin.id)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Stammdaten</h2>
          <div className="divide-y divide-border">
            <Angabe bezeichnung="Sitzt in">
              {koenigin.volk ? (
                <Link href={`/voelker/${koenigin.volk.id}`} className="text-accent hover:underline">
                  {koenigin.volk.name} ({koenigin.volk.bienenstand.name})
                </Link>
              ) : (
                <span className="text-muted">in keinem Volk</span>
              )}
            </Angabe>
            <Angabe bezeichnung="Herkunft">
              {[
                HERKUNFT_LABEL[koenigin.herkunft as Herkunft],
                koenigin.herkunftsVolk && `aus ${koenigin.herkunftsVolk.name}`,
                koenigin.herkunftText,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Angabe>
            <Angabe bezeichnung="Begattung">
              {[
                BEGATTUNGSART_LABEL[koenigin.begattungsart as Begattungsart],
                koenigin.belegstelle?.name,
                koenigin.begattungsStand?.name,
                koenigin.begattungVon &&
                  `${kurzesDatum(koenigin.begattungVon)}${koenigin.begattungBis ? ` – ${kurzesDatum(koenigin.begattungBis)}` : ""}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Angabe>
            <Angabe bezeichnung="Geschlüpft">{kurzesDatum(koenigin.schlupfDatum)}</Angabe>
            <Angabe bezeichnung="Zeichen">
              {[koenigin.zeichenFarbe ?? farbe?.name, koenigin.zeichenNummer && `Nr. ${koenigin.zeichenNummer}`]
                .filter(Boolean)
                .join(", ")}
            </Angabe>
            <Angabe bezeichnung="Zuchtbuchnummer">{koenigin.zuchtbuchnummer}</Angabe>
            <Angabe bezeichnung="Notizen">
              {koenigin.notizen && <span className="whitespace-pre-wrap">{koenigin.notizen}</span>}
            </Angabe>
          </div>

          {hatBewertung && leistung && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Bewertung</p>
              <div className="divide-y divide-border">
                {/* Aus den Durchsichten, die beim Speichern der Stockkarte
                    ausdrücklich als Bewertung in den Lebenslauf übernommen
                    wurden - dort auch einzeln aus der Bewertung ausschließbar,
                    falls ein unvorhergesehenes Ereignis das Ergebnis verfälscht. */}
                {leistung.kriterien.map((kriterium) => (
                  <Angabe key={kriterium.feld} bezeichnung={kriterium.label}>
                    <span className="mr-2">{stufenText(kriterium)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums ${schulnotenFarbe(kriterium.schulnote)}`}
                      title={`Schulnote aus dem Lebenslauf bestätigter Bewertungen; Schnitt der Rohwerte: ${kriterium.schnitt.toFixed(1).replace(".", ",")}`}
                    >
                      {kriterium.schulnote.toFixed(1).replace(".", ",")}
                    </span>
                    <span className="ml-2 text-xs text-muted">{kriterium.anzahl}×</span>
                  </Angabe>
                ))}
                {leistung.gesamtnote !== null && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">Gesamtnote</span>
                    <span
                      className={`rounded-full px-3 py-1 text-lg font-bold tabular-nums ${schulnotenFarbe(leistung.gesamtnote)}`}
                      title="Schnitt der Schulnoten aller Kriterien oben"
                    >
                      {leistung.gesamtnote.toFixed(1).replace(".", ",")}
                    </span>
                  </div>
                )}
                {leistung.anzahlErnten > 0 && (
                  <>
                    <Angabe bezeichnung="Honigertrag">
                      {leistung.honigSummeKg.toFixed(1).replace(".", ",")} kg aus {leistung.anzahlErnten}{" "}
                      {leistung.anzahlErnten === 1 ? "Ernte" : "Ernten"}
                    </Angabe>
                    <HonigertragBemerkung
                      koeniginId={koenigin.id}
                      bemerkung={koenigin.honigertragBemerkung ?? ""}
                      action={koeniginHonigertragBemerkungSpeichern}
                    />
                  </>
                )}
                {leistung.bebrueteteWabenSchnitt !== null && (
                  <Angabe bezeichnung="Brutwaben (bebrütet)">
                    Ø {leistung.bebrueteteWabenSchnitt.toFixed(1).replace(".", ",")}
                  </Angabe>
                )}
                {leistung.brutwabenSchnitt !== null && (
                  <Angabe bezeichnung="Brutfläche">
                    Ø {leistung.brutwabenSchnitt.toFixed(1).replace(".", ",")} Waben
                  </Angabe>
                )}
              </div>
            </div>
          )}

        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-semibold">Abstammung</h2>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Mutterseite</p>
          {koenigin.mutterKoenigin || koenigin.toechter.length > 0 ? (
            <div className="overflow-x-auto pb-1">
              <KoeniginLinie baum={stammbaum} koeniginId={koenigin.id} />
            </div>
          ) : (
            <p className="text-sm text-muted">Keine Mutter hinterlegt.</p>
          )}
          {koenigin.zuchtserie && (
            <p className="mt-3 text-sm text-muted">
              Aus der Zuchtserie{" "}
              <Link href={`/koeniginnen/zucht/${koenigin.zuchtserie.id}`} className="text-accent hover:underline">
                {koenigin.zuchtserie.bezeichnung}
              </Link>
            </p>
          )}
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Vaterseite</p>
            <Vaterseite
              begattungsart={koenigin.begattungsart as Begattungsart}
              belegstelle={koenigin.belegstelle}
              belegjahr={jahrDerBelegung}
              drohnenvoelker={drohnen?.drohnenvoelker ?? null}
              vaterlinie={koenigin.vaterlinie}
              standName={koenigin.begattungsStand?.name ?? null}
            />
          </div>
          <Link href="/koeniginnen/stammbaum" className="mt-3 inline-block text-sm text-muted hover:text-accent">
            Ganzer Stammbaum →
          </Link>
        </Card>
      </div>

      {/* Zuchtkarte und Lebenslauf stehen ab Tablet nebeneinander, gleich breit
          wie die beiden Kacheln darüber. Am Handy bleibt die Reihenfolge:
          Zuchtkarte zuerst (steht im Code vorn), dann Dokumente und Lebenslauf;
          erst ab `md` kommt die Zuchtkarte in die rechte Spalte. */}
      <div className="grid items-start gap-x-4 gap-y-6 md:grid-cols-2">
        <Card className="min-w-0 md:col-start-2 md:row-start-1">
          <h2 className="mb-3 text-lg font-semibold">Zuchtkarte</h2>
          {(zuchtkarteFoto || zuchtkarte) && <ZuchtkarteAnsicht foto={zuchtkarteFoto} karte={zuchtkarte} />}
          <p className={`text-sm text-muted ${zuchtkarteFoto || zuchtkarte ? "mt-4" : ""}`}>
            {zuchtkarte
              ? "Gedruckt wird auf A4 quer, bis zu fünf Karten nebeneinander, mit Schnittkreuzen zum Ausschneiden."
              : zuchtkarteFoto
                ? "Die hochgeladene Karte des Züchters bleibt gespeichert, bis du sie unter „bearbeiten“ entfernst. Zusätzlich kannst du eine eigene Zuchtkarte erstellen. Darauf ist schon alles eingetragen, was über die Königin bekannt ist."
                : "Zu dieser Königin gibt es noch keine eigene Zuchtkarte. Beim Erstellen ist schon alles eingetragen, was über sie bekannt ist. Vor dem Speichern kannst du es ändern."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/koeniginnen/${koenigin.id}/zuchtkarte/bearbeiten`}
              className={knopfKlassen("primary", "klein")}
            >
              {zuchtkarte ? "Zuchtkarte bearbeiten" : "Zuchtkarte erstellen"}
            </Link>
            {zuchtkarte && (
              <>
                <a
                  href={`/koeniginnen/${koenigin.id}/zuchtkarte`}
                  target="_blank"
                  rel="noreferrer"
                  className={knopfKlassen("secondary", "klein")}
                >
                  Zuchtkarte drucken
                </a>
                <Link
                  href={`/koeniginnen/zuchtkarten?auswahl=${koenigin.id}`}
                  className="px-2 py-2 text-sm text-muted hover:text-accent"
                >
                  Mit anderen Karten drucken →
                </Link>
              </>
            )}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-6 md:col-start-1 md:row-start-1">
          {/* Nur sichtbar, wenn tatsächlich Dokumente mit dieser Königin
              verknüpft sind. Hochgeladen wird über /dokumente. */}
          {koenigin.dokumente.length > 0 && (
            <Card>
              <h2 className="mb-3 text-lg font-semibold">Dokumente</h2>
              <DokumenteMiniListe
                dokumente={koenigin.dokumente.map((dokument) => ({
                  id: dokument.id,
                  kategorieName: dokument.kategorie.name,
                  titel: dokument.titel,
                  datum: dokument.datum,
                  dateiname: dokument.dateiname,
                  mimeType: dokument.mimeType,
                  groesse: dokument.groesse,
                  loeschenAction: dokumentLoeschen.bind(null, dokument.id),
                }))}
              />
            </Card>
          )}

          <Card>
            <h2 className="mb-1 text-lg font-semibold">Lebenslauf</h2>
            <p className="mb-4 text-sm text-muted">
              Verkauft, verstorben, geschwärmt, umgeweiselt: Der Verbleib oben ergibt sich aus dem
              jeweils letzten Eintrag.
            </p>

            <div className="mb-5 rounded-lg border border-border bg-background p-4">
              <KoeniginEreignisFormular
                koeniginId={koenigin.id}
                voelker={voelker}
                action={koeniginEreignisHinzufuegen}
              />
            </div>

            <KoeniginEreignisListe
              ereignisse={koenigin.ereignisse.map((ereignis) => ({
                id: ereignis.id,
                datum: ereignis.datum,
                art: ereignis.art as EreignisArt,
                volk: ereignis.volk
                  ? { id: ereignis.volk.id, name: ereignis.volk.name, standName: ereignis.volk.bienenstand.name }
                  : null,
                volkId: ereignis.volkId,
                notiz: ereignis.notiz,
                fotoDateiname: ereignis.fotoDateiname,
                bewertung: ereignis.stockkartenEintrag
                  ? {
                      stockkartenEintragId: ereignis.stockkartenEintragId!,
                      kriterien: KOENIGINS_BEURTEILUNGS_KRITERIEN.flatMap((kriterium) => {
                        const wert = ereignis.stockkartenEintrag![kriterium.feld];
                        if (typeof wert !== "number") return [];
                        return [
                          {
                            feld: kriterium.feld,
                            label: kriterium.label,
                            stufenText: `${noteText(wert)} ${stufeText(kriterium, wert)}`,
                            ausgeschlossen: ereignis.stockkartenEintrag!.ausschlussKriterien.includes(kriterium.feld),
                          },
                        ];
                      }),
                    }
                  : null,
              }))}
              voelker={voelker}
              aktualisierenAction={koeniginEreignisAktualisieren}
              loeschenAction={koeniginEreignisLoeschen}
              kriteriumAusschlussAction={kriteriumAusschlussUmschalten}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
