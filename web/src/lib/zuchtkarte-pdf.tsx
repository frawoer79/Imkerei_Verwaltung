import { Document, Line, Page, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ComponentProps } from "react";
import { anzeigeFarbe } from "@/lib/koeniginnen";
import {
  AHNEN,
  BEGATTUNG_ZEILEN,
  HERKUNFT_ZEILEN,
  KARTEN_FARBEN,
  KARTE_BREITE_PT,
  KARTE_HOEHE_PT,
  MAX_KARTEN_PRO_BLATT,
  jahrgangAlsZahl,
  type ZuchtkarteInhalt,
} from "@/lib/zuchtkarte-inhalt";
import { LAYOUT as L } from "@/lib/zuchtkarte-layout";

// Zuchtkarten als PDF: bis zu fünf Karten à 52,5 x 148 mm nebeneinander auf
// einem A4-Blatt im Querformat, mit kleinen Kreuzen als Schnittmarken. Die
// Karten stoßen ohne Zwischenraum aneinander, so ist pro Kartengrenze nur ein
// Schnitt nötig.
//
// Erzeugt wie der Behandlungsnachweis mit @react-pdf/renderer: serverseitig,
// ohne Browser-Druckdialog (der ist auf iPhone und iPad unbrauchbar).
// Zeichensatz: die eingebauten PDF-Schriften können nur WinAnsi - Umlaute
// gehen, Häkchen und Emoji nicht (die Eingabe filtert deshalb schon, siehe
// lib/zuchtkarte-inhalt.ts).
//
// Das Aussehen der Karte steht zweimal im Code: hier fürs PDF und in
// components/zuchtkarte-karte.tsx für den Bildschirm. Die Maße kommen aus
// lib/zuchtkarte-layout.ts; Farben und Aufbau dort bitte immer mit ändern.

const MM = 2.834645669; // 1 mm in PDF-Punkten
const BLATT = { breite: 297 * MM, hoehe: 210 * MM }; // A4 quer

const { gruen: GRUEN, tinte: TINTE, grau: GRAU, hellgrau: HELLGRAU, linie: LINIE, rahmen: RAHMEN } = KARTEN_FARBEN;

/// Zeilenhöhe als absolute Länge: eine bloße Zahl gilt im PDF als Vielfaches
/// der Schrift.
const pt = (zahl: number) => `${zahl}pt`;

// Der Browser trennt keine Wörter; das PDF täte es von sich aus ("Haus-stand")
// und bräche damit anders um als die Voransicht.
const nichtTrennen = (wort: string) => [wort];
function T(props: ComponentProps<typeof Text>) {
  return <Text hyphenationCallback={nichtTrennen} {...props} />;
}

