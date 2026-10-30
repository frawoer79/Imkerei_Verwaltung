"use client";

import Link from "next/link";
import { heuteAlsInputWert } from "@/lib/datum";
import { useEffect, useRef, useState } from "react";
import { Button, Input, Label, SortierWahl, WahlChip, Zwischenkopf } from "@/components/ui";
import { GebindeNeuFelder, GebindeSymbol } from "@/components/gebinde";
import { GEBINDE_ART_NAME, gebindeArt, gebindeGruppen, gebindeNameVoll, groesseKurz, loseName, type GebindeArt } from "@/lib/gebinde";
import { euro, jeStueck, postenWert, preisFeld, preisFuer, wertSumme } from "@/lib/warenwert";
import { bestaetigen } from "@/lib/bestaetigen";
import { LagerortAuswahl } from "@/components/lagerort-auswahl";
import { FormularFehler, SicheresFormular, SpeichernKnopf, type AktionsErgebnis } from "@/components/sicheres-formular";
import { kurzesDatum, runden } from "@/lib/honig";
import { HONIG_ZUSTAENDE, sorteMitZustand, zustandText } from "@/lib/honig-zustand";
import type { EimerAnzeige, ErzeugnisBestand, ErzeugnisBestandGruppe, LagerortAnzeige } from "@/lib/lager";
import { postenGruppieren, useLagerOrdnung, type LagerOrdnung, type PostenGruppe } from "@/lib/lager-ordnung";
import { abfuellenAufteilen, glaeserVorschlag, istEimerGebinde, type EimerEinheit } from "@/lib/eimer";

type BuchungsAktion = (formData: FormData) => Promise<AktionsErgebnis>;
type LoeschenAktion = (id: string) => Promise<void>;

// Stückzahlen ohne Komma ("45 Stück"), Gewichte mit einer Stelle ("4,0 kg").
function stellen(einheit?: string): number {
  return einheit && einheit.toLowerCase() === "stück" ? 0 : 1;
}

function mengeAnzeige(menge: number, einheit?: string): string {
  const mindestens = stellen(einheit);
  return (mindestens === 0 ? Math.round(menge * 10) / 10 : runden(menge)).toLocaleString("de-DE", {
    minimumFractionDigits: mindestens,
    maximumFractionDigits: 1,
  });
}

// Wie mengeAnzeige, aber bis auf Gramm genau - für einzelne Buchungen und
// die Gebinde-Rechnung (z.B. 3 × Glas 125 g = 0,375 kg statt 0,4 kg).
function mengeGenau(menge: number, einheit?: string): string {
  return menge.toLocaleString("de-DE", { minimumFractionDigits: stellen(einheit), maximumFractionDigits: 3 });
}

function LoeschKnopf({ aktion, id, beschriftung }: { aktion: LoeschenAktion; id: string; beschriftung: string }) {
  return (
    <form action={aktion.bind(null, id)}>
      <button
        type="submit"
        aria-label={beschriftung}
        className="flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-card hover:text-gefahr"
      >
        ✕
      </button>
    </form>
  );
}

// Gängige Gründe als Tipp-Chips. Gespeichert wird weiter nur der Text (Feld
// `grund`), ältere frei getippte Gründe bleiben so unverändert sichtbar;
// "Sonstiges" öffnet ein Freitextfeld. Abfüllen beim Auslagern ist kein
// reiner Grund, sondern schaltet den Dialog auf die Abfüll-Rechnung um.
const GRUENDE_EIN = ["Ernte", "Zukauf", "Bestandskorrektur"];
// Seltene Gründe beim Einlagern - erst nach "Sonstiges" als Vorschlag.
const GRUENDE_EIN_SELTEN = ["Zurück vom Verkauf"];
const GRUENDE_AUS = ["Verkauf", "Eigenbedarf", "Geschenk", "Verfüttern", "Bestandskorrektur"];
const ABFUELLEN = "__abfuellen__";
const SONSTIGES = "__sonstiges__";
const LOSE = "__lose__";
const NEU = "__neu__";

export function istHonig(typ: { name: string } | null | undefined): boolean {
  return typ?.name.toLowerCase() === "honig";
}

function postenSchluessel(posten: ErzeugnisBestandGruppe): string {
  return [posten.sorteId, posten.zustand, posten.gebindeId, posten.lagerortId].map((teil) => teil ?? "").join("|");
}

function stueckWort(gebindeName: string | null, anzahl: number): string {
  if (gebindeName && /glas/i.test(gebindeName)) return anzahl === 1 ? "Glas" : "Gläser";
  return "Stück";
}

function SymbolKachel({ name }: { name: string | null }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-accent">
      <GebindeSymbol name={name} />
    </span>
  );
}

// Summe einer Gruppe: nach Gebinde mit Stückzahl, nach Sorte nur die Menge.
function gruppenSumme(gruppe: PostenGruppe, ordnung: LagerOrdnung, einheit: string): string {
  const stueck = ordnung === "gebinde" && gruppe.anzahl !== null ? `${gruppe.anzahl} Stück · ` : "";
  return `${stueck}${mengeGenau(gruppe.menge, einheit)} ${einheit}`;
}

const ORDNUNGEN: { wert: LagerOrdnung; name: string }[] = [
  { wert: "sorte", name: "Sorte" },
  { wert: "gebinde", name: "Gebinde" },
];

function FeldTitel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-sm font-medium text-muted">{children}</p>;
}

// Stückzahl mit − und +, die Zahl lässt sich auch direkt eintippen.
function Zaehler({
  id,
  name,
  wert,
  setWert,
  min,
  max,
  beschriftung,
}: {
  id: string;
  name: string;
  wert: number;
  setWert: (wert: number) => void;
  min: number;
  max?: number;
  beschriftung: string;
}) {
  const begrenzen = (zahl: number) => Math.max(min, max === undefined ? zahl : Math.min(max, zahl));
  return (
    <div className="flex w-max items-stretch overflow-hidden rounded-lg border border-rand-bedienung">
      <button
        type="button"
        aria-label={`${beschriftung}: eins weniger`}
        onClick={() => setWert(begrenzen(wert - 1))}
        disabled={wert <= min}
        className="h-11 w-11 bg-background text-xl disabled:opacity-40"
      >
        −
      </button>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        aria-label={beschriftung}
        value={Number.isNaN(wert) ? "" : wert}
        onChange={(event) => setWert(begrenzen(Math.round(Number(event.target.value) || 0)))}
        className="w-16 bg-card text-center text-lg font-semibold tabular-nums outline-none [appearance:textfield] focus:ring-1 focus:ring-accent [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={`${beschriftung}: eins mehr`}
        onClick={() => setWert(begrenzen(wert + 1))}
        disabled={max !== undefined && wert >= max}
        className="h-11 w-11 bg-background text-xl disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

// Datum: Vorgabe heute, nur auf Wunsch ein Datumsfeld.
function DatumFeld({ idPrefix }: { idPrefix: string }) {
  const [aendern, setAendern] = useState(false);
  const heute = heuteAlsInputWert();
  if (aendern) {
    return (
      <div>
        <Label htmlFor={`${idPrefix}-datum`}>Datum</Label>
        <Input id={`${idPrefix}-datum`} name="datum" type="date" defaultValue={heute} autoFocus />
      </div>
    );
  }
  const [jahr, monat, tag] = heute.split("-");
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted">
      <input type="hidden" name="datum" value={heute} />
      <span>
        Heute, {tag}.{monat}.{jahr}
      </span>
      <button type="button" onClick={() => setAendern(true)} className="min-h-10 text-accent hover:underline">
        Datum ändern
      </button>
    </div>
  );
}

// Grund als Chips, "Sonstiges" mit Freitext. Gesendet wird ein einziges
// verstecktes Feld `grund`.
function GrundWahl({
  idPrefix,
  gruende,
  wahl,
  setWahl,
  zusatz,
  vorschlaege = [],
}: {
  idPrefix: string;
  gruende: string[];
  wahl: string;
  setWahl: (wahl: string) => void;
  zusatz?: { wert: string; text: string };
  vorschlaege?: string[];
}) {
  const [freitext, setFreitext] = useState("");
  return (
    <div>
      <FeldTitel>Grund</FeldTitel>
      <div className="flex flex-wrap gap-2">
        {gruende.map((grund) => (
          <WahlChip key={grund} gruppe={`${idPrefix}-grund`} aktiv={wahl === grund} onWahl={() => setWahl(grund)}>
            {grund}
          </WahlChip>
        ))}
        {zusatz && (
          <WahlChip gruppe={`${idPrefix}-grund`} aktiv={wahl === zusatz.wert} onWahl={() => setWahl(zusatz.wert)}>
            {zusatz.text}
          </WahlChip>
        )}
        <WahlChip gruppe={`${idPrefix}-grund`} aktiv={wahl === SONSTIGES} onWahl={() => setWahl(SONSTIGES)}>
          Sonstiges …
        </WahlChip>
      </div>
      {wahl === SONSTIGES && vorschlaege.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {vorschlaege.map((vorschlag) => (
            <WahlChip
              key={vorschlag}
              gruppe={`${idPrefix}-grund-vorschlag`}
              aktiv={freitext === vorschlag}
              onWahl={() => setFreitext(vorschlag)}
            >
              {vorschlag}
            </WahlChip>
          ))}
        </div>
      )}
      {wahl === SONSTIGES && (
        <Input
          aria-label="Eigener Grund"
          placeholder="z.B. Verkauf an Familie Maier"
          value={freitext}
          onChange={(event) => setFreitext(event.target.value)}
          required
          autoFocus
          className="mt-2"
        />
      )}
      {wahl !== zusatz?.wert && <input type="hidden" name="grund" value={wahl === SONSTIGES ? freitext : wahl} />}
    </div>
  );
}

