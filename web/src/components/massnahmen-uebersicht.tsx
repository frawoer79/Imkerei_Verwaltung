"use client";

import { useState } from "react";
import Link from "next/link";
import { massnahmeKalenderUmschalten, massnahmeLoeschen } from "@/lib/actions";
import { gleicherRutsch, massnahmenGruppieren } from "@/lib/massnahmen-gruppen";
import { KalenderSchalter } from "@/components/kalender-schalter";
import { Button } from "@/components/ui";
import { useAbhaken, useWartendeHaken } from "@/lib/use-abhaken";
import { LoeschenButton } from "@/components/loeschen-button";
import { MassnahmeBearbeitenFormular } from "@/components/massnahme-bearbeiten-formular";
import { IconBearbeiten, IconMuelleimer } from "@/components/icons";
import {
  FAELLIGKEIT_KAERTCHEN,
  FAELLIGKEIT_PLAKETTE,
  KAERTCHEN_BASIS,
  faelligkeitBestimmen,
  faelligkeitText,
  plakettenText,
} from "@/lib/faelligkeit";

export type MassnahmeMitVolk = {
  id: string;
  text: string;
  faelligAm: Date | null;
  erledigt: boolean;
  volkId: string;
  volkName: string;
  bienenstandName: string;
  imKalender: boolean;
  createdAt: Date;
  /// Gesetzt bei Arbeitsschritten einer Zuchtserie - die werden in der
  /// Übersicht je Serie zu einer aufklappbaren Zeile zusammengefasst.
  zuchtserie: { id: string; bezeichnung: string } | null;
  /// Gesetzt bei Schritten eines biotechnischen Verfahrens - die stehen je
  /// Verfahren als eine Zeile mit dem nächsten Schritt.
  bioVerfahren?: { id: string; titel: string } | null;
};

/// "Zucht Serie 1/2026: Umlarven" -> "Umlarven", innerhalb der Gruppe steht
/// die Serie schon im Kopf.
function ohneSerie(text: string, bezeichnung: string): string {
  const praefix = `Zucht ${bezeichnung}: `;
  return text.startsWith(praefix) ? text.slice(praefix.length) : text;
}

function datumAnzeige(datum: Date): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(datum);
}