// Aufbau: Der Inhalt (`fluss`) läuft von oben nach unten in natürlicher Höhe,
// der Fuß (`fussHuelle`) sitzt fest am unteren Rand. Beide sind absolut
// gesetzt, damit nichts davon im Flex-Layout schrumpfen oder wachsen kann
// (react-pdf wertet flexShrink: 0 als 1 - ausschalten lässt sich das Schrumpfen
// nicht, bei zu vollen Karten würden die Zeilen sonst ineinander gequetscht).
// Was nicht mehr aufs Papier passt, verschwindet hinter dem Fuß; die
// Voransicht zeigt das beim Bearbeiten rot an.
const stil = StyleSheet.create({
  karte: {
    width: KARTE_BREITE_PT,
    height: KARTE_HOEHE_PT,
    borderWidth: L.rahmen,
    borderColor: RAHMEN,
    backgroundColor: "#ffffff",
    color: TINTE,
    fontFamily: "Helvetica",
    fontSize: L.schrift,
    lineHeight: pt(L.zeile),
    overflow: "hidden",
  },
  fluss: { position: "absolute", top: 0, left: 0, right: 0 },

  kopf: {
    backgroundColor: GRUEN,
    color: "#ffffff",
    paddingHorizontal: L.seite,
    paddingTop: L.kopf.oben,
    paddingBottom: L.kopf.unten,
  },
  kopfBetrieb: { fontSize: L.kopf.betriebSchrift, lineHeight: pt(L.kopf.betriebZeile), letterSpacing: L.kopf.betriebSperrung },
  kopfTitel: {
    fontSize: L.kopf.titelSchrift,
    lineHeight: pt(L.kopf.titelZeile),
    fontFamily: "Helvetica-Bold",
    marginTop: L.kopf.titelOben,
  },

  ident: {
    flexDirection: "row",
    alignItems: "center",
    gap: L.ident.abstand,
    paddingHorizontal: L.seite,
    paddingVertical: L.ident.oben,
    borderBottomWidth: L.ident.linie,
    borderBottomColor: TINTE,
  },
  punkt: {
    width: L.ident.punkt,
    height: L.ident.punkt,
    borderRadius: L.ident.punkt / 2,
    borderWidth: L.ident.punktRand,
    borderColor: TINTE,
    alignItems: "center",
    justifyContent: "center",
  },
  punktText: { fontSize: L.ident.punktSchrift, fontFamily: "Helvetica-Bold" },
  kennung: { fontSize: L.ident.kennungSchrift, lineHeight: pt(L.ident.kennungZeile), fontFamily: "Helvetica-Bold" },
  kennungNeben: { color: GRAU, marginTop: L.ident.untertitelOben },

  block: {
    paddingHorizontal: L.seite,
    paddingTop: L.block.oben,
    paddingBottom: L.block.unten,
    borderBottomWidth: L.block.linie,
    borderBottomColor: LINIE,
  },
  ueberschrift: {
    fontSize: L.ueberschrift.schrift,
    lineHeight: pt(L.ueberschrift.zeile),
    fontFamily: "Helvetica-Bold",
    letterSpacing: L.ueberschrift.sperrung,
    color: GRUEN,
    marginBottom: L.ueberschrift.unten,
  },
  zeile: { flexDirection: "row", gap: L.tabelle.luecke, marginBottom: L.tabelle.unten },
  schluessel: { width: L.tabelle.schluesselBreite, color: GRAU },
  wert: { flex: 1 },

  ahn: {
    borderLeftWidth: L.ahn.linie,
    borderLeftColor: RAHMEN,
    paddingLeft: L.ahn.links,
    marginBottom: L.ahn.unten,
  },
  ahnRolle: {
    fontSize: L.ahn.rolleSchrift,
    lineHeight: pt(L.ahn.rolleZeile),
    letterSpacing: L.ahn.rolleSperrung,
    color: HELLGRAU,
  },
  ahnWer: { fontFamily: "Helvetica-Bold" },
  ahnDetail: { color: GRAU },

  // Unter den Bemerkungen Linien zum Weiterschreiben von Hand, so viele, dass
  // sie auch bei sonst leerer Karte bis zum Fuß reichen - was darüber
  // hinausgeht, schneidet die Karte ab.
  notizen: {
    paddingHorizontal: L.seite,
    paddingTop: L.block.oben,
    paddingBottom: L.block.unten,
  },
  notizLinie: {
    height: L.bemerkung.linienHoehe,
    borderBottomWidth: L.block.linie,
    borderBottomColor: LINIE,
  },

  // Die weiße Hülle deckt zugleich den Innenabstand unter den Bemerkungen ab,
  // damit keine halbe Linie über dem Fuß stehen bleibt.
  fussHuelle: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
    paddingTop: L.block.unten,
  },
  fuss: {
    paddingHorizontal: L.seite,
    paddingTop: L.fuss.oben,
    paddingBottom: L.fuss.unten,
    borderTopWidth: L.fuss.linie,
    borderTopColor: TINTE,
    fontSize: L.fuss.schrift,
    lineHeight: pt(L.fuss.zeile),
    color: GRAU,
  },
});

