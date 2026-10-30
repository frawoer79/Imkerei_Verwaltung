"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { anzeigeFarbe } from "@/lib/koeniginnen";
import {
  AHNEN,
  BEGATTUNG_ZEILEN,
  HERKUNFT_ZEILEN,
  KARTEN_FARBEN,
  KARTE_BREITE_PT,
  KARTE_HOEHE_PT,
  feldDefinition,
  jahrgangAlsZahl,
  kartenText,
  type KartenFeld,
  type ZuchtkarteInhalt,
} from "@/lib/zuchtkarte-inhalt";
import { LAYOUT as L } from "@/lib/zuchtkarte-layout";

// Die Zuchtkarte am Bildschirm - schreibgeschützt als Vorschau auf der Seite
// der Königin oder, mit `aendern`, direkt auf der Karte bearbeitbar.
//
// Das Aussehen steht zweimal im Code: hier für den Bildschirm und in
// lib/zuchtkarte-pdf.tsx fürs PDF. Die Maße kommen aus
// lib/zuchtkarte-layout.ts (dieselben PDF-Punkte wie dort); Farben und Aufbau
// bitte immer in beiden Dateien ändern.
//
// Gerechnet wird in einer festen, großen Größe (3 Bildschirmpixel je
// PDF-Punkt) und das Ergebnis dann per `transform` auf die verfügbare Breite
// verkleinert. Zwei Gründe: Zeilenumbrüche und Höhe sind damit auf jedem
// Gerät dieselben (nur so lässt sich zuverlässig sagen, ob alles auf die
// Karte passt), und die Eingabefelder behalten eine Schrift von mindestens
// 16px - kleinere Felder zoomt iOS Safari beim Antippen in die ganze Seite.

const S = 3; // Pixel je PDF-Punkt in der festen Größe
const px = (punkte: number) => `${(punkte * S).toFixed(3)}px`;
const BREITE_PX = KARTE_BREITE_PT * S;
const HOEHE_PX = KARTE_HOEHE_PT * S;

const { gruen: GRUEN, tinte: TINTE, grau: GRAU, linie: LINIE, rahmen: RAHMEN, hellgrau: HELLGRAU } = KARTEN_FARBEN;

type Kontext = {
  inhalt: ZuchtkarteInhalt;
  /// Gesetzt = Bearbeiten-Modus.
  aendern: ((feld: KartenFeld, wert: string) => void) | null;
};
const KarteKontext = createContext<Kontext | null>(null);

function useKarte(): Kontext {
  const kontext = useContext(KarteKontext);
  if (!kontext) throw new Error("Zuchtkarten-Bausteine gehören in <ZuchtkarteKarte>.");
  return kontext;
}

// Mehrzeilig umbrechendes Eingabefeld, das mit seinem Inhalt wächst - wie der
// gedruckte Text, nur mit gepunkteter Linie darunter (siehe .zk-feld in
// globals.css).
function EingabeFeld({ feld, wert, stil }: { feld: KartenFeld; wert: string; stil?: CSSProperties }) {
  const { aendern } = useKarte();
  const ref = useRef<HTMLTextAreaElement>(null);
  const { label, max, mehrzeilig, platzhalter } = feldDefinition(feld);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    // Höhe in ganzen Zeilen statt in gerundeten Pixeln (scrollHeight ist eine
    // ganze Zahl): sonst wäre jedes Feld einen Bruchteil zu hoch und die
    // Karte am Ende spürbar länger als gedruckt.
    element.style.height = "0px";
    const zeilenHoehe = Number.parseFloat(getComputedStyle(element).lineHeight);
    const zeilen = Math.max(1, Math.round(element.scrollHeight / zeilenHoehe));
    element.style.height = `${zeilen * zeilenHoehe}px`;
  });

  return (
    <textarea
      ref={ref}
      className="zk-feld"
      name={feld}
      rows={1}
      value={wert}
      maxLength={max}
      placeholder={platzhalter ?? "…"}
      aria-label={label}
      title={label}
      spellCheck={feld === "bemerkung"}
      autoComplete="off"
      onChange={(ereignis) => aendern?.(feld, kartenText(ereignis.target.value, feld))}
      onKeyDown={(ereignis) => {
        // Einzeilige Felder kennen keinen Zeilenumbruch - die Zeile bricht
        // von selbst um, wenn der Platz nicht reicht.
        if (ereignis.key === "Enter" && !mehrzeilig) ereignis.preventDefault();
      }}
      style={stil}
    />
  );
}

