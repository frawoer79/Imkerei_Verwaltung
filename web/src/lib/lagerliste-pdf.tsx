import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { datumAnzeige, mengeAnzeige } from "@/lib/behandlung";
import { kgAnzeige } from "@/lib/honig";
import { loseName } from "@/lib/gebinde";
import { LAGERLISTE_TITEL, type BuchungsListe, type ErzeugnisListe, type MaterialListe } from "@/lib/lagerliste";
import { euro } from "@/lib/warenwert";

// Lagerlisten als echte PDF-Datei - gleiche Technik wie der
// Behandlungsnachweis (lib/nachweis-pdf.tsx): serverseitig mit
// @react-pdf/renderer, eingebaute Helvetica (WinAnsi: Umlaute, "·" und "×"
// gehen).

const stil = StyleSheet.create({
  seite: {
    paddingTop: 32,
    paddingBottom: 44,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#17191b",
  },
  kopfZeile: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1.5,
    borderBottomColor: "#17191b",
    paddingBottom: 5,
    marginBottom: 12,
  },
  titel: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  untertitel: { fontSize: 7.5, color: "#5f6663", marginTop: 2 },
  kopfRechts: { fontSize: 8, textAlign: "right", lineHeight: 1.5 },
  gedaempft: { color: "#5f6663" },
  abschnitt: { marginBottom: 14 },
  abschnittTitel: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  abschnittText: { fontSize: 7.5, color: "#5f6663", marginBottom: 5 },
  unterTitel: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 2 },

  zeile: { flexDirection: "row" },
  kopfzelle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#3d4340",
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderBottomWidth: 1.2,
    borderBottomColor: "#17191b",
  },
  zelle: {
    fontSize: 8.5,
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#c9ccc7",
  },
  summenzelle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderTopWidth: 1,
    borderTopColor: "#17191b",
  },
  rechts: { textAlign: "right" },
  warnung: { color: "#b3261e" },
  leiseZelle: { fontSize: 7.5, color: "#5f6663", paddingVertical: 1.5, borderBottomColor: "#e4e6e2" },
  leer: { fontSize: 8.5, color: "#5f6663", fontStyle: "italic" },
  fussnote: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 6.5,
    color: "#5f6663",
    borderTopWidth: 0.5,
    borderTopColor: "#c9ccc7",
    paddingTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

type Spalte = { titel: string; breite: number | "flex"; rechts?: boolean };