function Zeile({ schluessel, wert }: { schluessel: string; wert: string }) {
  if (!wert) return null;
  return (
    <View style={stil.zeile}>
      <T style={stil.schluessel}>{schluessel}</T>
      <T style={stil.wert}>{wert}</T>
    </View>
  );
}

function Ahn({ rolle, name, detail }: { rolle: string; name: string; detail: string }) {
  if (!name && !detail) return null;
  return (
    <View style={stil.ahn}>
      <T style={stil.ahnRolle}>{rolle}</T>
      {name ? <T style={stil.ahnWer}>{name}</T> : null}
      {detail ? <T style={stil.ahnDetail}>{detail}</T> : null}
    </View>
  );
}

export function KartePdf({ inhalt, stand }: { inhalt: ZuchtkarteInhalt; stand: string }) {
  // Jahresfarbe als Punkt - die Farbe aus dem Zeichen-Text hat Vorrang, sonst
  // gilt die genormte Farbe des Jahrgangs.
  const farbe = anzeigeFarbe(jahrgangAlsZahl(inhalt), inhalt.zeichen);
  const hatAbstammung = AHNEN.some((ahn) => inhalt[ahn.name] || (ahn.detail && inhalt[ahn.detail]));

  return (
    <View style={stil.karte}>
      <View style={stil.fluss}>
        <View style={stil.kopf}>
          <T style={stil.kopfBetrieb}>{(inhalt.kopfzeile || "Imkerei").toUpperCase()}</T>
          <T style={stil.kopfTitel}>Zuchtkarte</T>
        </View>

        <View style={stil.ident}>
          {/* Mit dunklem Rand, damit ein weißes Jahr auf dem Papier nicht
              verschwindet. */}
          <View style={[stil.punkt, { backgroundColor: farbe?.hex ?? "#ffffff" }]}>
            <T style={[stil.punktText, { color: farbe?.dunklerText === false ? "#ffffff" : TINTE }]}>
              {inhalt.jahrgang || "--"}
            </T>
          </View>
          <View style={{ flex: 1 }}>
            <T style={stil.kennung}>{inhalt.kennung}</T>
            {inhalt.untertitel ? <T style={stil.kennungNeben}>{inhalt.untertitel}</T> : null}
          </View>
        </View>

        <View style={stil.block}>
          <T style={stil.ueberschrift}>HERKUNFT</T>
          {HERKUNFT_ZEILEN.map((zeile) => (
            <Zeile key={zeile.feld} schluessel={zeile.label} wert={inhalt[zeile.feld]} />
          ))}
        </View>

        {hatAbstammung && (
          <View style={stil.block}>
            <T style={stil.ueberschrift}>ABSTAMMUNG</T>
            {AHNEN.map((ahn) => (
              <Ahn
                key={ahn.rolle}
                rolle={ahn.rolle}
                name={inhalt[ahn.name]}
                detail={ahn.detail ? inhalt[ahn.detail] : ""}
              />
            ))}
          </View>
        )}

        <View style={stil.block}>
          <T style={stil.ueberschrift}>BEGATTUNG</T>
          {BEGATTUNG_ZEILEN.map((zeile) => (
            <Zeile key={zeile.feld} schluessel={zeile.label} wert={inhalt[zeile.feld]} />
          ))}
        </View>

        {(inhalt.beurteilung || inhalt.beurteilungKontext) && (
          <View style={stil.block}>
            <T style={stil.ueberschrift}>BEURTEILUNG</T>
            {inhalt.beurteilung ? <T style={{ marginBottom: L.beurteilungAbstand }}>{inhalt.beurteilung}</T> : null}
            {inhalt.beurteilungKontext ? <T style={stil.ahnDetail}>{inhalt.beurteilungKontext}</T> : null}
          </View>
        )}

        <View style={stil.notizen}>
          <T style={stil.ueberschrift}>BEMERKUNGEN</T>
          {inhalt.bemerkung ? <T style={{ marginBottom: L.bemerkung.abstand }}>{inhalt.bemerkung}</T> : null}
          {/* Linien zum Weiterschreiben von Hand - am Stand hat man eher einen
              Stift als das Handy in der Hand. */}
          {Array.from({ length: L.bemerkung.linienMax }, (_, index) => (
            <View key={index} style={stil.notizLinie} />
          ))}
        </View>
      </View>

      <View style={stil.fussHuelle}>
        <View style={stil.fuss}>
          {inhalt.fussName ? <T>{inhalt.fussName}</T> : null}
          {inhalt.fussRegNr ? <T>Reg.-Nr. {inhalt.fussRegNr}</T> : null}
          <T>Stand {stand}</T>
        </View>
      </View>
    </View>
  );
}