function Feld({ feld, stil }: { feld: KartenFeld; stil?: CSSProperties }) {
  const { inhalt, aendern } = useKarte();
  if (!aendern) {
    // Als Block, nicht als span: bei abweichender Schriftgröße (Kennung)
    // bestimmt sonst die Grundschrift der Umgebung die Zeilenhöhe mit.
    return <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", ...stil }}>{inhalt[feld]}</div>;
  }
  return <EingabeFeld feld={feld} wert={inhalt[feld]} stil={stil} />;
}

/// Leere Zeilen werden nicht gedruckt - beim Bearbeiten stehen sie zum
/// Ausfüllen da.
function Zeile({ feld, label }: { feld: KartenFeld; label: string }) {
  const { inhalt, aendern } = useKarte();
  if (!aendern && !inhalt[feld]) return null;
  return (
    <div style={{ display: "flex", flexShrink: 0, gap: px(L.tabelle.luecke), marginBottom: px(L.tabelle.unten) }}>
      <div style={{ width: px(L.tabelle.schluesselBreite), flexShrink: 0, color: GRAU }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Feld feld={feld} />
      </div>
    </div>
  );
}

const ueberschriftStil: CSSProperties = {
  flexShrink: 0,
  fontSize: px(L.ueberschrift.schrift),
  lineHeight: px(L.ueberschrift.zeile),
  fontWeight: 700,
  letterSpacing: px(L.ueberschrift.sperrung),
  color: GRUEN,
  marginBottom: px(L.ueberschrift.unten),
};

function Block({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        flexShrink: 0,
        padding: `${px(L.block.oben)} ${px(L.seite)} ${px(L.block.unten)}`,
        borderBottom: `${px(L.block.linie)} solid ${LINIE}`,
      }}
    >
      <div style={ueberschriftStil}>{titel}</div>
      {children}
    </div>
  );
}

function Ahn({
  rolle,
  name,
  detail,
}: {
  rolle: string;
  name: KartenFeld;
  detail: KartenFeld | null;
}) {
  const { inhalt, aendern } = useKarte();
  if (!aendern && !inhalt[name] && !(detail && inhalt[detail])) return null;
  return (
    <div
      style={{
        flexShrink: 0,
        borderLeft: `${px(L.ahn.linie)} solid ${RAHMEN}`,
        paddingLeft: px(L.ahn.links),
        marginBottom: px(L.ahn.unten),
      }}
    >
      <div
        style={{
          fontSize: px(L.ahn.rolleSchrift),
          lineHeight: px(L.ahn.rolleZeile),
          letterSpacing: px(L.ahn.rolleSperrung),
          color: HELLGRAU,
        }}
      >
        {rolle}
      </div>
      {(aendern || inhalt[name]) && <Feld feld={name} stil={{ fontWeight: 700 }} />}
      {detail && (aendern || inhalt[detail]) && <Feld feld={detail} stil={{ color: GRAU }} />}
    </div>
  );
}