/// Termin-Plakette rechts im Kärtchen einer offenen Maßnahme.
function TerminPlakette({ faelligAm, heute }: { faelligAm: Date | null; heute: Date }) {
  const faelligkeit = faelligkeitBestimmen(faelligAm, heute);
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${FAELLIGKEIT_PLAKETTE[faelligkeit]}`}
      title={faelligAm ? faelligkeitText(faelligkeit, datumAnzeige(faelligAm)) : undefined}
    >
      {plakettenText(faelligkeit, faelligAm, heute)}
    </span>
  );
}

function Abhaken({ massnahme }: { massnahme: MassnahmeMitVolk }) {
  // Wie in massnahmen-liste.tsx: die ganze 44/48-px-Fläche ist das Tippziel
  // (Handschuhe). Gesendet wird über die Warteschlange (lib/use-abhaken.ts).
  const abhaken = useAbhaken();
  return (
    <input
      type="checkbox"
      data-schreibt-gesperrt
      defaultChecked={massnahme.erledigt}
      onChange={() => void abhaken([massnahme], !massnahme.erledigt)}
      aria-label={massnahme.erledigt ? "Als offen markieren" : "Als erledigt markieren"}
      className="h-6 w-6 cursor-pointer accent-accent"
    />
  );
}

/// Bearbeiten und Löschen als Symbol-Knöpfe (44 px), für die Zeilen in
/// aufgeklappten Gruppen.
function SymbolKnoepfe({ massnahme, bearbeiten }: { massnahme: MassnahmeMitVolk; bearbeiten: () => void }) {
  return (
    <>
      <Button type="button" data-schreibt variant="leise" groesse="symbol" onClick={bearbeiten} aria-label="Bearbeiten" title="Bearbeiten">
        <IconBearbeiten className="h-5 w-5" />
      </Button>
      <LoeschenButton
        action={massnahmeLoeschen.bind(null, massnahme.id)}
        bestaetigung="Diese Maßnahme wirklich löschen?"
        variant="leiseGefahr"
        groesse="symbol"
        label="Löschen"
      >
        <IconMuelleimer className="h-5 w-5" />
      </LoeschenButton>
    </>
  );
}

/// Ein Volk einer Sammelmaßnahme: Haken, Volkname (führt zum Volk),
/// Bearbeiten und Löschen als Symbole. Eine Zeile, 44 px hoch.
function VolkZeile({ massnahme }: { massnahme: MassnahmeMitVolk }) {
  const [bearbeiten, setBearbeiten] = useState(false);
  if (bearbeiten) {
    return (
      <div className="col-span-full flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2">
        <MassnahmeBearbeitenFormular massnahme={massnahme} fertig={() => setBearbeiten(false)} />
      </div>
    );
  }
  return (
    <div className="flex min-h-11 items-center gap-1 border-b border-border/60">
      <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
        <Abhaken massnahme={massnahme} />
      </label>
      <Link
        href={`/voelker/${massnahme.volkId}`}
        className={`min-w-0 flex-1 truncate py-2 text-sm hover:text-accent ${
          massnahme.erledigt ? "text-muted line-through" : "font-medium"
        }`}
      >
        {massnahme.volkName}
      </Link>
      <SymbolKnoepfe massnahme={massnahme} bearbeiten={() => setBearbeiten(true)} />
    </div>
  );
}

function Zeile({
  massnahme,
  heute,
  text,
  ohneVolk = false,
  dicht = false,
}: {
  massnahme: MassnahmeMitVolk;
  heute: Date;
  text?: string;
  ohneVolk?: boolean;
  /// In einer aufgeklappten Gruppe: Bearbeiten/Löschen als Symbole, weniger Polster.
  dicht?: boolean;
}) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const faelligkeit = massnahme.erledigt ? "ohne" : faelligkeitBestimmen(massnahme.faelligAm, heute);
  // Offene Maßnahmen stehen als weißes Kärtchen mit Farbleiste und
  // Termin-Plakette da, erledigte schlicht.
  const kaertchen = !massnahme.erledigt;

  const knoepfe = (
    <>
      {massnahme.zuchtserie && !massnahme.erledigt && (
        <KalenderSchalter
          aktiv={massnahme.imKalender}
          action={massnahmeKalenderUmschalten.bind(null, massnahme.id)}
        />
      )}
      {dicht ? (
        <SymbolKnoepfe massnahme={massnahme} bearbeiten={() => setBearbeiten(true)} />
      ) : (
        <>
          <Button data-schreibt
            type="button"
            variant="secondary"
            className="px-2 py-1 text-xs"
            onClick={() => setBearbeiten(true)}
          >
            Bearbeiten
          </Button>
          <LoeschenButton
            action={massnahmeLoeschen.bind(null, massnahme.id)}
            bestaetigung="Diese Maßnahme wirklich löschen?"
            className="px-2 py-1 text-xs"
          >
            Löschen
          </LoeschenButton>
        </>
      )}
    </>
  );

  return (
    <div
      className={`flex ${kaertchen ? (dicht ? "items-center" : "items-start sm:items-center") : "items-start"} gap-3 px-3 ${
        kaertchen
          ? `${KAERTCHEN_BASIS} ${FAELLIGKEIT_KAERTCHEN[faelligkeit]} ${dicht ? "py-1.5" : "py-3"}`
          : `rounded-md border py-2 ${massnahme.erledigt ? "border-border bg-background" : "border-border bg-card"}`
      }`}
    >
      {/* Die ganze 48-px-Fläche ist das Tippziel (Handschuhe), die Ränder
          ragen über das Polster der Zeile hinaus. */}
      <label className="-m-3 flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center">
        <Abhaken massnahme={massnahme} />
      </label>

      {bearbeiten ? (
        <MassnahmeBearbeitenFormular massnahme={massnahme} fertig={() => setBearbeiten(false)} />
      ) : kaertchen && !dicht ? (
        // Am Handy steht die Plakette über dem Text und Bearbeiten/Löschen
        // darunter, damit der Text die ganze Breite hat; ab Tablet beides rechts.
        <>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex sm:hidden">
              <TerminPlakette faelligAm={massnahme.faelligAm} heute={heute} />
            </div>
            <p className="text-[15px] font-semibold leading-snug">{text ?? massnahme.text}</p>
            {!ohneVolk && (
              <p className="text-xs text-muted">
                <Link href={`/voelker/${massnahme.volkId}`} className="hover:text-accent">
                  {massnahme.bienenstandName} · {massnahme.volkName}
                </Link>
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">{knoepfe}</div>
          </div>
          <span className="hidden sm:contents">
            <TerminPlakette faelligAm={massnahme.faelligAm} heute={heute} />
          </span>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">{knoepfe}</div>
        </>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className={massnahme.erledigt ? "text-sm text-muted line-through" : "text-sm font-medium"}>
              {text ?? massnahme.text}
            </p>
            <p className="text-xs text-muted">
              {!ohneVolk && (
                <Link href={`/voelker/${massnahme.volkId}`} className="hover:text-accent">
                  {massnahme.bienenstandName} · {massnahme.volkName}
                </Link>
              )}
              {massnahme.faelligAm && (
                <>
                  {ohneVolk ? "" : " · "}
                  {faelligkeitText(faelligkeit, datumAnzeige(massnahme.faelligAm))}
                </>
              )}
            </p>
          </div>
          <div className={`flex shrink-0 items-center ${dicht ? "gap-0" : "gap-2"}`}>{knoepfe}</div>
        </div>
      )}
    </div>
  );
}

/// Alle Schritte einer Zuchtserie als eine Zeile: Serie, Anzahl, nächster
/// Schritt mit Termin. Antippen klappt die einzelnen Schritte auf.
function ZuchtGruppe({
  serie,
  massnahmen,
  heute,
}: {
  serie: { id: string; bezeichnung: string };
  massnahmen: MassnahmeMitVolk[];
  heute: Date;
}) {
  const [offen, setOffen] = useState(false);
  const naechste = massnahmen[0]!;
  const erledigt = naechste.erledigt;
  const faelligkeit = erledigt ? "ohne" : faelligkeitBestimmen(naechste.faelligAm, heute);
  const volk = `${naechste.bienenstandName} · ${naechste.volkName}`;

  return (
    <div
      className={
        erledigt ? "rounded-md border border-border bg-background" : `${KAERTCHEN_BASIS} ${FAELLIGKEIT_KAERTCHEN[faelligkeit]}`
      }
    >
      <button
        type="button"
        onClick={() => setOffen(!offen)}
        aria-expanded={offen}
        className={`flex w-full cursor-pointer gap-3 px-3 text-left ${erledigt ? "items-start py-2" : "items-center py-3"}`}
      >
        <span
          className={`inline-block w-4 shrink-0 text-center text-muted transition-transform ${erledigt ? "mt-0.5 text-sm" : "text-lg"} ${offen ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          ›
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block ${erledigt ? "text-sm text-muted" : "text-[15px] font-semibold leading-snug"}`}>
            Zucht {serie.bezeichnung}
            <span className="font-normal text-muted">
              {" · "}
              {massnahmen.length} {massnahmen.length === 1 ? "Schritt" : "Schritte"}
            </span>
          </span>
          <span className="block text-xs text-muted">
            {erledigt ? (
              volk
            ) : (
              <>
                {volk} · als Nächstes: {ohneSerie(naechste.text, serie.bezeichnung)}
              </>
            )}
          </span>
        </span>
        {!erledigt && <TerminPlakette faelligAm={naechste.faelligAm} heute={heute} />}
      </button>
      {offen && (
        <div className="flex flex-col gap-2 border-t border-border/60 p-2 sm:pl-9">
          {massnahmen.map((massnahme) => (
            <Zeile
              key={massnahme.id}
              massnahme={massnahme}
              heute={heute}
              text={ohneSerie(massnahme.text, serie.bezeichnung)}
              ohneVolk={massnahme.volkId === naechste.volkId}
              dicht
            />
          ))}
          <Link href={`/koeniginnen/zucht/${serie.id}`} className="self-start px-1 text-xs text-muted hover:text-accent">
            Zur Zuchtserie →
          </Link>
        </div>
      )}
    </div>
  );
}

/// Eine Maßnahme, die für mehrere Völker auf einmal angelegt wurde, als eine
/// Zeile: Text, Zahl der Völker und Stände, Termin. Aufgeklappt stehen die
/// Völker je Stand einzeln zum Abhaken, Bearbeiten und Löschen darunter.
function SammelGruppe({
  massnahmen,
  heute,
  schonErledigt = 0,
}: {
  massnahmen: MassnahmeMitVolk[];
  heute: Date;
  /// Völker derselben Sammelmaßnahme, die schon abgehakt sind ("3/9 erledigt").
  schonErledigt?: number;
}) {
  const [offen, setOffen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const abhaken = useAbhaken();
  const erste = massnahmen[0]!;
  const erledigt = erste.erledigt;
  const faelligkeit = erledigt ? "ohne" : faelligkeitBestimmen(erste.faelligAm, heute);
  const gesamt = massnahmen.length + schonErledigt;

  const staende = new Map<string, MassnahmeMitVolk[]>();
  for (const massnahme of massnahmen) {
    const liste = staende.get(massnahme.bienenstandName) ?? [];
    liste.push(massnahme);
    staende.set(massnahme.bienenstandName, liste);
  }
  const volkSortierung = new Intl.Collator("de", { numeric: true });
  const standNamen = [...staende.keys()].sort(volkSortierung.compare);

  return (
    <div
      className={
        erledigt ? "rounded-md border border-border bg-background" : `${KAERTCHEN_BASIS} ${FAELLIGKEIT_KAERTCHEN[faelligkeit]}`
      }
    >
      <button
        type="button"
        onClick={() => setOffen(!offen)}
        aria-expanded={offen}
        className={`flex w-full cursor-pointer gap-3 px-3 text-left ${erledigt ? "items-start py-2" : "items-center py-3"}`}
      >
        <span
          className={`inline-block w-4 shrink-0 text-center text-muted transition-transform ${erledigt ? "mt-0.5 text-sm" : "text-lg"} ${offen ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          ›
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block ${erledigt ? "text-sm text-muted line-through" : "text-[15px] font-semibold leading-snug"}`}
          >
            {erste.text}
          </span>
          <span className="block text-xs text-muted">
            <span className="font-medium">{gesamt} Völker</span>
            {" · "}
            {standNamen.length === 1 ? standNamen[0] : `${standNamen.length} Stände`}
            {!erledigt && schonErledigt > 0 && (
              <span className="whitespace-nowrap font-semibold text-foreground">
                {" · "}
                {schonErledigt}/{gesamt} erledigt
              </span>
            )}
            {erledigt && erste.faelligAm && <> · {faelligkeitText(faelligkeit, datumAnzeige(erste.faelligAm))}</>}
          </span>
        </span>
        {!erledigt && <TerminPlakette faelligAm={erste.faelligAm} heute={heute} />}
      </button>
      {offen && (
        <div className="flex flex-col gap-3 border-t border-border/60 p-2 sm:pl-9">
          {standNamen.map((standName) => (
            <div key={standName}>
              {standNamen.length > 1 && <p className="px-1 pt-1 text-xs font-semibold text-muted">{standName}</p>}
              {/* Völker als dichte Liste, ab Tablet zwei, am PC drei Spalten. */}
              <div className="grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
                {staende
                  .get(standName)!
                  .sort((a, b) => volkSortierung.compare(a.volkName, b.volkName))
                  .map((massnahme) => (
                    <VolkZeile key={massnahme.id} massnahme={massnahme} />
                  ))}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="self-start px-2 py-1 text-xs"
            disabled={speichert}
            onClick={async () => {
              setSpeichert(true);
              try {
                await abhaken(massnahmen, !erledigt);
              } finally {
                setSpeichert(false);
              }
            }}
          >
            {erledigt ? "Alle wieder öffnen" : `Alle ${massnahmen.length} erledigt`}
          </Button>
        </div>
      )}
    </div>
  );
}

/// "Bannwabe: Königin freilassen" -> "Königin freilassen", der Name des
/// Verfahrens steht schon im Kopf.
function ohneVerfahren(text: string): string {
  return text.replace(/^[^:]*: /, "");
}

/// Alle Schritte eines biotechnischen Verfahrens als eine Zeile: Name,
/// Völker, nächster Schritt mit Termin. Aufgeklappt stehen die Schritte
/// kompakt untereinander, der nächste lässt sich für alle Völker abhaken.
function VerfahrenGruppe({
  verfahren,
  massnahmen,
  heute,
}: {
  verfahren: { id: string; titel: string };
  massnahmen: MassnahmeMitVolk[];
  heute: Date;
}) {
  const [offen, setOffen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const abhaken = useAbhaken();
  const erste = massnahmen[0]!;
  const erledigt = erste.erledigt;
  const faelligkeit = erledigt ? "ohne" : faelligkeitBestimmen(erste.faelligAm, heute);

  // Ein Schritt gilt für alle Völker des Verfahrens: gleiche Maßnahmen
  // (Text und Termin) zu einem Schritt zusammenfassen.
  const schritte: { text: string; faelligAm: Date | null; massnahmen: MassnahmeMitVolk[] }[] = [];
  for (const massnahme of massnahmen) {
    const schritt = schritte.find(
      (eintrag) => eintrag.text === massnahme.text && eintrag.faelligAm?.getTime() === massnahme.faelligAm?.getTime()
    );
    if (schritt) schritt.massnahmen.push(massnahme);
    else schritte.push({ text: massnahme.text, faelligAm: massnahme.faelligAm, massnahmen: [massnahme] });
  }
  const naechster = schritte[0]!;
  const voelker = new Set(massnahmen.map((massnahme) => massnahme.volkId)).size;
  const wer = voelker === 1 ? `${erste.bienenstandName} · ${erste.volkName}` : `${voelker} Völker`;

  return (
    <div
      className={
        erledigt ? "rounded-md border border-border bg-background" : `${KAERTCHEN_BASIS} ${FAELLIGKEIT_KAERTCHEN[faelligkeit]}`
      }
    >
      <button
        type="button"
        onClick={() => setOffen(!offen)}
        aria-expanded={offen}
        className={`flex w-full cursor-pointer gap-3 px-3 text-left ${erledigt ? "items-start py-2" : "items-center py-3"}`}
      >
        <span
          className={`inline-block w-4 shrink-0 text-center text-muted transition-transform ${erledigt ? "mt-0.5 text-sm" : "text-lg"} ${offen ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          ›
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block ${erledigt ? "text-sm text-muted" : "text-[15px] font-semibold leading-snug"}`}>
            {verfahren.titel}
            <span className="font-normal text-muted">
              {" · "}
              {schritte.length} {schritte.length === 1 ? "Schritt" : "Schritte"}
              {erledigt ? " erledigt" : " offen"}
            </span>
          </span>
          <span className="block text-xs text-muted">
            {erledigt ? wer : <>{wer} · als Nächstes: {ohneVerfahren(naechster.text)}</>}
          </span>
        </span>
        {!erledigt && <TerminPlakette faelligAm={naechster.faelligAm} heute={heute} />}
      </button>
      {offen && (
        <div className="flex flex-col gap-2 border-t border-border/60 p-2 sm:pl-9">
          <ol className="flex flex-col">
            {schritte.map((schritt, index) => (
              <li key={`${schritt.text}-${schritt.faelligAm?.getTime()}`} className="flex gap-2 px-1 py-1 text-sm">
                <span className={`min-w-0 flex-1 ${erledigt ? "text-muted line-through" : index === 0 ? "font-medium" : ""}`}>
                  {ohneVerfahren(schritt.text)}
                </span>
                {schritt.faelligAm && (
                  <span className="shrink-0 text-xs text-muted">{datumAnzeige(schritt.faelligAm)}</span>
                )}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            {!erledigt && (
              <Button
                type="button"
                variant="secondary"
                className="px-2 py-1 text-xs"
                disabled={speichert}
                onClick={async () => {
                  setSpeichert(true);
                  try {
                    await abhaken(naechster.massnahmen, true);
                  } finally {
                    setSpeichert(false);
                  }
                }}
              >
                Nächsten Schritt erledigt
              </Button>
            )}
            <Link href={`/behandlungen/verfahren/${verfahren.id}`} className="px-1 text-xs text-muted hover:text-accent">
              Zum Verfahren →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function MassnahmenUebersicht({
  massnahmen,
  heute,
  erledigte = [],
}: {
  massnahmen: MassnahmeMitVolk[];
  heute: Date;
  /// Nur für die offene Liste: die erledigten, um bei Sammelmaßnahmen
  /// mitzuzählen, wie viele Völker schon fertig sind.
  erledigte?: MassnahmeMitVolk[];
}) {
  // Haken, die noch in der Warteschlange liegen: Die Maßnahme wechselt schon
  // jetzt in die andere Liste, wie nach dem Speichern.
  const haken = useWartendeHaken();
  const sichtbar = massnahmen.filter(
    (massnahme) => (haken.get(massnahme.id) ?? massnahme.erledigt) === massnahme.erledigt
  );
  if (sichtbar.length === 0) {
    return <p className="text-sm text-muted">Keine Maßnahmen vorhanden.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {massnahmenGruppieren(sichtbar).map((eintrag) =>
        eintrag.art === "einzeln" ? (
          <Zeile key={eintrag.massnahme.id} massnahme={eintrag.massnahme} heute={heute} />
        ) : eintrag.art === "zucht" ? (
          <ZuchtGruppe key={eintrag.serie.id} serie={eintrag.serie} massnahmen={eintrag.massnahmen} heute={heute} />
        ) : eintrag.art === "verfahren" ? (
          <VerfahrenGruppe
            key={eintrag.verfahren.id}
            verfahren={eintrag.verfahren}
            massnahmen={eintrag.massnahmen}
            heute={heute}
          />
        ) : (
          <SammelGruppe
            key={eintrag.schluessel}
            massnahmen={eintrag.massnahmen}
            heute={heute}
            schonErledigt={
              eintrag.massnahmen[0]!.erledigt
                ? 0
                : erledigte.filter((massnahme) => gleicherRutsch(massnahme, eintrag.massnahmen[0]!)).length
            }
          />
        )
      )}
    </div>
  );
}