function ZustandWahl({ idPrefix, wahl, setWahl }: { idPrefix: string; wahl: string; setWahl: (wahl: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <WahlChip gruppe={`${idPrefix}-zustand`} aktiv={wahl === ""} onWahl={() => setWahl("")}>
        Keine Angabe
      </WahlChip>
      {Object.entries(HONIG_ZUSTAENDE).map(([wert, text]) => (
        <WahlChip key={wert} gruppe={`${idPrefix}-zustand`} aktiv={wahl === wert} onWahl={() => setWahl(wert)}>
          {text.charAt(0).toUpperCase() + text.slice(1)}
        </WahlChip>
      ))}
    </div>
  );
}

// Natives <dialog>, mittig (siehe dialog:modal in globals.css). Der Inhalt
// entsteht bei jedem Öffnen neu, damit keine alten Eingaben stehen bleiben.
function LagerDialog({
  offen,
  schliessen,
  titel,
  untertitel,
  symbol,
  children,
}: {
  offen: boolean;
  schliessen: () => void;
  titel: string;
  untertitel?: string;
  symbol?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (offen && !dialog.open) dialog.showModal();
    if (!offen && dialog.open) dialog.close();
  }, [offen]);

  return (
    <dialog
      ref={ref}
      onClose={schliessen}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
    >
      {offen && (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            {symbol}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">{titel}</h2>
              {untertitel && <p className="text-sm text-muted">{untertitel}</p>}
            </div>
            <button
              type="button"
              onClick={schliessen}
              aria-label="Schließen"
              className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

function postenTitel(posten: ErzeugnisBestandGruppe, einheit: string): string {
  return posten.gebindeName ?? loseName(einheit);
}

// `ohneSorte`: die Sorte steht schon in der Zwischenüberschrift.
function postenUntertitel(posten: ErzeugnisBestandGruppe, ohneSorte = false): string {
  return [ohneSorte ? null : posten.sorteName, zustandText(posten.zustand), posten.lagerortName]
    .filter(Boolean)
    .join(" · ");
}

function PostenFelder({ typ, posten }: { typ: ErzeugnisBestand; posten: ErzeugnisBestandGruppe }) {
  return (
    <>
      <input type="hidden" name="erzeugnistypId" value={typ.id} />
      <input type="hidden" name="sorteId" value={posten.sorteId ?? ""} />
      <input type="hidden" name="zustand" value={posten.zustand ?? ""} />
      <input type="hidden" name="gebindeId" value={posten.gebindeId ?? ""} />
      <input type="hidden" name="lagerortId" value={posten.lagerortId ?? ""} />
    </>
  );
}

// Ist dieser Posten ein Eimer-Posten mit einzeln geführten Gewichten?
function eimerEinzeln(typ: ErzeugnisBestand, posten: ErzeugnisBestandGruppe): boolean {
  return typ.eimerEinzeln && posten.gebindeId !== null && istEimerGebinde(posten.gebindeName);
}

function eimerInfo(eimer: EimerAnzeige, einheit: string): string {
  const angebrochen = eimer.gewicht < eimer.eingelagert - 0.0005;
  return `eingelagert ${kurzesDatum(eimer.eingelagertAm)}${
    angebrochen ? ` · angebrochen, war ${mengeGenau(eimer.eingelagert, einheit)} ${einheit}` : ""
  }`;
}

function aufGramm(menge: number): number {
  return Math.round(menge * 1000) / 1000;
}

// Gewählte Eimer in der Reihenfolge, in der auch der Server sie leert:
// einzeln geführte nach Nummer, dann die ohne Einzelgewicht mit Nennwert.
function gewaehlteEinheiten(posten: ErzeugnisBestandGruppe, ids: string[], ohneAnzahl: number): EimerEinheit[] {
  return [
    ...posten.eimer
      .filter((eimer) => ids.includes(eimer.id))
      .map((eimer) => ({ eimerId: eimer.id, nummer: eimer.nummer, gewicht: eimer.gewicht })),
    ...Array.from({ length: ohneAnzahl }, () => ({ eimerId: null, nummer: null, gewicht: posten.gebindeInhalt ?? 0 })),
  ];
}

function eimerName(einheit: { nummer: number | null }): string {
  return einheit.nummer === null ? "ohne Nummer" : `Nr. ${einheit.nummer}`;
}

// Eimer zum Auslagern oder Abfüllen anhaken, mit Summe des echten Gewichts.
function EimerWahl({
  posten,
  einheit,
  gewaehlt,
  ohneAnzahl,
  aendern,
}: {
  posten: ErzeugnisBestandGruppe;
  einheit: string;
  gewaehlt: string[];
  ohneAnzahl: number;
  aendern: (ids: string[], ohneAnzahl: number) => void;
}) {
  const auswahl = gewaehlteEinheiten(posten, gewaehlt, ohneAnzahl);
  const summe = aufGramm(auswahl.reduce((gesamt, eintrag) => gesamt + eintrag.gewicht, 0));
  return (
    <div>
      <FeldTitel>Welche Eimer?</FeldTitel>
      <input type="hidden" name="eimerAuswahl" value="ja" />
      <div className="flex flex-col gap-1.5">
        {posten.eimer.map((eimer) => {
          const an = gewaehlt.includes(eimer.id);
          return (
            <label
              key={eimer.id}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-1.5 text-sm ${
                an ? "border-accent bg-card" : "border-border bg-background"
              }`}
            >
              <input
                type="checkbox"
                name="eimerId"
                value={eimer.id}
                checked={an}
                onChange={() =>
                  aendern(an ? gewaehlt.filter((id) => id !== eimer.id) : [...gewaehlt, eimer.id], ohneAnzahl)
                }
                className="h-5 w-5 shrink-0 accent-[var(--accent)]"
              />
              <span className="shrink-0 font-semibold">Nr. {eimer.nummer}</span>
              <span className="min-w-0 flex-1 text-xs text-muted">{eimerInfo(eimer, einheit)}</span>
              <span className="shrink-0 font-semibold tabular-nums">
                {mengeGenau(eimer.gewicht, einheit)} {einheit}
              </span>
            </label>
          );
        })}
        {posten.ohneEinzelgewicht > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-rand-ruhig px-3 py-1.5 text-sm">
            <span className="min-w-0 flex-1">
              Ohne Einzelgewicht
              <span className="block text-xs text-muted">
                je {mengeGenau(posten.gebindeInhalt ?? 0, einheit)} {einheit}, {posten.ohneEinzelgewicht} auf Lager
              </span>
            </span>
            <Zaehler
              id="ohne-einzelgewicht"
              name="ohneEinzelgewicht"
              wert={ohneAnzahl}
              setWert={(wert) => aendern(gewaehlt, wert)}
              min={0}
              max={posten.ohneEinzelgewicht}
              beschriftung="Eimer ohne Einzelgewicht"
            />
          </div>
        )}
      </div>
      <p className="mt-1.5 flex justify-between gap-2 text-sm text-muted">
        <span>
          {auswahl.length} Eimer gewählt
        </span>
        <span className="font-semibold tabular-nums text-foreground">
          {mengeGenau(summe, einheit)} {einheit}
        </span>
      </p>
    </div>
  );
}

// Auslagern von genau diesem Posten (z.B. "Eimer 25 kg · Frühtracht ·
// Keller"): Anzahl und Grund, Datum heute. Mit "Abfüllen" wird daraus ein
// Abfüll-Vorgang in kleinere Gebinde, die App rechnet Eimer und Rest aus.
function AuslagernDialog({
  typ,
  posten,
  auslagern,
  abfuellen,
  schliessen,
}: {
  typ: ErzeugnisBestand;
  posten: ErzeugnisBestandGruppe;
  auslagern: BuchungsAktion;
  abfuellen: BuchungsAktion;
  schliessen: () => void;
}) {
  const mitGebinde = posten.gebindeId !== null;
  const bestandStueck = Math.max(posten.anzahl ?? 0, 0);
  const bestandMenge = Math.max(posten.menge, 0);
  const einheit = typ.einheit;

  const [grund, setGrund] = useState(GRUENDE_AUS[0]);
  const [anzahl, setAnzahl] = useState(1);
  const [mengeText, setMengeText] = useState("");

  const zielGebinde = typ.gebinde.filter(
    (gebinde) =>
      gebinde.id !== posten.gebindeId && (posten.gebindeInhalt === null || gebinde.inhalt < posten.gebindeInhalt),
  );
  const abfuellenMoeglich = zielGebinde.length > 0;
  const istAbfuellen = grund === ABFUELLEN;
  const [ziele, setZiele] = useState<Record<string, number>>({});
  const [zielZustand, setZielZustand] = useState(posten.zustand ?? "");

  const abgefuellt =
    Math.round(zielGebinde.reduce((summe, gebinde) => summe + gebinde.inhalt * (ziele[gebinde.id] ?? 0), 0) * 1000) /
    1000;
  const eimerNoetig = mitGebinde && posten.gebindeInhalt ? Math.ceil(abgefuellt / posten.gebindeInhalt - 0.0005) : 0;
  const rest = mitGebinde && posten.gebindeInhalt ? Math.round((eimerNoetig * posten.gebindeInhalt - abgefuellt) * 1000) / 1000 : 0;
  const zuViel = istAbfuellen && (mitGebinde ? eimerNoetig > bestandStueck : abgefuellt > bestandMenge + 0.0005);

  const menge = Number(mengeText.replace(",", "."));
  const mengeZuViel = !mitGebinde && menge > bestandMenge + 0.0005;

  // Einzeln geführte Eimer: statt einer Anzahl hakt man die Eimer an. Beim
  // Abfüllen schlägt die App aus deren Gewicht die Gläser vor.
  const einzeln = eimerEinzeln(typ, posten);
  const [gewaehlt, setGewaehlt] = useState<string[]>([]);
  const [ohneAnzahl, setOhneAnzahl] = useState(0);
  const einheiten = gewaehlteEinheiten(posten, gewaehlt, ohneAnzahl);
  const gewaehltMenge = aufGramm(einheiten.reduce((summe, eintrag) => summe + eintrag.gewicht, 0));
  const glaeser = zielGebinde.filter((gebinde) => !istEimerGebinde(gebinde.name));
  function auswahlAendern(ids: string[], ohne: number) {
    setGewaehlt(ids);
    setOhneAnzahl(ohne);
    const neu = gewaehlteEinheiten(posten, ids, ohne);
    setZiele(glaeserVorschlag(neu.reduce((summe, eintrag) => summe + eintrag.gewicht, 0), glaeser));
  }
  const aufteilung = abfuellenAufteilen(einheiten, abgefuellt);
  const angebrochen = aufteilung.anteile.find((anteil) => anteil.rest >= 0.0005);
  const [restWahl, setRestWahl] = useState<"eimer" | "gewicht" | "schwund">("eimer");
  const restArt = restWahl === "eimer" && !angebrochen?.eimerId ? "gewicht" : restWahl;
  const einzelnZuViel = einzeln && istAbfuellen && aufteilung.fehlt > 0;

  let hinweis: string;
  let knopf: string;
  if (einzeln && istAbfuellen) {
    knopf = "Abfüllen buchen";
    const leer = aufteilung.anteile.filter((anteil) => anteil !== angebrochen);
    const ungenutzt = einheiten.length - aufteilung.anteile.length;
    if (einheiten.length === 0) {
      hinweis = "Wähl die Eimer, die du abfüllst.";
    } else if (abgefuellt === 0) {
      hinweis = "Trag ein, wie viele Gläser du abfüllst.";
    } else if (einzelnZuViel) {
      hinweis = `Das sind ${mengeGenau(abgefuellt, einheit)} ${einheit}, in den gewählten Eimern sind nur ${mengeGenau(gewaehltMenge, einheit)} ${einheit}.`;
    } else {
      const teile = [`${mengeGenau(abgefuellt, einheit)} ${einheit} abgefüllt.`];
      if (leer.length > 0) teile.push(`Leer: ${leer.map(eimerName).join(", ")}.`);
      if (angebrochen) {
        teile.push(
          restArt === "eimer"
            ? `${mengeGenau(angebrochen.rest, einheit)} ${einheit} bleiben in Eimer ${eimerName(angebrochen)}.`
            : restArt === "schwund"
              ? `${mengeGenau(angebrochen.rest, einheit)} ${einheit} Rest werden als Schwund ausgebucht.`
              : `${mengeGenau(angebrochen.rest, einheit)} ${einheit} Rest kommen unter „${loseName(einheit)}“.`,
        );
      }
      if (ungenutzt > 0) teile.push(`${ungenutzt} gewählte${ungenutzt === 1 ? "r" : ""} Eimer bleib${ungenutzt === 1 ? "t" : "en"} unberührt.`);
      hinweis = teile.join(" ");
    }
  } else if (einzeln) {
    const bleibt = bestandStueck - einheiten.length;
    knopf =
      einheiten.length === 0
        ? "Eimer wählen"
        : `${einheiten.length === 1 && einheiten[0].nummer !== null ? `Eimer Nr. ${einheiten[0].nummer}` : `${einheiten.length} Eimer`} auslagern · ${mengeGenau(gewaehltMenge, einheit)} ${einheit}`;
    hinweis =
      einheiten.length === 0
        ? "Hak die Eimer an, die rausgehen."
        : bleibt > 0
          ? `Danach noch ${bleibt} Eimer mit ${mengeGenau(aufGramm(posten.menge - gewaehltMenge), einheit)} ${einheit}.`
          : "Danach ist dieser Posten leer.";
  } else if (istAbfuellen) {
    knopf = "Abfüllen buchen";
    if (abgefuellt === 0) {
      hinweis = "Trag ein, wie viele Gebinde du abfüllst.";
    } else if (zuViel) {
      hinweis = mitGebinde
        ? `Dafür braucht es ${eimerNoetig} × ${posten.gebindeName}, auf Lager ${bestandStueck === 1 ? "ist" : "sind"} nur ${bestandStueck}.`
        : `Das sind ${mengeGenau(abgefuellt, einheit)} ${einheit}, auf Lager ${mengeGenau(bestandMenge, einheit)} ${einheit}.`;
    } else if (mitGebinde) {
      hinweis = `${mengeGenau(abgefuellt, einheit)} ${einheit} abgefüllt: ${eimerNoetig} × ${posten.gebindeName} ${
        eimerNoetig === 1 ? "wird" : "werden"
      } ausgelagert${rest > 0 ? `, ${mengeGenau(rest, einheit)} ${einheit} Rest bleiben unter „${loseName(einheit)}“ im Lager` : ""}.`;
    } else {
      hinweis = `${mengeGenau(abgefuellt, einheit)} ${einheit} abgefüllt, danach noch ${mengeGenau(
        Math.round((bestandMenge - abgefuellt) * 1000) / 1000,
        einheit,
      )} ${einheit} im Lager.`;
    }
  } else if (mitGebinde) {
    const bleibt = bestandStueck - anzahl;
    const wort = stueckWort(posten.gebindeName, anzahl);
    knopf = wort === "Stück" ? `${anzahl} × ${posten.gebindeName} auslagern` : `${anzahl} ${wort} auslagern`;
    hinweis =
      bleibt > 0
        ? `Danach noch ${bleibt} × ${posten.gebindeName}${posten.lagerortName ? ` im Lagerort ${posten.lagerortName}` : ""}.`
        : "Danach ist dieser Posten leer.";
  } else {
    knopf = menge > 0 ? `${mengeGenau(menge, einheit)} ${einheit} auslagern` : "Auslagern";
    hinweis = mengeZuViel
      ? `Auf Lager sind nur ${mengeGenau(bestandMenge, einheit)} ${einheit}.`
      : `Auf Lager: ${mengeGenau(bestandMenge, einheit)} ${einheit}.`;
  }

  return (
    <SicheresFormular action={istAbfuellen ? abfuellen : auslagern} beiErfolg={schliessen} className="flex flex-col gap-4">
      <PostenFelder typ={typ} posten={posten} />

      {einzeln && (
        <EimerWahl posten={posten} einheit={einheit} gewaehlt={gewaehlt} ohneAnzahl={ohneAnzahl} aendern={auswahlAendern} />
      )}

      {!istAbfuellen &&
        !einzeln &&
        (mitGebinde ? (
          <div>
            <FeldTitel>
              Wie viele? <span className="font-normal">({bestandStueck} auf Lager)</span>
            </FeldTitel>
            <div className="flex items-center gap-3">
              <Zaehler
                id="auslagern-anzahl"
                name="anzahl"
                wert={anzahl}
                setWert={setAnzahl}
                min={1}
                max={bestandStueck}
                beschriftung="Anzahl"
              />
              {posten.gebindeInhalt !== null && (
                <span className="text-sm tabular-nums text-muted">
                  = {mengeGenau(Math.round(anzahl * posten.gebindeInhalt * 1000) / 1000, einheit)} {einheit}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="w-40">
            <Label htmlFor="auslagern-menge">Menge ({einheit})</Label>
            <Input
              id="auslagern-menge"
              name="menge"
              type="number"
              step="0.001"
              min="0"
              max={bestandMenge}
              inputMode="decimal"
              required
              autoFocus
              value={mengeText}
              onChange={(event) => setMengeText(event.target.value)}
            />
          </div>
        ))}

      <GrundWahl
        idPrefix="auslagern"
        gruende={GRUENDE_AUS}
        wahl={grund}
        setWahl={setGrund}
        zusatz={abfuellenMoeglich ? { wert: ABFUELLEN, text: "Abfüllen" } : undefined}
      />

      {istAbfuellen && (
        <div className="flex flex-col gap-3">
          <FeldTitel>Abfüllen in</FeldTitel>
          {(einzeln ? glaeser : zielGebinde).map((gebinde) => (
            <div key={gebinde.id} className="flex items-center gap-3">
              <span className="text-accent">
                <GebindeSymbol name={gebinde.name} />
              </span>
              <span className="flex-1 text-sm">{gebinde.name}</span>
              <Zaehler
                id={`ziel-${gebinde.id}`}
                name={`ziel-${gebinde.id}`}
                wert={ziele[gebinde.id] ?? 0}
                setWert={(wert) => setZiele((alt) => ({ ...alt, [gebinde.id]: wert }))}
                min={0}
                beschriftung={gebinde.name}
              />
            </div>
          ))}
          {einzeln && angebrochen && !einzelnZuViel && (
            <div>
              <FeldTitel>
                Rest {mengeGenau(angebrochen.rest, einheit)} {einheit}
              </FeldTitel>
              <div className="flex flex-wrap gap-2">
                {angebrochen.eimerId && (
                  <WahlChip gruppe="abfuellen-rest" aktiv={restArt === "eimer"} onWahl={() => setRestWahl("eimer")}>
                    Bleibt in Eimer {eimerName(angebrochen)}
                  </WahlChip>
                )}
                <WahlChip gruppe="abfuellen-rest" aktiv={restArt === "gewicht"} onWahl={() => setRestWahl("gewicht")}>
                  Als {loseName(einheit)}
                </WahlChip>
                <WahlChip gruppe="abfuellen-rest" aktiv={restArt === "schwund"} onWahl={() => setRestWahl("schwund")}>
                  Schwund ausbuchen
                </WahlChip>
              </div>
              <input type="hidden" name="rest" value={restArt} />
            </div>
          )}
          {istHonig(typ) && (
            <div>
              <FeldTitel>Zustand im Gebinde</FeldTitel>
              <ZustandWahl idPrefix="abfuellen" wahl={zielZustand} setWahl={setZielZustand} />
              <input type="hidden" name="zielZustand" value={zielZustand} />
            </div>
          )}
        </div>
      )}

      <DatumFeld idPrefix="auslagern" />

      <p
        className={`rounded-md px-3 py-2 text-sm ${
          zuViel || mengeZuViel || einzelnZuViel ? "border border-gefahr-rand bg-gefahr-flaeche text-gefahr" : "bg-background text-muted"
        }`}
      >
        {hinweis}
      </p>
      <FormularFehler />
      <SpeichernKnopf>{knopf}</SpeichernKnopf>
    </SicheresFormular>
  );
}

// Lagerort beim Einlagern gut sichtbar als Chips (wie Sorte und Grund),
// vorbelegt mit dem Ort des letzten Zugangs. Bei sehr vielen Orten die
// gewohnte Auswahlliste.
function LagerortWahl({ lagerorte, vorgabe }: { lagerorte: LagerortAnzeige[]; vorgabe: string }) {
  const [wahl, setWahl] = useState(vorgabe);
  if (lagerorte.length > 8) {
    return <LagerortAuswahl lagerorte={lagerorte} idPrefix="einlagern" defaultLagerortId={vorgabe} label="Lagerort" />;
  }
  return (
    <div>
      <FeldTitel>Lagerort</FeldTitel>
      <div className="flex flex-wrap gap-2">
        {lagerorte.map((ort) => (
          <WahlChip key={ort.id} gruppe="einlagern-lagerort" aktiv={wahl === ort.id} onWahl={() => setWahl(ort.id)}>
            {ort.name}
          </WahlChip>
        ))}
        <WahlChip gruppe="einlagern-lagerort" aktiv={wahl === ""} onWahl={() => setWahl("")}>
          Keiner
        </WahlChip>
        <WahlChip gruppe="einlagern-lagerort" aktiv={wahl === NEU} onWahl={() => setWahl(NEU)}>
          + Lagerort
        </WahlChip>
      </div>
      {wahl === NEU ? (
        <Input name="neuerLagerort" aria-label="Name des neuen Lagerorts" placeholder="z.B. Keller" required autoFocus className="mt-2" />
      ) : (
        <input type="hidden" name="lagerortId" value={wahl} />
      )}
    </div>
  );
}

// Einlagern: Gebinde als Kacheln, Anzahl, Sorte und Grund als Chips;
// Zustand, Lagerort, Datum und Notiz unter "Weitere Angaben". Vorbelegt
// wird, was beim letzten Zugang dieses Erzeugnisses gewählt war. Ohne `typ`
// wird dabei ein eigenes Erzeugnis neu angelegt.
function EinlagernDialog({
  typ,
  lagerorte,
  einlagern,
  schliessen,
  warenwert = false,
}: {
  typ: ErzeugnisBestand | null;
  lagerorte: LagerortAnzeige[];
  einlagern: BuchungsAktion;
  schliessen: () => void;
  warenwert?: boolean;
}) {
  const letzterZugang = typ?.buchungen.find((buchung) => buchung.menge > 0);
  const [neueEinheit, setNeueEinheit] = useState("kg");
  const einheit = typ?.einheit ?? (neueEinheit || "kg");

  const [gebindeWahl, setGebindeWahl] = useState<string>(
    letzterZugang?.gebindeId && typ?.gebinde.some((gebinde) => gebinde.id === letzterZugang.gebindeId)
      ? letzterZugang.gebindeId
      : LOSE,
  );
  const gebinde = typ?.gebinde.find((eintrag) => eintrag.id === gebindeWahl);
  const honig = istHonig(typ);
  // Gruppen: bei Honig immer Eimer und Gläser, sonst nur vorhandene Arten;
  // anderes landet unter "Gebinde". Größen aufsteigend, "Gewicht" zuletzt.
  const gruppen = gebindeGruppen(typ?.gebinde ?? [], honig);
  const [art, setArt] = useState<GebindeArt | "gewicht">(
    gebinde ? (honig ? gebindeArt(gebinde.name) : "sonst") : "gewicht",
  );
  const aktiveGruppe = gruppen.find((gruppe) => gruppe.art === art);
  function artWaehlen(neu: GebindeArt | "gewicht") {
    setArt(neu);
    if (neu === "gewicht") {
      setGebindeWahl(LOSE);
      return;
    }
    // Vorwahl: zuletzt eingelagerte Größe dieser Art, sonst die größte
    // außer dem Hobbock (25-kg-Eimer, 500-g-Glas).
    const liste = gruppen.find((gruppe) => gruppe.art === neu)?.gebinde ?? [];
    const zuletzt = typ?.buchungen.find(
      (buchung) => buchung.menge > 0 && liste.some((eintrag) => eintrag.id === buchung.gebindeId),
    )?.gebindeId;
    const groesste = [...liste].reverse().find((eintrag) => !/hobbock/i.test(eintrag.name)) ?? liste[0];
    setGebindeWahl(zuletzt ?? groesste?.id ?? NEU);
  }
  const [anzahl, setAnzahl] = useState(1);
  const [mengeText, setMengeText] = useState("");
  const [neuerNameText, setNeuerNameText] = useState("");
  const [neuerInhaltText, setNeuerInhaltText] = useState("");
  const neuerNameVoll = gebindeNameVoll(neuerNameText, art === "gewicht" ? "sonst" : art, honig);
  const neuerInhalt = Number(neuerInhaltText.replace(",", "."));
  const inhalt = gebindeWahl === NEU ? neuerInhalt : gebinde?.inhalt;
  const menge = Number(mengeText.replace(",", "."));

  const [sorteWahl, setSorteWahl] = useState<string>(
    letzterZugang?.sorteId && typ?.sorten.some((sorte) => sorte.id === letzterZugang.sorteId) ? letzterZugang.sorteId : "",
  );
  // Nur Sorten, die schon einmal gebucht wurden, gleich als Chip - der Rest
  // des Katalogs (z.B. neun vorgegebene Honigsorten) erst über "weitere".
  const genutzteSorten = new Set(typ?.buchungen.map((buchung) => buchung.sorteId).filter(Boolean));
  const [alleSorten, setAlleSorten] = useState(genutzteSorten.size === 0);
  const sichtbareSorten = (typ?.sorten ?? []).filter(
    (sorte) => alleSorten || genutzteSorten.has(sorte.id) || sorte.id === sorteWahl,
  );
  const [grund, setGrund] = useState(GRUENDE_EIN[0]);
  const [zustand, setZustand] = useState(letzterZugang?.zustand ?? "");
  const vorgabeLagerort = letzterZugang?.lagerortId ?? "";

  const mitStueck = gebindeWahl !== LOSE;
  // Eimer einzeln wiegen: je Eimer ein Feld, leer = Nennwert.
  const einzelnWiegen =
    Boolean(typ?.eimerEinzeln) && mitStueck && istEimerGebinde(gebindeWahl === NEU ? neuerNameVoll : gebinde?.name);
  const [gewichte, setGewichte] = useState<string[]>([]);
  const nennwert = inhalt && inhalt > 0 ? inhalt : 0;
  const gewichtSumme = aufGramm(
    Array.from({ length: anzahl }, (_, index) => {
      const wert = Number((gewichte[index] ?? "").replace(",", "."));
      return gewichte[index]?.trim() && Number.isFinite(wert) ? wert : nennwert;
    }).reduce((summe, wert) => summe + wert, 0),
  );
  let knopf: string;
  if (mitStueck) {
    const name = gebindeWahl === NEU ? neuerNameVoll || "Gebinde" : (gebinde?.name ?? "");
    const wort = stueckWort(name, anzahl);
    knopf = einzelnWiegen
      ? `${anzahl} Eimer einlagern · ${mengeGenau(gewichtSumme, einheit)} ${einheit}`
      : wort === "Stück"
        ? `${anzahl} × ${name} einlagern`
        : `${anzahl} ${wort} einlagern`;
  } else {
    knopf = menge > 0 ? `${mengeGenau(menge, einheit)} ${einheit} einlagern` : "Einlagern";
  }

  const weitere = [istHonig(typ) && zustand ? zustandText(zustand) : null].filter(Boolean);

  return (
    <SicheresFormular action={einlagern} beiErfolg={schliessen} className="flex flex-col gap-4">
      {typ ? (
        <input type="hidden" name="erzeugnistypId" value={typ.id} />
      ) : (
        <div className="flex flex-wrap gap-2">
          <div className="min-w-40 flex-1">
            <Label htmlFor="einlagern-neuer-name">Name des Erzeugnisses</Label>
            <Input id="einlagern-neuer-name" name="neuerTyp" placeholder="z.B. Met, Kerzen" required autoFocus />
          </div>
          <div className="w-24">
            <Label htmlFor="einlagern-neue-einheit">Einheit</Label>
            <Input
              id="einlagern-neue-einheit"
              name="neueEinheit"
              value={neueEinheit}
              onChange={(event) => setNeueEinheit(event.target.value)}
            />
          </div>
        </div>
      )}

      {typ && (
        <div>
          <FeldTitel>Gebinde</FeldTitel>
          <div className={`grid gap-2 ${gruppen.length + 1 >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {[
              ...gruppen.map((gruppe) => ({
                id: gruppe.art,
                name: honig ? GEBINDE_ART_NAME[gruppe.art] : "Gebinde",
                symbol: { eimer: "Eimer", glas: "Glas", sonst: "Eimer" }[gruppe.art] as string | null,
                info:
                  gruppe.gebinde.length === 0
                    ? "noch keine"
                    : gruppe.gebinde.length === 1
                      ? "1 Größe"
                      : `${gruppe.gebinde.length} Größen`,
              })),
              { id: "gewicht" as const, name: loseName(einheit), symbol: null, info: `in ${einheit}` },
            ].map((kachel) => (
              <label key={kachel.id} className="cursor-pointer">
                <input
                  type="radio"
                  name="einlagern-art"
                  checked={art === kachel.id}
                  onChange={() => artWaehlen(kachel.id)}
                  className="peer sr-only"
                />
                <span className="flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-rand-bedienung bg-card px-1 py-2 text-center text-sm peer-checked:border-2 peer-checked:border-accent peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                  <span className="text-accent">
                    <GebindeSymbol name={kachel.symbol} />
                  </span>
                  {kachel.name}
                  <span className="text-xs font-normal text-muted">{kachel.info}</span>
                </span>
              </label>
            ))}
          </div>
          {aktiveGruppe && (
            <div className="mt-2 flex flex-wrap gap-2 rounded-lg bg-background p-2">
              {aktiveGruppe.gebinde.map((eintrag) => (
                <WahlChip
                  key={eintrag.id}
                  gruppe="einlagern-gebinde"
                  aktiv={gebindeWahl === eintrag.id}
                  onWahl={() => setGebindeWahl(eintrag.id)}
                >
                  {honig ? groesseKurz(eintrag.name) : eintrag.name}
                </WahlChip>
              ))}
              <WahlChip gruppe="einlagern-gebinde" aktiv={gebindeWahl === NEU} onWahl={() => setGebindeWahl(NEU)}>
                + Größe
              </WahlChip>
            </div>
          )}
          {gebinde && <input type="hidden" name="gebindeId" value={gebinde.id} />}
        </div>
      )}

      {gebindeWahl === NEU && (
        <div className="flex flex-col gap-2">
          <GebindeNeuFelder
            idPrefix="einlagern"
            art={art === "gewicht" ? "sonst" : art}
            honig={honig}
            einheit={einheit}
            vorhandene={aktiveGruppe?.gebinde ?? []}
            name={neuerNameText}
            setName={setNeuerNameText}
            inhalt={neuerInhaltText}
            setInhalt={setNeuerInhaltText}
          />
          <p className="text-xs text-muted">Die Größe wird beim Einlagern gespeichert und steht danach zur Wahl.</p>
        </div>
      )}

      {mitStueck ? (
        <div>
          <FeldTitel>Anzahl</FeldTitel>
          <div className="flex items-center gap-3">
            <Zaehler id="einlagern-anzahl" name="anzahl" wert={anzahl} setWert={setAnzahl} min={1} beschriftung="Anzahl" />
            {inhalt ? (
              <span className="text-sm tabular-nums text-muted">
                {einzelnWiegen ? "Nennwert " : "= "}
                {mengeGenau(Math.round(anzahl * inhalt * 1000) / 1000, einheit)} {einheit}
              </span>
            ) : null}
          </div>
          {einzelnWiegen && (
            <div className="mt-3">
              <FeldTitel>
                Gewicht je Eimer ({einheit}){" "}
                <span className="font-normal">leer = {mengeGenau(nennwert)}</span>
              </FeldTitel>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: anzahl }, (_, index) => (
                  <div key={index}>
                    <label htmlFor={`einlagern-eimer-${index}`} className="text-xs text-muted">
                      Eimer {index + 1}
                    </label>
                    <Input
                      id={`einlagern-eimer-${index}`}
                      name="eimerGewicht"
                      inputMode="decimal"
                      placeholder={mengeGenau(nennwert)}
                      value={gewichte[index] ?? ""}
                      onChange={(event) =>
                        setGewichte((alt) => {
                          const neu = [...alt];
                          neu[index] = event.target.value;
                          return neu;
                        })
                      }
                      className="tabular-nums"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-1.5 flex justify-between gap-2 text-sm text-muted">
                <span>Jeder Eimer bekommt eine Nummer.</span>
                <span className="font-semibold tabular-nums text-foreground">
                  Zusammen {mengeGenau(gewichtSumme, einheit)} {einheit}
                </span>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="w-40">
          <Label htmlFor="einlagern-menge">Menge ({einheit})</Label>
          <Input
            id="einlagern-menge"
            name="menge"
            type="number"
            step="0.001"
            min="0"
            inputMode="decimal"
            required
            value={mengeText}
            onChange={(event) => setMengeText(event.target.value)}
          />
        </div>
      )}

      {typ && (
        <div>
          <FeldTitel>Sorte</FeldTitel>
          <div className="flex flex-wrap gap-2">
            <WahlChip gruppe="einlagern-sorte" aktiv={sorteWahl === ""} onWahl={() => setSorteWahl("")}>
              Keine
            </WahlChip>
            {sichtbareSorten.map((sorte) => (
              <WahlChip key={sorte.id} gruppe="einlagern-sorte" aktiv={sorteWahl === sorte.id} onWahl={() => setSorteWahl(sorte.id)}>
                {sorte.name}
              </WahlChip>
            ))}
            {sichtbareSorten.length < typ.sorten.length && (
              <button
                type="button"
                onClick={() => setAlleSorten(true)}
                className="inline-flex min-h-10 items-center rounded-full px-3 text-sm text-accent hover:underline"
              >
                weitere …
              </button>
            )}
            <WahlChip gruppe="einlagern-sorte" aktiv={sorteWahl === NEU} onWahl={() => setSorteWahl(NEU)}>
              + Sorte
            </WahlChip>
          </div>
          {sorteWahl === NEU ? (
            <Input name="neueSorte" aria-label="Name der neuen Sorte" placeholder="z.B. Tannenhonig" required autoFocus className="mt-2" />
          ) : (
            <input type="hidden" name="sorteId" value={sorteWahl} />
          )}
        </div>
      )}

      {warenwert && typ && (
        <PreisFeld
          key={`${sorteWahl}|${gebindeWahl}`}
          typ={typ}
          sorteId={sorteWahl && sorteWahl !== NEU ? sorteWahl : null}
          gebinde={gebinde ?? null}
          jeGlas={gebinde ? jeStueck(gebinde) : gebindeWahl === NEU && art !== "eimer" && art !== "gewicht"}
          neuerName={gebindeWahl === NEU ? neuerNameVoll : null}
          sorteName={sorteWahl === NEU ? null : (typ.sorten.find((sorte) => sorte.id === sorteWahl)?.name ?? null)}
        />
      )}

      <LagerortWahl lagerorte={lagerorte} vorgabe={vorgabeLagerort} />

      <GrundWahl idPrefix="einlagern" gruende={GRUENDE_EIN} vorschlaege={GRUENDE_EIN_SELTEN} wahl={grund} setWahl={setGrund} />

      <details className="group border-t border-border pt-3">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 text-sm text-muted [&::-webkit-details-marker]:hidden">
          <span>
            Weitere Angaben{weitere.length > 0 ? `: ${weitere.join(" · ")}` : ""}
            <span className="block text-xs">{istHonig(typ) ? "Zustand, " : ""}Datum, Notiz</span>
          </span>
          <span className="transition-transform group-open:rotate-90">▸</span>
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          {istHonig(typ) && (
            <div>
              <FeldTitel>Zustand</FeldTitel>
              <ZustandWahl idPrefix="einlagern" wahl={zustand} setWahl={setZustand} />
            </div>
          )}
          <DatumFeld idPrefix="einlagern" />
          <div>
            <Label htmlFor="einlagern-notiz">Notiz (optional)</Label>
            <Input id="einlagern-notiz" name="notizen" />
          </div>
        </div>
      </details>
      {/* Zustand auch bei zugeklappten weiteren Angaben mitschicken. */}
      {istHonig(typ) && <input type="hidden" name="zustand" value={zustand} />}

      <FormularFehler />
      <SpeichernKnopf>{knopf}</SpeichernKnopf>
    </SicheresFormular>
  );
}

// Preis beim Einlagern (nur mit Warenwert): vorbelegt aus der Preisliste,
// eine Änderung gilt für alle Gebinde dieser Sorte und Größe. Unverändert
// wird nichts geschickt, sonst würde ein Standardpreis zum Sortenpreis.
function PreisFeld({
  typ,
  sorteId,
  gebinde,
  jeGlas,
  neuerName,
  sorteName,
}: {
  typ: ErzeugnisBestand;
  sorteId: string | null;
  gebinde: { id: string; name: string } | null;
  jeGlas: boolean;
  neuerName: string | null;
  sorteName: string | null;
}) {
  const gefunden = preisFuer(typ, sorteId, gebinde?.id ?? null);
  const vorbelegt = gefunden && (gefunden.je === "stueck") === jeGlas ? preisFeld(gefunden.preis) : "";
  const [text, setText] = useState(vorbelegt);
  const geaendert = text.trim() !== vorbelegt;
  const gebindeName = gebinde?.name ?? neuerName;
  const fuer = jeGlas
    ? [gebindeName, sorteName].filter(Boolean).join(" ")
    : [sorteName ?? (typ.sorten.length > 0 ? "ohne Sorte" : null), "Eimer und lose Menge"].filter(Boolean).join(", ");
  return (
    <div>
      <Label htmlFor="einlagern-preis">{jeGlas ? "Preis je Stück" : `Preis je ${typ.einheit}`}</Label>
      <div className="flex items-center gap-1.5">
        <Input
          id="einlagern-preis"
          name={geaendert ? "preis" : undefined}
          inputMode="decimal"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="–"
          className="max-w-36 text-right tabular-nums"
        />
        <span className="text-sm text-muted">€</span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Gilt für {fuer || "dieses Erzeugnis"}, auch was schon im Lager liegt. Ändern geht auch unter Einstellungen → Lager.
      </p>
    </div>
  );
}

// Eimer ohne Einzelgewicht (aus der Zeit vor dem Schalter) nachträglich
// wiegen: jeder eingetragene bekommt eine Nummer, leere bleiben wie sie sind.
function NachwiegenDialog({
  typ,
  posten,
  nachwiegen,
  schliessen,
}: {
  typ: ErzeugnisBestand;
  posten: ErzeugnisBestandGruppe;
  nachwiegen: BuchungsAktion;
  schliessen: () => void;
}) {
  const nennwert = posten.gebindeInhalt ?? 0;
  return (
    <SicheresFormular action={nachwiegen} beiErfolg={schliessen} className="flex flex-col gap-4">
      <PostenFelder typ={typ} posten={posten} />
      <p className="text-sm text-muted">
        {posten.ohneEinzelgewicht} {posten.ohneEinzelgewicht === 1 ? "Eimer zählt" : "Eimer zählen"} bisher mit dem
        Nennwert {mengeGenau(nennwert, typ.einheit)} {typ.einheit}. Trag ein, was du gewogen hast. Leere Felder bleiben ohne
        Einzelgewicht.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: posten.ohneEinzelgewicht }, (_, index) => (
          <div key={index}>
            <label htmlFor={`nachwiegen-${index}`} className="text-xs text-muted">
              Eimer {index + 1}
            </label>
            <Input id={`nachwiegen-${index}`} name="eimerGewicht" inputMode="decimal" placeholder={mengeGenau(nennwert)} className="tabular-nums" />
          </div>
        ))}
      </div>
      <DatumFeld idPrefix="nachwiegen" />
      <FormularFehler />
      <SpeichernKnopf>Gewichte speichern</SpeichernKnopf>
    </SicheresFormular>
  );
}

function LetzteBuchungen({ erzeugnistyp, loeschen }: { erzeugnistyp: ErzeugnisBestand; loeschen: LoeschenAktion }) {
  if (erzeugnistyp.buchungen.length === 0) return null;
  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 [&::-webkit-details-marker]:hidden">
        <span className="font-semibold">Letzte Buchungen</span>
        <span className="text-sm text-muted">
          {erzeugnistyp.buchungen.length} <span className="inline-block transition-transform group-open:rotate-90">▸</span>
        </span>
      </summary>
      <div className="flex flex-col gap-1 border-t border-border p-3">
        {erzeugnistyp.buchungen.map((buchung) => (
          <div
            key={buchung.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-background py-1 pl-3 pr-1 text-sm"
          >
            <span className="w-20 shrink-0 text-xs text-muted">{kurzesDatum(buchung.datum)}</span>
            <span
              className={`w-20 shrink-0 text-right font-medium tabular-nums ${buchung.menge < 0 ? "text-gefahr" : "text-ok"}`}
            >
              {buchung.menge > 0 ? "+" : ""}
              {mengeGenau(buchung.menge, erzeugnistyp.einheit)}
            </span>
            <span className="min-w-24 flex-1 text-xs text-muted">
              {[
                buchung.grund,
                sorteMitZustand(buchung.sorteName, buchung.zustand),
                buchung.eimerNummer !== null
                  ? `${buchung.gebindeName ?? "Eimer"} Nr. ${buchung.eimerNummer}`
                  : buchung.gebindeName && buchung.anzahl
                    ? `${Math.abs(buchung.anzahl)} × ${buchung.gebindeName}`
                    : null,
                buchung.lagerortName,
                buchung.volkName ? `Volk ${buchung.volkName}` : null,
                buchung.notizen,
              ]
                .filter(Boolean)
                .join(" · ") || "–"}
            </span>
            <LoeschKnopf aktion={loeschen} id={buchung.id} beschriftung="Buchung löschen" />
          </div>
        ))}
        <a href="#buchungen-pdf" className="mt-1 self-start px-1 text-xs text-accent hover:underline">
          Buchungen als PDF erstellen
        </a>
      </div>
    </details>
  );
}

const EINHEITEN = ["kg", "g", "Stück", "Liter"];

// Neues Erzeugnis anlegen oder ein eigenes umbenennen: Name und Einheit. Die
// Einheit lässt sich nur ändern, solange es keine Buchungen gibt.
function ErzeugnisFormular({
  speichern,
  schliessen,
  typ,
}: {
  speichern: BuchungsAktion;
  schliessen: () => void;
  typ?: ErzeugnisBestand;
}) {
  const [einheit, setEinheit] = useState(typ?.einheit ?? "kg");
  const einheitFest = Boolean(typ && typ.buchungen.length > 0);
  const einheiten = EINHEITEN.includes(einheit) ? EINHEITEN : [...EINHEITEN, einheit];

  return (
    <SicheresFormular action={speichern} beiErfolg={schliessen} className="flex flex-col gap-4">
      {typ && <input type="hidden" name="id" value={typ.id} />}
      <div>
        <Label htmlFor="erzeugnis-name">Name</Label>
        <Input id="erzeugnis-name" name="name" defaultValue={typ?.name ?? ""} placeholder="z.B. Met, Kerzen" required autoFocus />
      </div>
      <div>
        <FeldTitel>Einheit</FeldTitel>
        {einheitFest ? (
          <p className="text-sm text-muted">{einheit} (ändert sich nicht, solange es Buchungen gibt)</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {einheiten.map((eintrag) => (
              <WahlChip key={eintrag} gruppe="erzeugnis-einheit" aktiv={einheit === eintrag} onWahl={() => setEinheit(eintrag)}>
                {eintrag}
              </WahlChip>
            ))}
          </div>
        )}
        <input type="hidden" name="einheit" value={einheit} />
      </div>
      {!typ && (
        <p className="text-xs text-muted">
          Das neue Erzeugnis steht hinter Honig, Wachs, Propolis und Pollen. Eingelagert wird danach wie gewohnt.
        </p>
      )}
      <FormularFehler />
      <SpeichernKnopf>{typ ? "Speichern" : "Anlegen"}</SpeichernKnopf>
    </SicheresFormular>
  );
}

// Warenwert eines Postens: "50 × 4,50 € = 225,00 €". Ohne Preis keine Zeile,
// der Hinweis unter der Liste nennt die Posten ohne Preis.
function WertZeile({ typ, posten }: { typ: ErzeugnisBestand; posten: ErzeugnisBestandGruppe }) {
  const wert = postenWert(posten, typ);
  if (!wert) return null;
  return (
    <p className="text-xs leading-snug text-muted tabular-nums">
      {wert.rechnung} = <span className="font-semibold text-foreground">{euro(wert.wert)}</span>
    </p>
  );
}

function gruppenWert(gruppe: PostenGruppe, typ: ErzeugnisBestand): string {
  const summe = wertSumme(gruppe.posten, typ);
  return summe.ohnePreis === gruppe.posten.length ? "" : ` · ${euro(summe.wert)}`;
}

// Warenwert unter der Postenliste: dieses Erzeugnis und alle zusammen.
function WarenwertSumme({ typ, erzeugnisse }: { typ: ErzeugnisBestand; erzeugnisse: ErzeugnisBestand[] }) {
  const dieses = wertSumme(typ.posten, typ);
  const alle = erzeugnisse.reduce((summe, eintrag) => summe + wertSumme(eintrag.posten, eintrag).wert, 0);
  if (typ.posten.length === 0 && alle === 0) return null;
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <p className="flex items-baseline justify-between gap-3">
        <span>Warenwert {typ.name}</span>
        <span className="font-semibold tabular-nums">{euro(dieses.wert)}</span>
      </p>
      {erzeugnisse.length > 1 && (
        <p className="flex items-baseline justify-between gap-3 text-muted">
          <span>Alle Erzeugnisse</span>
          <span className="font-semibold tabular-nums text-foreground">{euro(alle)}</span>
        </p>
      )}
      {dieses.ohnePreis > 0 && (
        <p className="text-xs text-muted">
          {dieses.ohnePreis === 1 ? "1 Posten hat" : `${dieses.ohnePreis} Posten haben`} keinen Preis und{" "}
          {dieses.ohnePreis === 1 ? "zählt" : "zählen"} nicht mit. Preise trägst du unter{" "}
          <Link href="/einstellungen/lager" className="text-accent hover:underline">
            Einstellungen → Lager
          </Link>{" "}
          ein.
        </p>
      )}
    </div>
  );
}

type DialogZustand =
  | { art: "ein" }
  | { art: "neu" }
  | { art: "umbenennen" }
  | { art: "aus"; schluessel: string }
  | { art: "nachwiegen"; schluessel: string }
  | null;

// Erzeugnis-Lager: ein Reiter je Erzeugnis, darin der Bestand als Liste von
// Posten (Gebinde, Sorte, Zustand, Lagerort). Ausgelagert wird direkt am
// Posten, eingelagert über den Knopf oben - ein Feld "Richtung" gibt es nicht.
export function ErzeugnisUebersicht({
  erzeugnisse,
  lagerorte,
  einlagern,
  auslagern,
  abfuellen,
  buchungLoeschen,
  erzeugnisAnlegen,
  erzeugnisUmbenennen,
  erzeugnisLoeschen,
  nachwiegen,
  warenwert = false,
}: {
  erzeugnisse: ErzeugnisBestand[];
  lagerorte: LagerortAnzeige[];
  einlagern: BuchungsAktion;
  auslagern: BuchungsAktion;
  abfuellen: BuchungsAktion;
  buchungLoeschen: LoeschenAktion;
  erzeugnisAnlegen: BuchungsAktion;
  erzeugnisUmbenennen: BuchungsAktion;
  erzeugnisLoeschen: (id: string) => Promise<AktionsErgebnis>;
  nachwiegen: BuchungsAktion;
  /// Warenwert zeigen (Einstellungen -> Lager). Aus = wie bisher.
  warenwert?: boolean;
}) {
  const [aktivId, setAktivId] = useState(erzeugnisse[0]?.id ?? "");
  const [dialog, setDialog] = useState<DialogZustand>(null);

  const typ = erzeugnisse.find((eintrag) => eintrag.id === aktivId) ?? erzeugnisse[0] ?? null;
  const schliessen = () => setDialog(null);
  const [loeschFehler, setLoeschFehler] = useState<string | null>(null);

  async function loeschenFragen(zu: ErzeugnisBestand) {
    setLoeschFehler(null);
    if (Math.abs(zu.bestand) >= 0.0005) {
      setLoeschFehler(`Von „${zu.name}“ liegt noch etwas auf Lager. Bitte erst auslagern.`);
      return;
    }
    const n = zu.buchungen.length;
    const frage =
      n > 0
        ? `„${zu.name}“ löschen? Es ist nichts mehr auf Lager. Die ${n === 1 ? "alte Buchung" : `${n} alten Buchungen`} von ${zu.name} werden mit gelöscht.`
        : `„${zu.name}“ löschen?`;
    if (!(await bestaetigen(frage, { ja: "Löschen", gefahr: true }))) return;
    const ergebnis = await erzeugnisLoeschen(zu.id);
    if (ergebnis && ergebnis.fehler) {
      setLoeschFehler(ergebnis.fehler);
      return;
    }
    setAktivId("");
  }
  const auszulagern =
    dialog?.art === "aus" && typ ? typ.posten.find((posten) => postenSchluessel(posten) === dialog.schluessel) : undefined;
  const nachzuwiegen =
    dialog?.art === "nachwiegen" && typ
      ? typ.posten.find((posten) => postenSchluessel(posten) === dialog.schluessel)
      : undefined;
  // Aufgeklappte Einzelgewichte je Posten.
  const [gewichteOffen, setGewichteOffen] = useState<string[]>([]);
  // Sortierung der Lagerliste, je Gerät gemerkt. Standard "sorte" wie bisher.
  const [ordnung, setOrdnung] = useLagerOrdnung();

  function postenZeile(typ: ErzeugnisBestand, posten: ErzeugnisBestandGruppe, ohneSorte: boolean) {
    const leer = posten.gebindeId ? (posten.anzahl ?? 0) <= 0 : posten.menge <= 0;
    const schluessel = postenSchluessel(posten);
    const einzeln = eimerEinzeln(typ, posten);
    const offen = einzeln && gewichteOffen.includes(schluessel);
    return (
      <li key={schluessel} className={offen ? "bg-background/60" : ""}>
        <div className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-3">
          <SymbolKachel name={posten.gebindeName} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">{postenTitel(posten, typ.einheit)}</p>
            {postenUntertitel(posten, ohneSorte) && (
              <p className="text-xs leading-snug text-muted">{postenUntertitel(posten, ohneSorte)}</p>
            )}
            {warenwert && <WertZeile typ={typ} posten={posten} />}
            {einzeln && (
              <button
                type="button"
                aria-expanded={offen}
                onClick={() =>
                  setGewichteOffen((alt) =>
                    offen ? alt.filter((eintrag) => eintrag !== schluessel) : [...alt, schluessel],
                  )
                }
                className={`mt-1 inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-medium text-accent ${
                  offen ? "border-accent bg-card" : "border-rand-ruhig bg-card"
                }`}
              >
                Gewichte
                <span aria-hidden className={`inline-block transition-transform ${offen ? "-rotate-90" : "rotate-90"}`}>
                  ▸
                </span>
              </button>
            )}
          </div>
          <div className={`shrink-0 text-right tabular-nums ${leer ? "text-gefahr" : ""}`}>
            {posten.gebindeId ? (
              <>
                <p className="text-base font-bold">{posten.anzahl}</p>
                <p className={`text-xs ${einzeln ? "font-semibold text-foreground" : "text-muted"}`}>
                  {mengeGenau(posten.menge, typ.einheit)} {typ.einheit}
                </p>
              </>
            ) : (
              <p className="text-base font-bold">
                {mengeGenau(posten.menge, typ.einheit)} <span className="text-xs font-normal">{typ.einheit}</span>
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            groesse="mittel"
            disabled={leer}
            onClick={() => setDialog({ art: "aus", schluessel: postenSchluessel(posten) })}
          >
            Auslagern
          </Button>
        </div>
        {offen && (
          <div className="flex flex-col gap-1.5 border-t border-dashed border-border px-3 pb-3 pt-2 sm:pl-16">
            {posten.eimer.map((eimer) => (
              <div
                key={eimer.id}
                className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-1.5 text-sm"
              >
                <span className="shrink-0 font-semibold">Nr. {eimer.nummer}</span>
                <span className="min-w-0 flex-1 text-xs text-muted">{eimerInfo(eimer, typ.einheit)}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {mengeGenau(eimer.gewicht, typ.einheit)} {typ.einheit}
                </span>
              </div>
            ))}
            {posten.ohneEinzelgewicht > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-rand-ruhig px-3 py-1.5 text-sm">
                <span className="min-w-0 flex-1">
                  {posten.ohneEinzelgewicht} ohne Einzelgewicht
                  <span className="block text-xs text-muted">
                    zählen mit je {mengeGenau(posten.gebindeInhalt ?? 0, typ.einheit)} {typ.einheit}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  groesse="mittel"
                  onClick={() => setDialog({ art: "nachwiegen", schluessel })}
                >
                  Nachwiegen
                </Button>
              </div>
            )}
            <p className="flex justify-between gap-2 px-1 text-xs text-muted">
              <span>
                Nennwert {posten.anzahl} × {mengeGenau(posten.gebindeInhalt ?? 0)} ={" "}
                {mengeGenau(aufGramm((posten.anzahl ?? 0) * (posten.gebindeInhalt ?? 0)), typ.einheit)} {typ.einheit}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                Echt {mengeGenau(posten.menge, typ.einheit)} {typ.einheit}
              </span>
            </p>
          </div>
        )}
      </li>
    );
  }

  // Posten nach Sorte oder Gebinde, je Gruppe mit Zwischenüberschrift.
  function postenListe(typ: ErzeugnisBestand) {
    const gruppen = postenGruppieren(typ.posten, ordnung, istHonig(typ), typ.einheit);
    const ohneSorte = ordnung === "sorte";
    return (
      <ul className="rounded-xl border border-border bg-card">
        {gruppen.map((gruppe, index) => (
          <li key={gruppe.schluessel} className={index > 0 ? "border-t border-border" : ""}>
            <Zwischenkopf
              titel={gruppe.titel}
              zusatz={gruppenSumme(gruppe, ordnung, typ.einheit) + (warenwert ? gruppenWert(gruppe, typ) : "")}
              erste={index === 0}
            />
            <ul className="divide-y divide-border">
              {gruppe.posten.map((posten) => postenZeile(typ, posten, ohneSorte))}
            </ul>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Erzeugnis" className="flex flex-wrap gap-2">
        {erzeugnisse.map((eintrag) => {
          const aktiv = eintrag.id === typ?.id;
          return (
            <button
              key={eintrag.id}
              type="button"
              role="tab"
              aria-selected={aktiv}
              onClick={() => setAktivId(eintrag.id)}
              className={`flex min-h-12 min-w-20 flex-col items-center justify-center rounded-lg border px-3.5 py-1 text-sm ${
                aktiv
                  ? "border-2 border-accent bg-card font-semibold text-foreground"
                  : "border-rand-ruhig bg-card text-muted hover:text-foreground"
              }`}
            >
              {eintrag.name}
              <span className="text-xs font-normal text-muted tabular-nums">
                {mengeAnzeige(eintrag.bestand, eintrag.einheit)} {eintrag.einheit}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setDialog({ art: "neu" })}
          className="flex min-h-12 items-center gap-1.5 rounded-lg border border-dashed border-rand-bedienung bg-card px-3.5 text-sm font-semibold text-accent hover:bg-background"
        >
          <span aria-hidden className="text-lg leading-none">+</span> Neu
        </button>
      </div>

      {typ && !typ.vorgegeben && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="mr-auto">Eigenes Erzeugnis · Einheit {typ.einheit}</span>
          <Button type="button" variant="secondary" groesse="mittel" onClick={() => setDialog({ art: "umbenennen" })}>
            Umbenennen
          </Button>
          <Button
            type="button"
            variant="secondary"
            groesse="mittel"
            className="text-gefahr"
            onClick={() => void loeschenFragen(typ)}
          >
            Löschen
          </Button>
        </div>
      )}
      {loeschFehler && <p role="alert" className="text-sm text-gefahr">{loeschFehler}</p>}

      {typ && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" onClick={() => setDialog({ art: "ein" })} className="w-full sm:w-auto">
              + {typ.name} einlagern
            </Button>
            {typ.posten.length > 1 && (
              <SortierWahl gruppe="lager-ordnung" wert={ordnung} optionen={ORDNUNGEN} onWahl={setOrdnung} />
            )}
          </div>

          {typ.posten.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
              Noch nichts auf Lager.
            </p>
          ) : (
            postenListe(typ)
          )}

          {warenwert && <WarenwertSumme typ={typ} erzeugnisse={erzeugnisse} />}

          <LetzteBuchungen erzeugnistyp={typ} loeschen={buchungLoeschen} />

        </>
      )}

      <p className="text-xs text-muted">
        Sorten, Gebinde, „Eimer einzeln wiegen“ und Warenwert stellst du unter{" "}
        <Link href="/einstellungen/lager" className="text-accent hover:underline">
          Einstellungen → Lager
        </Link>{" "}
        ein.
      </p>

      {typ && (
        <LagerDialog
          offen={dialog?.art === "ein"}
          schliessen={schliessen}
          titel={`${typ.name} einlagern`}
        >
          <EinlagernDialog typ={typ} lagerorte={lagerorte} einlagern={einlagern} schliessen={schliessen} warenwert={warenwert} />
        </LagerDialog>
      )}
      <LagerDialog offen={dialog?.art === "neu"} schliessen={schliessen} titel="Neues Erzeugnis">
        <ErzeugnisFormular speichern={erzeugnisAnlegen} schliessen={schliessen} />
      </LagerDialog>
      {typ && !typ.vorgegeben && (
        <LagerDialog offen={dialog?.art === "umbenennen"} schliessen={schliessen} titel="Erzeugnis umbenennen">
          <ErzeugnisFormular
            speichern={erzeugnisUmbenennen}
            schliessen={schliessen}
            typ={typ}
                      />
        </LagerDialog>
      )}
      {typ && (
        <LagerDialog
          offen={Boolean(auszulagern)}
          schliessen={schliessen}
          titel="Auslagern"
          untertitel={auszulagern ? [postenTitel(auszulagern, typ.einheit), postenUntertitel(auszulagern)].filter(Boolean).join(" · ") : undefined}
          symbol={auszulagern ? <SymbolKachel name={auszulagern.gebindeName} /> : undefined}
        >
          {auszulagern && (
            <AuslagernDialog typ={typ} posten={auszulagern} auslagern={auslagern} abfuellen={abfuellen} schliessen={schliessen} />
          )}
        </LagerDialog>
      )}
      {typ && (
        <LagerDialog
          offen={Boolean(nachzuwiegen)}
          schliessen={schliessen}
          titel="Nachwiegen"
          untertitel={nachzuwiegen ? [postenTitel(nachzuwiegen, typ.einheit), postenUntertitel(nachzuwiegen)].filter(Boolean).join(" · ") : undefined}
          symbol={nachzuwiegen ? <SymbolKachel name={nachzuwiegen.gebindeName} /> : undefined}
        >
          {nachzuwiegen && <NachwiegenDialog typ={typ} posten={nachzuwiegen} nachwiegen={nachwiegen} schliessen={schliessen} />}
        </LagerDialog>
      )}
    </div>
  );
}