/// Die Karte selbst in fester Größe, unverkleinert. Beim Bearbeiten wächst sie
/// mit, wenn die leeren Zeilen zum Ausfüllen mehr Platz brauchen als das
/// Papier; schreibgeschützt hat sie genau das Papiermaß und schneidet ab.
function Karte({
  inhalt,
  stand,
  aendern,
  karteRef,
}: {
  inhalt: ZuchtkarteInhalt;
  stand: string;
  aendern: ((feld: KartenFeld, wert: string) => void) | null;
  karteRef?: React.Ref<HTMLDivElement>;
}) {
  const farbe = anzeigeFarbe(jahrgangAlsZahl(inhalt), inhalt.zeichen);
  const hatAbstammung = AHNEN.some((ahn) => inhalt[ahn.name] || (ahn.detail && inhalt[ahn.detail]));

  return (
    <KarteKontext.Provider value={{ inhalt, aendern }}>
      <div
        ref={karteRef}
        style={{
          width: BREITE_PX,
          height: aendern ? undefined : HOEHE_PX,
          minHeight: HOEHE_PX,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: aendern ? "visible" : "hidden",
          border: `${px(L.rahmen)} solid ${RAHMEN}`,
          background: "#ffffff",
          color: TINTE,
          // Helvetica wie im PDF; Arial und Liberation Sans haben
          // dieselben Zeichenbreiten.
          fontFamily: 'Helvetica, Arial, "Liberation Sans", Arimo, sans-serif',
          fontSize: px(L.schrift),
          lineHeight: px(L.zeile),
          textRendering: "geometricPrecision",
          textAlign: "left",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            background: GRUEN,
            color: "#ffffff",
            padding: `${px(L.kopf.oben)} ${px(L.seite)} ${px(L.kopf.unten)}`,
          }}
        >
          <div
            style={{
              fontSize: px(L.kopf.betriebSchrift),
              lineHeight: px(L.kopf.betriebZeile),
              letterSpacing: px(L.kopf.betriebSperrung),
              textTransform: "uppercase",
            }}
          >
            {aendern ? <Feld feld="kopfzeile" /> : inhalt.kopfzeile || "Imkerei"}
          </div>
          <div
            style={{
              fontSize: px(L.kopf.titelSchrift),
              lineHeight: px(L.kopf.titelZeile),
              fontWeight: 700,
              marginTop: px(L.kopf.titelOben),
            }}
          >
            Zuchtkarte
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: px(L.ident.abstand),
            padding: `${px(L.ident.oben)} ${px(L.seite)} ${px(L.ident.unten)}`,
            borderBottom: `${px(L.ident.linie)} solid ${TINTE}`,
          }}
        >
          <div
            style={{
              width: px(L.ident.punkt),
              height: px(L.ident.punkt),
              flexShrink: 0,
              boxSizing: "border-box",
              borderRadius: "50%",
              border: `${px(L.ident.punktRand)} solid ${TINTE}`,
              background: farbe?.hex ?? "#ffffff",
              color: farbe?.dunklerText === false ? "#ffffff" : TINTE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: px(L.ident.punktSchrift),
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {aendern ? (
              <Feld feld="jahrgang" stil={{ textAlign: "center", width: px(20) }} />
            ) : (
              inhalt.jahrgang || "--"
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Feld
              feld="kennung"
              stil={{ fontSize: px(L.ident.kennungSchrift), fontWeight: 700, lineHeight: px(L.ident.kennungZeile) }}
            />
            {(aendern || inhalt.untertitel) && (
              <div style={{ marginTop: px(L.ident.untertitelOben), color: GRAU }}>
                <Feld feld="untertitel" />
              </div>
            )}
          </div>
        </div>

        <Block titel="HERKUNFT">
          {HERKUNFT_ZEILEN.map((zeile) => (
            <Zeile key={zeile.feld} feld={zeile.feld} label={zeile.label} />
          ))}
        </Block>

        {(aendern || hatAbstammung) && (
          <Block titel="ABSTAMMUNG">
            {AHNEN.map((ahn) => (
              <Ahn key={ahn.rolle} rolle={ahn.rolle} name={ahn.name} detail={ahn.detail} />
            ))}
          </Block>
        )}

        <Block titel="BEGATTUNG">
          {BEGATTUNG_ZEILEN.map((zeile) => (
            <Zeile key={zeile.feld} feld={zeile.feld} label={zeile.label} />
          ))}
        </Block>

        {(aendern || inhalt.beurteilung || inhalt.beurteilungKontext) && (
          <Block titel="BEURTEILUNG">
            {(aendern || inhalt.beurteilung) && (
              <div style={{ marginBottom: px(L.beurteilungAbstand) }}>
                <Feld feld="beurteilung" />
              </div>
            )}
            {(aendern || inhalt.beurteilungKontext) && (
              <div style={{ color: GRAU }}>
                <Feld feld="beurteilungKontext" />
              </div>
            )}
          </Block>
        )}

        {/* Bemerkungen füllen den Rest der Karte; die Linien darunter nehmen
            den Platz, der übrig bleibt, und werden abgeschnitten. */}
        <div
          style={{
            flex: "1 0 auto",
            display: "flex",
            flexDirection: "column",
            padding: `${px(L.block.oben)} ${px(L.seite)} ${px(L.block.unten)}`,
          }}
        >
          <div style={ueberschriftStil}>BEMERKUNGEN</div>
          {(aendern || inhalt.bemerkung) && (
            <div style={{ flexShrink: 0, marginBottom: px(L.bemerkung.abstand) }}>
              <Feld feld="bemerkung" />
            </div>
          )}
          {/* Linien zum Weiterschreiben von Hand */}
          <div data-zk-linien="" style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
            {Array.from({ length: L.bemerkung.linienMax }, (_, index) => (
              <div
                key={index}
                style={{
                  height: px(L.bemerkung.linienHoehe),
                  boxSizing: "border-box",
                  borderBottom: `${px(L.block.linie)} solid ${LINIE}`,
                }}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            padding: `${px(L.fuss.oben)} ${px(L.seite)} ${px(L.fuss.unten)}`,
            borderTop: `${px(L.fuss.linie)} solid ${TINTE}`,
            fontSize: px(L.fuss.schrift),
            lineHeight: px(L.fuss.zeile),
            color: GRAU,
          }}
        >
          {(aendern || inhalt.fussName) && <Feld feld="fussName" />}
          {(aendern || inhalt.fussRegNr) && (
            <div style={{ display: "flex", gap: px(1.5) }}>
              <div style={{ flexShrink: 0 }}>Reg.-Nr.</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Feld feld="fussRegNr" />
              </div>
            </div>
          )}
          <div>Stand {stand}</div>
        </div>
      </div>
    </KarteKontext.Provider>
  );
}

export function ZuchtkarteKarte({
  inhalt,
  stand,
  aendern = null,
  onUeberlauf,
  maxBreitePx = 390,
}: {
  inhalt: ZuchtkarteInhalt;
  /// Datum für den Fuß, z.B. "03.10.2026".
  stand: string;
  /// Bearbeiten-Modus: wird bei jeder Änderung eines Felds aufgerufen. Die
  /// Felder tragen dann ihr Schlüsselwort als `name`, ein umgebendes Formular
  /// sendet sie also direkt mit.
  aendern?: ((feld: KartenFeld, wert: string) => void) | null;
  /// Nur beim Bearbeiten: meldet nach jeder Änderung, ob der Inhalt gedruckt
  /// über den unteren Rand der Karte hinausläuft (dann fehlt der Fuß).
  onUeberlauf?: (ueberlauf: boolean) => void;
  /// Größte Breite am Bildschirm; bei weniger Platz wird die Karte kleiner.
  maxBreitePx?: number;
}) {
  const aeusseresRef = useRef<HTMLDivElement>(null);
  const karteRef = useRef<HTMLDivElement>(null);
  const messkarteRef = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(maxBreitePx / BREITE_PX);
  const [hoehePx, setHoehePx] = useState(HOEHE_PX);

  useLayoutEffect(() => {
    const element = aeusseresRef.current;
    if (!element) return;
    const messen = () => {
      const breite = element.clientWidth;
      // Unsichtbar (z.B. am Handy hinter dem Knopf) hat keine Breite - dann
      // den letzten Wert behalten statt auf null zu schrumpfen.
      if (breite > 0) setSkala(Math.min(maxBreitePx, breite) / BREITE_PX);
    };
    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(element);
    return () => beobachter.disconnect();
  }, [maxBreitePx]);

  useLayoutEffect(() => {
    // Beim Bearbeiten ist die Karte so hoch wie ihr Inhalt, mindestens aber
    // so hoch wie das Papier; der Rahmen drumherum muss das mitmachen. Die
    // Höhe ändert sich nur, wenn sich der Inhalt ändert (die Texte der Felder
    // passen ihre Zeilenzahl in ihren eigenen Effekten vorher an).
    const karte = karteRef.current;
    if (karte && aendern) setHoehePx(Math.max(HOEHE_PX, karte.offsetHeight));
  }, [aendern, inhalt]);

  useLayoutEffect(() => {
    // Ob alles aufs Papier passt, zeigt eine unsichtbare Zweitkarte im Layout
    // des Drucks (ohne die leeren Zeilen zum Ausfüllen). Der Bemerkungsblock
    // füllt dort den Rest der Karte, die Linien darin den Rest davon: bleibt
    // für sie nichts mehr übrig, ist die Karte voll oder zu voll. Eine
    // Reserve von einem Punkt fängt Rundungsunterschiede zum PDF ab (die
    // Voransicht rechnet den Umbruch eher etwas großzügiger als das PDF).
    const mess = messkarteRef.current;
    if (!mess || !onUeberlauf) return;
    const linien = mess.querySelector("[data-zk-linien]");
    if (!linien) return;
    onUeberlauf(linien.getBoundingClientRect().height < S);
  });

  const hoehe = aendern ? hoehePx : HOEHE_PX;

  return (
    <div
      ref={aeusseresRef}
      style={{ position: "relative", width: "100%", maxWidth: maxBreitePx, overflowX: "clip" }}
    >
      <div style={{ width: BREITE_PX * skala, height: hoehe * skala }}>
        <div style={{ width: BREITE_PX, transform: `scale(${skala})`, transformOrigin: "top left" }}>
          <Karte inhalt={inhalt} stand={stand} aendern={aendern} karteRef={karteRef} />
        </div>
      </div>
      {aendern && onUeberlauf && (
        // Weit links außerhalb des Bildschirms, nicht nur versteckt: nach links
        // wächst die Seite nicht in die Breite, ältere Browser ohne
        // `overflow-x: clip` am Rahmen würden sonst am Handy seitlich scrollen.
        <div
          aria-hidden
          inert
          style={{ position: "absolute", top: 0, left: -10000, width: BREITE_PX, height: 0, overflow: "hidden", visibility: "hidden" }}
        >
          <Karte inhalt={inhalt} stand={stand} aendern={null} karteRef={messkarteRef} />
        </div>
      )}
    </div>
  );
}