/// Kleine Kreuze in den Rändern, in Verlängerung der Schnittlinien: oben und
/// unten über bzw. unter jeder Kartengrenze (senkrechte Schnitte), links und
/// rechts auf Höhe von Ober- und Unterkante (waagerechte Schnitte). Außerhalb
/// der Karten, damit auf den ausgeschnittenen Karten nichts davon übrig
/// bleibt.
const MARKE_ABSTAND = 5 * MM; // Kreuzmitte bis Kartenkante
const MARKE_ARM = 2 * MM; // halbe Kreuzlänge

function Schnittkreuze({ anzahl, links, oben }: { anzahl: number; links: number; oben: number }) {
  const rechts = links + anzahl * KARTE_BREITE_PT;
  const unten = oben + KARTE_HOEHE_PT;

  const mitten: [number, number][] = [];
  for (let i = 0; i <= anzahl; i++) {
    const x = links + i * KARTE_BREITE_PT;
    mitten.push([x, oben - MARKE_ABSTAND], [x, unten + MARKE_ABSTAND]);
  }
  for (const y of [oben, unten]) {
    mitten.push([links - MARKE_ABSTAND, y], [rechts + MARKE_ABSTAND, y]);
  }

  return (
    <Svg width={BLATT.breite} height={BLATT.hoehe} style={{ position: "absolute", left: 0, top: 0 }}>
      {mitten.flatMap(([x, y], index) => [
        <Line
          key={`w${index}`}
          x1={x - MARKE_ARM}
          y1={y}
          x2={x + MARKE_ARM}
          y2={y}
          stroke="#000000"
          strokeWidth={0.4}
        />,
        <Line
          key={`s${index}`}
          x1={x}
          y1={y - MARKE_ARM}
          x2={x}
          y2={y + MARKE_ARM}
          stroke="#000000"
          strokeWidth={0.4}
        />,
      ])}
    </Svg>
  );
}

export type DruckKarte = { inhalt: ZuchtkarteInhalt; stand: string };

/// Ein A4-Blatt quer mit 1 bis 5 Karten, waagerecht und senkrecht mittig,
/// samt Schnittkreuzen.
export async function zuchtkartenBlattErzeugen(karten: DruckKarte[], titel: string) {
  if (karten.length < 1 || karten.length > MAX_KARTEN_PRO_BLATT) {
    throw new Error(`Ein Blatt fasst 1 bis ${MAX_KARTEN_PRO_BLATT} Karten, nicht ${karten.length}.`);
  }
  const links = (BLATT.breite - karten.length * KARTE_BREITE_PT) / 2;
  const oben = (BLATT.hoehe - KARTE_HOEHE_PT) / 2;

  return renderToBuffer(
    <Document title={titel}>
      <Page size={[BLATT.breite, BLATT.hoehe]} style={{ backgroundColor: "#ffffff" }}>
        {karten.map((karte, index) => (
          <View
            key={index}
            style={{ position: "absolute", left: links + index * KARTE_BREITE_PT, top: oben }}
          >
            <KartePdf inhalt={karte.inhalt} stand={karte.stand} />
          </View>
        ))}
        <Schnittkreuze anzahl={karten.length} links={links} oben={oben} />
      </Page>
    </Document>
  );
}
