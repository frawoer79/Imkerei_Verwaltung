import { natuerlich } from "@/lib/sortierung";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { datumAnzeige, dauerAnzeige, mengeAnzeige } from "@/lib/behandlung";
import type { NachweisDaten } from "@/lib/nachweis";

// Erzeugt den Behandlungsnachweis als echte PDF-Datei - serverseitig, ohne
// Browser-Druckdialog (der ist auf iPhone und iPad unbrauchbar) und ohne
// Chromium im Docker-Image: @react-pdf/renderer zeichnet das PDF direkt.
//
// Aufbau wie besprochen (Variante C3): Seite 1 Jahresmatrix Völker ×
// Behandlungen, danach die Einzelnachweise im Bestandsbuch-Format.
//
// Zeichensatz: die eingebauten PDF-Schriften können nur WinAnsi. Umlaute und
// "·" gehen damit, ein Häkchen ✓ nicht - deshalb steht in der Matrix ein "x".

const stil = StyleSheet.create({
  seite: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 32,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#17191b",
  },
  kopfZeile: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: "#17191b",
    paddingBottom: 5,
    marginBottom: 6,
  },
  titel: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  untertitel: { fontSize: 7, color: "#5f6663", marginTop: 2 },
  kopfRechts: { fontSize: 7.5, textAlign: "right", lineHeight: 1.5 },
  halterZeile: { flexDirection: "row", gap: 24, marginBottom: 10, fontSize: 7.5 },
  halterBlock: { flex: 1 },
  gedaempft: { color: "#5f6663" },
  abschnitt: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 5 },

  zeile: { flexDirection: "row" },
  kopfzelle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    color: "#3d4340",
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderBottomWidth: 1.2,
    borderBottomColor: "#17191b",
  },
  zelle: {
    fontSize: 7,
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#c9ccc7",
  },
  mitte: { textAlign: "center" },
  rechts: { textAlign: "right" },
  klein: { fontSize: 6.5, color: "#5f6663" },
  legende: { marginTop: 6, fontSize: 6.5, color: "#5f6663", lineHeight: 1.5 },
  verbrauch: { marginTop: 6, fontSize: 7.5 },
  fussnote: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 6,
    color: "#5f6663",
    borderTopWidth: 0.5,
    borderTopColor: "#c9ccc7",
    paddingTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  storniert: { textDecoration: "line-through", color: "#5f6663" },
  fehlt: { fontFamily: "Helvetica-Bold", color: "#b3261e" },
});

function Kopf({ daten, erstelltAm }: { daten: NachweisDaten; erstelltAm: Date }) {
  const { betrieb, staende, jahr, bezeichnung } = daten;
  return (
    <>
      <View style={stil.kopfZeile} fixed>
        <View style={{ flex: 1 }}>
          <Text style={stil.titel}>
            Nachweis über die Anwendung von Tierarzneimitteln bei Bienen
          </Text>
          <Text style={stil.untertitel}>
            gemäß Art. 108 VO (EU) 2019/6 in Verbindung mit § 2 THAMNV
          </Text>
        </View>
        <View style={stil.kopfRechts}>
          <Text>Jahr {jahr}</Text>
          <Text>{bezeichnung}</Text>
          <Text style={stil.gedaempft}>erstellt {datumAnzeige(erstelltAm)}</Text>
        </View>
      </View>

      <View style={stil.halterZeile}>
        <View style={stil.halterBlock}>
          <Text style={stil.gedaempft}>Bienenhalter</Text>
          <Text>
            {betrieb
              ? [betrieb.halterName, betrieb.strasse, betrieb.plzOrt].filter(Boolean).join(", ")
              : "— nicht hinterlegt —"}
          </Text>
          {betrieb?.registriernummer ? (
            <Text style={stil.gedaempft}>Reg.-Nr. {betrieb.registriernummer}</Text>
          ) : null}
        </View>
        <View style={stil.halterBlock}>
          <Text style={stil.gedaempft}>Standorte zum Zeitpunkt der Behandlung</Text>
          {staende.length === 0 ? (
            <Text>—</Text>
          ) : (
            staende.map((stand) => (
              <Text key={stand.id}>
                {[stand.name, stand.strasse, stand.ort].filter(Boolean).join(", ")}
              </Text>
            ))
          )}
        </View>
      </View>
    </>
  );
}