// Einfache Tabelle mit fester Kopfzeile. Breiten in pt, "flex" teilt sich
// den Rest. Zeilen brechen nicht mitten durch (wrap={false}).
function Tabelle({
  spalten,
  zeilen,
  summe,
}: {
  spalten: Spalte[];
  zeilen: { schluessel: string; zellen: ReactNode[]; warnung?: boolean; leise?: boolean }[];
  summe?: ReactNode[];
}) {
  const breite = (spalte: Spalte) => (spalte.breite === "flex" ? { flex: 1 } : { width: spalte.breite });
  return (
    <View>
      <View style={stil.zeile} fixed>
        {spalten.map((spalte) => (
          <Text key={spalte.titel} style={[stil.kopfzelle, breite(spalte), spalte.rechts ? stil.rechts : {}]}>
            {spalte.titel}
          </Text>
        ))}
      </View>
      {zeilen.map((zeile) => (
        <View key={zeile.schluessel} style={stil.zeile} wrap={false}>
          {zeile.zellen.map((zelle, index) => (
            <Text
              key={index}
              style={[
                stil.zelle,
                breite(spalten[index]),
                spalten[index].rechts ? stil.rechts : {},
                zeile.warnung && spalten[index].rechts ? stil.warnung : {},
                zeile.leise ? stil.leiseZelle : {},
              ]}
            >
              {zelle}
            </Text>
          ))}
        </View>
      ))}
      {summe && (
        <View style={stil.zeile} wrap={false}>
          {summe.map((zelle, index) => (
            <Text key={index} style={[stil.summenzelle, breite(spalten[index]), spalten[index].rechts ? stil.rechts : {}]}>
              {zelle}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function Rahmen({
  titel,
  untertitel,
  halter,
  erstelltAm,
  children,
}: {
  titel: string;
  untertitel: string;
  halter: string | null | undefined;
  erstelltAm: Date;
  children: ReactNode;
}) {
  return (
    <Document title={`${titel} ${datumAnzeige(erstelltAm)}`} author={halter ?? "Imkereiverwaltung"} subject={untertitel}>
      <Page size="A4" style={stil.seite}>
        <View style={stil.kopfZeile} fixed>
          <View style={{ flex: 1 }}>
            <Text style={stil.titel}>{titel}</Text>
            <Text style={stil.untertitel}>{untertitel}</Text>
          </View>
          <View style={stil.kopfRechts}>
            {halter ? <Text>{halter}</Text> : null}
            <Text style={stil.gedaempft}>Stand {datumAnzeige(erstelltAm)}</Text>
          </View>
        </View>

        {children}

        <View style={stil.fussnote} fixed>
          <Text>
            {titel} · Stand {datumAnzeige(erstelltAm)} · erstellt mit der Imkereiverwaltung
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function Abschnitt({ titel, text, children }: { titel: string; text?: string; children: ReactNode }) {
  return (
    <View style={stil.abschnitt}>
      <View wrap={false}>
        <Text style={stil.abschnittTitel}>{titel}</Text>
        {text ? <Text style={stil.abschnittText}>{text}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function MaterialDokument({ liste, erstelltAm }: { liste: MaterialListe; erstelltAm: Date }) {
  const zargenGesamt = liste.zargen.reduce((summe, zarge) => summe + (zarge.gesamtbestand ?? 0), 0);
  const zargenImEinsatz = liste.zargen.reduce((summe, zarge) => summe + zarge.imEinsatz, 0);

  return (
    <Rahmen
      titel={LAGERLISTE_TITEL.MATERIAL}
      untertitel="Gesamtbestand, Lagerorte und Material im Einsatz"
      halter={liste.betrieb?.halterName}
      erstelltAm={erstelltAm}
    >
      <Abschnitt
        titel="Zargen"
        text="Im Einsatz = aufgesetzte Honigräume und Brutraumzargen aktiver Völker (Aufteilung je Volk unten)."
      >
        {liste.zargen.length === 0 ? (
          <Text style={stil.leer}>Für keine Zarge ist ein Bestand erfasst.</Text>
        ) : (
          <Tabelle
            spalten={[
              { titel: "Zarge", breite: "flex" },
              { titel: "Gesamt", breite: 60, rechts: true },
              { titel: "im Einsatz", breite: 60, rechts: true },
              { titel: "verfügbar", breite: 70, rechts: true },
            ]}
            zeilen={liste.zargen.map((zarge) => ({
              schluessel: zarge.id,
              warnung: zarge.verfuegbar !== null && zarge.verfuegbar < 0,
              zellen: [
                zarge.bezeichnung,
                zarge.gesamtbestand === null ? "–" : String(zarge.gesamtbestand),
                String(zarge.imEinsatz),
                zarge.verfuegbar === null ? "Bestand fehlt" : String(zarge.verfuegbar),
              ],
            }))}
            summe={["Summe", String(zargenGesamt), String(zargenImEinsatz), ""]}
          />
        )}
      </Abschnitt>

      <Abschnitt titel="Zubehör nach Lagerort">
        {liste.zubehoerNachOrt.length === 0 ? (
          <Text style={stil.leer}>Kein Zubehör erfasst.</Text>
        ) : (
          liste.zubehoerNachOrt.map(({ ort, artikel }) => (
            <View key={ort}>
              <Text style={stil.unterTitel}>{ort}</Text>
              <Tabelle
                spalten={[
                  { titel: "Artikel", breite: 170 },
                  { titel: "Bestand", breite: 80, rechts: true },
                  { titel: "Notiz", breite: "flex" },
                ]}
                zeilen={artikel.map((eintrag) => ({
                  schluessel: eintrag.id,
                  zellen: [eintrag.name, mengeAnzeige(eintrag.bestand, eintrag.einheit), eintrag.notizen ?? ""],
                }))}
              />
            </View>
          ))
        )}
      </Abschnitt>

      <Abschnitt titel="Im Einsatz an den Völkern" text="Aktive Völker mit Brutraum, Klimadeckel und aufgesetzten Honigräumen.">
        {liste.imEinsatz.length === 0 ? (
          <Text style={stil.leer}>Derzeit ist an keinem Volk Material erfasst.</Text>
        ) : (
          <Tabelle
            spalten={[
              { titel: "Stand", breite: 110 },
              { titel: "Volk", breite: 90 },
              { titel: "Brutraum", breite: 120 },
              { titel: "Klimadeckel", breite: 90 },
              { titel: "Honigräume", breite: "flex" },
            ]}
            zeilen={liste.imEinsatz.map((volk) => ({
              schluessel: volk.id,
              zellen: [
                volk.standName,
                volk.volkName,
                volk.brutraum ?? "–",
                volk.klimadeckel ?? "–",
                volk.honigraumText || "–",
              ],
            }))}
          />
        )}
      </Abschnitt>
    </Rahmen>
  );
}

function ErzeugnisDokument({ liste, erstelltAm }: { liste: ErzeugnisListe; erstelltAm: Date }) {
  return (
    <Rahmen
      titel={LAGERLISTE_TITEL.ERZEUGNISSE}
      untertitel="Gesamtbestand, Lagerorte und Honig noch auf den Völkern"
      halter={liste.betrieb?.halterName}
      erstelltAm={erstelltAm}
    >
      <Abschnitt titel="Gesamtbestand">
        {liste.erzeugnisse.length === 0 ? (
          <Text style={stil.leer}>Keine Erzeugnisse erfasst.</Text>
        ) : (
          <Tabelle
            spalten={[
              { titel: "Erzeugnis", breite: "flex" },
              { titel: "Bestand", breite: 100, rechts: true },
              ...(liste.warenwert ? [{ titel: "Warenwert", breite: 80, rechts: true }] : []),
            ]}
            zeilen={liste.erzeugnisse.map((erzeugnis) => ({
              schluessel: erzeugnis.id,
              warnung: erzeugnis.bestand < 0,
              zellen: [
                erzeugnis.name,
                mengeAnzeige(erzeugnis.bestand, erzeugnis.einheit),
                ...(liste.warenwert ? [euro(erzeugnis.wert ?? 0)] : []),
              ],
            }))}
            summe={
              liste.warenwert
                ? ["Summe", "", euro(liste.erzeugnisse.reduce((summe, erzeugnis) => summe + (erzeugnis.wert ?? 0), 0))]
                : undefined
            }
          />
        )}
      </Abschnitt>

      {liste.erzeugnisse
        .filter((erzeugnis) => erzeugnis.zeilen.length > 0)
        .map((erzeugnis) => (
          <Abschnitt key={erzeugnis.id} titel={`${erzeugnis.name} nach Lagerort`}>
            {erzeugnis.nachSorte.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={stil.unterTitel}>Warenwert nach Sorte</Text>
                <Tabelle
                  spalten={[
                    { titel: "Sorte", breite: "flex" },
                    { titel: "Menge", breite: 80, rechts: true },
                    { titel: "Wert", breite: 80, rechts: true },
                  ]}
                  zeilen={erzeugnis.nachSorte.map((eintrag) => ({
                    schluessel: eintrag.sorte,
                    zellen: [eintrag.sorte, mengeAnzeige(eintrag.menge, erzeugnis.einheit), euro(eintrag.wert)],
                  }))}
                  summe={["Summe", mengeAnzeige(erzeugnis.bestand, erzeugnis.einheit), euro(erzeugnis.wert ?? 0)]}
                />
                <Text style={stil.unterTitel}>Alle Posten</Text>
              </View>
            )}
            <Tabelle
              spalten={[
                { titel: "Lagerort", breite: liste.warenwert ? 90 : 120 },
                { titel: "Sorte", breite: liste.warenwert ? 85 : 110 },
                { titel: "Gebinde", breite: "flex" },
                { titel: "Stück", breite: liste.warenwert ? 34 : 50, rechts: true },
                { titel: "Menge", breite: 62, rechts: true },
                ...(liste.warenwert
                  ? [
                      { titel: "Preis", breite: 68, rechts: true },
                      { titel: "Wert", breite: 62, rechts: true },
                    ]
                  : []),
              ]}
              zeilen={erzeugnis.zeilen.flatMap((zeile, index) => [
                {
                  schluessel: String(index),
                  warnung: zeile.menge < 0,
                  zellen: [
                    zeile.lagerort,
                    zeile.sorte ?? "–",
                    zeile.gebinde ?? loseName(erzeugnis.einheit),
                    zeile.anzahl === null ? "" : String(zeile.anzahl),
                    mengeAnzeige(zeile.menge, erzeugnis.einheit),
                    ...(liste.warenwert ? [zeile.preis || "–", zeile.wert === null ? "kein Preis" : euro(zeile.wert)] : []),
                  ],
                },
                // Einzelgewichte der Eimer (nur mit "Eimer einzeln wiegen").
                ...zeile.eimer.map((eimer) => ({
                  schluessel: `${index}-${eimer.id}`,
                  leise: true,
                  zellen: [
                    "",
                    "",
                    `Nr. ${eimer.nummer} · eingelagert ${eimer.eingelagertAm.toLocaleDateString("de-DE")}${
                      eimer.gewicht < eimer.eingelagert - 0.0005 ? ` · angebrochen, war ${mengeAnzeige(eimer.eingelagert, erzeugnis.einheit)}` : ""
                    }`,
                    "1",
                    mengeAnzeige(eimer.gewicht, erzeugnis.einheit),
                    ...(liste.warenwert ? ["", ""] : []),
                  ],
                })),
                ...(zeile.eimer.length > 0 && zeile.ohneEinzelgewicht > 0
                  ? [
                      {
                        schluessel: `${index}-ohne`,
                        leise: true,
                        zellen: [
                          "",
                          "",
                          "ohne Einzelgewicht (Nennwert)",
                          String(zeile.ohneEinzelgewicht),
                          "",
                          ...(liste.warenwert ? ["", ""] : []),
                        ],
                      },
                    ]
                  : []),
              ])}
              summe={[
                "Gesamt",
                "",
                "",
                "",
                mengeAnzeige(erzeugnis.bestand, erzeugnis.einheit),
                ...(liste.warenwert ? ["", euro(erzeugnis.wert ?? 0)] : []),
              ]}
            />
          </Abschnitt>
        ))}

      <Abschnitt
        titel="Im Einsatz: Honig noch auf den Völkern"
        text="Aufgesetzte, noch nicht geerntete Honigräume. Geschätzt mit dem Durchschnittsertrag je Zarge, im Bestand oben nicht enthalten."
      >
        {liste.aufDenVoelkern.length === 0 ? (
          <Text style={stil.leer}>Derzeit sitzen keine Honigräume auf den Völkern.</Text>
        ) : (
          <Tabelle
            spalten={[
              { titel: "Stand", breite: 110 },
              { titel: "Volk", breite: 90 },
              { titel: "Honigräume", breite: "flex" },
              { titel: "geschätzt", breite: 70, rechts: true },
            ]}
            zeilen={liste.aufDenVoelkern.map((volk) => ({
              schluessel: volk.id,
              zellen: [volk.standName, volk.volkName, volk.honigraumText, `${kgAnzeige(volk.geschaetztKg)} kg`],
            }))}
            summe={["Summe", "", "", `${kgAnzeige(liste.aufDenVoelkernKg)} kg`]}
          />
        )}
      </Abschnitt>
    </Rahmen>
  );
}

// Auf Gramm genau (31 × Glas 375 g = 11,625 kg), Tausender mit Punkt.
function mengeGenau(menge: number, einheit: string): string {
  return `${menge.toLocaleString("de-DE", { maximumFractionDigits: 3 })} ${einheit}`;
}

// Vorzeichen immer zeigen: +23 Zugang, -23 Abgang.
function mitVorzeichen(menge: number, einheit: string): string {
  return `${menge > 0 ? "+" : menge < 0 ? "-" : ""}${mengeGenau(Math.abs(menge), einheit)}`;
}

function BuchungsDokument({ liste, erstelltAm }: { liste: BuchungsListe; erstelltAm: Date }) {
  const zeitraum = `${datumAnzeige(liste.von)} bis ${datumAnzeige(liste.bis)}`;
  return (
    <Rahmen
      titel={LAGERLISTE_TITEL.BUCHUNGEN}
      untertitel={`Zu- und Abgänge ${zeitraum}${liste.nurErzeugnis ? ` · ${liste.nurErzeugnis}` : ""}`}
      halter={liste.betrieb?.halterName}
      erstelltAm={erstelltAm}
    >
      {liste.erzeugnisse.length === 0 ? (
        <Text style={stil.leer}>In diesem Zeitraum gibt es keine Buchungen.</Text>
      ) : (
        <>
          <Abschnitt titel="Übersicht" text={`Bestand am Anfang und Ende des Zeitraums, dazwischen alle Zu- und Abgänge.`}>
            <Tabelle
              spalten={[
                { titel: "Erzeugnis", breite: "flex" },
                { titel: `Anfang ${datumAnzeige(liste.von)}`, breite: 80, rechts: true },
                { titel: "Zugänge", breite: 70, rechts: true },
                { titel: "Abgänge", breite: 70, rechts: true },
                { titel: `Ende ${datumAnzeige(liste.bis)}`, breite: 80, rechts: true },
              ]}
              zeilen={liste.erzeugnisse.map((erzeugnis) => ({
                schluessel: erzeugnis.id,
                warnung: erzeugnis.ende < 0,
                zellen: [
                  erzeugnis.name,
                  mengeGenau(erzeugnis.anfang, erzeugnis.einheit),
                  mitVorzeichen(erzeugnis.zugang, erzeugnis.einheit),
                  mitVorzeichen(erzeugnis.abgang, erzeugnis.einheit),
                  mengeGenau(erzeugnis.ende, erzeugnis.einheit),
                ],
              }))}
            />
          </Abschnitt>

          {liste.erzeugnisse
            .filter((erzeugnis) => erzeugnis.buchungen.length > 0)
            .map((erzeugnis) => (
              <Abschnitt
                key={erzeugnis.id}
                titel={erzeugnis.name}
                text={`${erzeugnis.buchungen.length} ${erzeugnis.buchungen.length === 1 ? "Buchung" : "Buchungen"}, älteste zuerst.`}
              >
                <Tabelle
                  spalten={[
                    { titel: "Datum", breite: 52 },
                    { titel: "Sorte", breite: 85 },
                    { titel: "Gebinde", breite: 85 },
                    { titel: "Stück", breite: 34, rechts: true },
                    { titel: "Menge", breite: 62, rechts: true },
                    { titel: "Grund · Lagerort · Notiz", breite: "flex" },
                  ]}
                  zeilen={erzeugnis.buchungen.map((buchung) => ({
                    schluessel: buchung.id,
                    zellen: [
                      datumAnzeige(buchung.datum),
                      buchung.sorte ?? "–",
                      buchung.gebinde ?? loseName(erzeugnis.einheit),
                      buchung.anzahl === null ? "" : `${buchung.anzahl > 0 ? "+" : ""}${buchung.anzahl}`,
                      mitVorzeichen(buchung.menge, erzeugnis.einheit),
                      buchung.text || "–",
                    ],
                  }))}
                  summe={["Saldo", "", "", "", mitVorzeichen(erzeugnis.zugang + erzeugnis.abgang, erzeugnis.einheit), ""]}
                />
              </Abschnitt>
            ))}
        </>
      )}
    </Rahmen>
  );
}

export async function buchungsListePdfErzeugen(liste: BuchungsListe, erstelltAm: Date): Promise<Buffer> {
  return renderToBuffer(<BuchungsDokument liste={liste} erstelltAm={erstelltAm} />);
}

export async function materialListePdfErzeugen(liste: MaterialListe, erstelltAm: Date): Promise<Buffer> {
  return renderToBuffer(<MaterialDokument liste={liste} erstelltAm={erstelltAm} />);
}

export async function erzeugnisListePdfErzeugen(liste: ErzeugnisListe, erstelltAm: Date): Promise<Buffer> {
  return renderToBuffer(<ErzeugnisDokument liste={liste} erstelltAm={erstelltAm} />);
}