function Uebersicht({ daten }: { daten: NachweisDaten }) {
  const { behandlungen, voelker, verbrauch, mehrereStaende } = daten;
  // Bei vielen Behandlungen wird die Matrix sonst zu schmal; ab dann bleibt
  // die Übersicht weg und die Einzelnachweise sprechen für sich.
  const spalten = behandlungen.slice(0, 14);
  // Feste Breite je Behandlungsspalte statt flex: bei nur drei Behandlungen
  // liefen die Spalten sonst über die halbe Seite auseinander.
  const spaltenBreite = 42;

  return (
    <View>
      <Text style={stil.abschnitt}>Übersicht {daten.jahr}</Text>

      <View style={stil.zeile}>
        <Text style={[stil.kopfzelle, { flex: 1 }]}>Volk</Text>
        {spalten.map((behandlung, index) => (
          <Text
            key={behandlung.id}
            style={[stil.kopfzelle, stil.mitte, { width: spaltenBreite }]}
          >
            {index + 1}
            {"\n"}
            {datumAnzeige(behandlung.datum).slice(0, 6)}
          </Text>
        ))}
        <Text style={[stil.kopfzelle, stil.rechts, { width: 46 }]}>Anzahl</Text>
      </View>

      {voelker.map((volk) => {
        const treffer = spalten.map(
          (behandlung) =>
            !behandlung.storniertAm &&
            behandlung.voelker.some((eintrag) => eintrag.volkId === volk.id)
        );
        const anzahl = treffer.filter(Boolean).length;
        return (
          <View key={volk.id} style={stil.zeile} wrap={false}>
            <Text style={[stil.zelle, { flex: 1 }]}>
              {volk.name}
              {volk.rasse ? ` · ${volk.rasse}` : ""}
              {mehrereStaende ? ` (${volk.bienenstand.name})` : ""}
            </Text>
            {treffer.map((behandelt, index) => (
              <Text
                key={index}
                style={[
                  stil.zelle,
                  stil.mitte,
                  { width: spaltenBreite },
                  behandelt ? {} : stil.gedaempft,
                ]}
              >
                {behandelt ? "x" : "–"}
              </Text>
            ))}
            <Text
              style={[stil.zelle, stil.rechts, { width: 46 }, anzahl === 0 ? stil.fehlt : {}]}
            >
              {anzahl}
            </Text>
          </View>
        );
      })}

      <View style={stil.legende}>
        {spalten.map((behandlung, index) => (
          <Text key={behandlung.id}>
            {index + 1} = {datumAnzeige(behandlung.datum)} · {behandlung.medikament.name}
            {behandlung.medikament.chargennummer
              ? ` (Ch. ${behandlung.medikament.chargennummer})`
              : ""}{" "}
            · gegen {behandlung.indikation}
            {behandlung.storniertAm ? " · STORNIERT" : ""}
          </Text>
        ))}
        {behandlungen.length > spalten.length ? (
          <Text>
            … und {behandlungen.length - spalten.length} weitere, siehe Einzelnachweise.
          </Text>
        ) : null}
      </View>

      {verbrauch.length > 0 ? (
        <Text style={stil.verbrauch}>
          <Text style={stil.gedaempft}>Verbrauch gesamt: </Text>
          {verbrauch
            .map((eintrag) => `${eintrag.name} ${mengeAnzeige(eintrag.menge, eintrag.einheit)}`)
            .join(" · ")}
        </Text>
      ) : null}
    </View>
  );
}

const SPALTEN = [
  { titel: "Datum", breite: 2.2 },
  { titel: "Dauer", breite: 1.6 },
  { titel: "Anzahl, Art und Identität der behandelten Völker", breite: 6 },
  { titel: "Arzneimittel / Indikation", breite: 5.5 },
  { titel: "Menge je Volk", breite: 2 },
  { titel: "Lieferant und Beleg", breite: 5 },
  { titel: "Wartezeit", breite: 1.8 },
  { titel: "Anwender", breite: 3 },
];

function Einzelnachweise({ daten }: { daten: NachweisDaten }) {
  const { behandlungen, volkIds } = daten;

  return (
    <View>
      <Text style={stil.abschnitt}>Einzelnachweise {daten.jahr}</Text>

      <View style={stil.zeile} fixed>
        {SPALTEN.map((spalte) => (
          <Text key={spalte.titel} style={[stil.kopfzelle, { flex: spalte.breite }]}>
            {spalte.titel}
          </Text>
        ))}
      </View>

      {behandlungen.map((behandlung) => {
        const betroffene = behandlung.voelker.filter((eintrag) =>
          volkIds.includes(eintrag.volkId)
        );
        const storniert = behandlung.storniertAm !== null;
        const zelle = storniert ? [stil.zelle, stil.storniert] : [stil.zelle];
        const standorte = Array.from(
          new Set(betroffene.map((eintrag) => eintrag.standNameDamals))
        ).join(", ");

        return (
          <View key={behandlung.id} style={stil.zeile} wrap={false}>
            <Text style={[...zelle, { flex: SPALTEN[0].breite }]}>
              {datumAnzeige(behandlung.datum)}
            </Text>
            <Text style={[...zelle, { flex: SPALTEN[1].breite }]}>
              {dauerAnzeige(behandlung.datum, behandlung.endeDatum)}
            </Text>
            <View style={[...zelle, { flex: SPALTEN[2].breite }]}>
              <Text>
                {betroffene.length}{" "}
                {betroffene.length === 1 ? "Bienenvolk" : "Bienenvölker"} (Apis mellifera):{" "}
                {betroffene.map((eintrag) => eintrag.volkNameDamals).sort(natuerlich).join(", ")}
              </Text>
              <Text style={stil.klein}>Standort: {standorte}</Text>
            </View>
            <View style={[...zelle, { flex: SPALTEN[3].breite }]}>
              <Text>{behandlung.medikament.name}</Text>
              <Text style={stil.klein}>
                {[
                  behandlung.medikament.zulassungsnummer &&
                    `Zul.-Nr. ${behandlung.medikament.zulassungsnummer}`,
                  behandlung.medikament.chargennummer &&
                    `Ch. ${behandlung.medikament.chargennummer}`,
                  `gegen ${behandlung.indikation}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
            <Text style={[...zelle, { flex: SPALTEN[4].breite }]}>
              {mengeAnzeige(behandlung.mengeJeVolk, behandlung.medikament.einheit)}
            </Text>
            <View style={[...zelle, { flex: SPALTEN[5].breite }]}>
              <Text>{behandlung.medikament.lieferant ?? "—"}</Text>
              {behandlung.medikament.belegnummer || behandlung.medikament.kaufdatum ? (
                <Text style={stil.klein}>
                  {[
                    behandlung.medikament.belegnummer &&
                      `Beleg ${behandlung.medikament.belegnummer}`,
                    behandlung.medikament.kaufdatum &&
                      `v. ${datumAnzeige(behandlung.medikament.kaufdatum)}`,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </Text>
              ) : null}
            </View>
            <Text style={[...zelle, { flex: SPALTEN[6].breite }]}>
              {behandlung.wartezeitTage} Tage
            </Text>
            <View style={[...zelle, { flex: SPALTEN[7].breite }]}>
              <Text>{behandlung.anwender}</Text>
              {behandlung.bemerkung ? (
                <Text style={stil.klein}>{behandlung.bemerkung}</Text>
              ) : null}
              {storniert ? (
                <Text style={stil.klein}>
                  storniert {datumAnzeige(behandlung.storniertAm!)}:{" "}
                  {behandlung.storniertGrund}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function NachweisDokument({
  daten,
  erstelltAm,
}: {
  daten: NachweisDaten;
  erstelltAm: Date;
}) {
  return (
    <Document
      title={`Behandlungsnachweis ${daten.jahr} – ${daten.bezeichnung}`}
      author={daten.betrieb?.halterName ?? "Imkereiverwaltung"}
      subject="Nachweis über die Anwendung von Tierarzneimitteln bei Bienen"
    >
      <Page size="A4" orientation="landscape" style={stil.seite}>
        <Kopf daten={daten} erstelltAm={erstelltAm} />

        {daten.behandlungen.length === 0 ? (
          <Text style={{ marginTop: 30, textAlign: "center", color: "#5f6663" }}>
            Für {daten.jahr} sind in diesem Umfang keine Behandlungen dokumentiert.
          </Text>
        ) : (
          <>
            <Uebersicht daten={daten} />
            <View break>
              <Einzelnachweise daten={daten} />
            </View>
          </>
        )}

        <View style={stil.fussnote} fixed>
          <Text>
            Aufzubewahren fünf Jahre (Art. 108 Abs. 5 VO (EU) 2019/6, § 1 Abs. 1 THAMNV). Die
            Erwerbsbelege der eingesetzten Arzneimittel liegen gesondert vor.
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function nachweisPdfErzeugen(
  daten: NachweisDaten,
  erstelltAm: Date
): Promise<Buffer> {
  return renderToBuffer(<NachweisDokument daten={daten} erstelltAm={erstelltAm} />);
}
