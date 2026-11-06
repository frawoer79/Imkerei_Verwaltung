"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button, Input, Label, SortierWahl, WahlChip, Zwischenkopf } from "@/components/ui";
import { IconBearbeiten } from "@/components/icons";
import { VerkaufFelder } from "@/components/verkauf-felder";
import { FormularFehler, SicheresFormular, SpeichernKnopf, type AktionsErgebnis } from "@/components/sicheres-formular";
import { bestaetigen } from "@/lib/bestaetigen";
import { heuteAlsInputWert } from "@/lib/datum";
import { euro } from "@/lib/warenwert";
import { VERKAUF_ART_NAME, VERKAUF_ARTEN, type VerkaufArt } from "@/lib/verkauf";
import type { VerkaufZeile } from "@/lib/verkaeufe-daten";

type Aktion = (formData: FormData) => Promise<AktionsErgebnis>;
type IdAktion = (id: string, formData: FormData) => Promise<AktionsErgebnis>;

type Ordnung = "neu" | "alt" | "art" | "kaeufer";

const ORDNUNGEN: { wert: Ordnung; name: string }[] = [
  { wert: "neu", name: "Neueste" },
  { wert: "alt", name: "Älteste" },
  { wert: "art", name: "Art" },
  { wert: "kaeufer", name: "Käufer" },
];

// Sortierung merkt sich jedes Gerät, wie bei der Lagerliste.
const SCHLUESSEL = "verkaeufe-ordnung";

function ordnungLesen(): Ordnung {
  try {
    const wert = localStorage.getItem(SCHLUESSEL);
    return ORDNUNGEN.some((ordnung) => ordnung.wert === wert) ? (wert as Ordnung) : "neu";
  } catch {
    return "neu";
  }
}

function ordnungAbonnieren(neuLesen: () => void): () => void {
  window.addEventListener(SCHLUESSEL, neuLesen);
  window.addEventListener("storage", neuLesen);
  return () => {
    window.removeEventListener(SCHLUESSEL, neuLesen);
    window.removeEventListener("storage", neuLesen);
  };
}

function useOrdnung(): [Ordnung, (neu: Ordnung) => void] {
  const ordnung = useSyncExternalStore(ordnungAbonnieren, ordnungLesen, () => "neu" as const);
  function setzen(neu: Ordnung) {
    try {
      localStorage.setItem(SCHLUESSEL, neu);
    } catch {
      // Ohne Speicher bleibt die Wahl nur bis zum Neuladen.
    }
    window.dispatchEvent(new Event(SCHLUESSEL));
  }
  return [ordnung, setzen];
}

function datumKurz(datum: string): string {
  const [jahr, monat, tag] = datum.split("-");
  return `${tag}.${monat}.${jahr}`;
}

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function summe(zeilen: VerkaufZeile[]): { wert: number; geschaetzt: boolean; ohne: number } {
  let wert = 0;
  let geschaetzt = false;
  let ohne = 0;
  for (const zeile of zeilen) {
    if (zeile.erloes === null) ohne += 1;
    else {
      wert += zeile.erloes;
      if (zeile.geschaetzt) geschaetzt = true;
    }
  }
  return { wert: Math.round(wert * 100) / 100, geschaetzt, ohne };
}

function summenText(zeilen: VerkaufZeile[]): string {
  const { wert, geschaetzt, ohne } = summe(zeilen);
  const anzahl = `${zeilen.length} ${zeilen.length === 1 ? "Verkauf" : "Verkäufe"}`;
  return ohne === zeilen.length ? anzahl : `${anzahl} · ${geschaetzt ? "≈ " : ""}${euro(wert)}`;
}

type Gruppe = { schluessel: string; titel: string; zeilen: VerkaufZeile[] };

function gruppieren(zeilen: VerkaufZeile[], ordnung: Ordnung): Gruppe[] {
  const sortiert = [...zeilen].sort((a, b) =>
    ordnung === "alt" ? a.datum.localeCompare(b.datum) : b.datum.localeCompare(a.datum),
  );
  const karte = new Map<string, Gruppe>();
  for (const zeile of sortiert) {
    let schluessel: string;
    let titel: string;
    if (ordnung === "art") {
      schluessel = zeile.art;
      titel = zeile.art;
    } else if (ordnung === "kaeufer") {
      schluessel = zeile.kaeufer?.trim().toLowerCase() || "";
      titel = zeile.kaeufer?.trim() || "Ohne Käufer";
    } else {
      schluessel = zeile.datum.slice(0, 7);
      titel = `${MONATE[Number(zeile.datum.slice(5, 7)) - 1]} ${zeile.datum.slice(0, 4)}`;
    }
    const gruppe = karte.get(schluessel) ?? { schluessel, titel, zeilen: [] };
    gruppe.zeilen.push(zeile);
    karte.set(schluessel, gruppe);
  }
  const gruppen = [...karte.values()];
  if (ordnung === "art" || ordnung === "kaeufer") {
    gruppen.sort((a, b) => {
      if (a.schluessel === "") return 1;
      if (b.schluessel === "") return -1;
      return a.titel.localeCompare(b.titel, "de");
    });
  }
  return gruppen;
}

// Natives <dialog> wie im Lager, Inhalt entsteht bei jedem Öffnen neu.
function Fenster({ offen, schliessen, titel, children }: { offen: boolean; schliessen: () => void; titel: string; children: React.ReactNode }) {
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
            <h2 className="min-w-0 flex-1 text-lg font-semibold">{titel}</h2>
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

// Neu erfassen oder ändern. Bei Lagerverkäufen nur Datum, Erlös, Käufer und
// Notiz (Menge und Sorte gehören zur Lagerbuchung). Bei Volk und Königin
// bleiben Name und Bezug, Volk und Ableger lassen sich tauschen.
function VerkaufFormular({ zeile, aktion, fertig }: { zeile: VerkaufZeile | null; aktion: Aktion; fertig: () => void }) {
  const frei = zeile === null || zeile.frei;
  const artWaehlbar = zeile === null || zeile.frei || zeile.verkaufArt === "VOLK" || zeile.verkaufArt === "ABLEGER";
  const arten: readonly VerkaufArt[] =
    zeile && !zeile.frei ? (["VOLK", "ABLEGER"] as const) : VERKAUF_ARTEN;
  const [art, setArt] = useState<VerkaufArt>(zeile?.verkaufArt ?? "ABLEGER");

  return (
    <SicheresFormular action={aktion} beiErfolg={fertig} className="flex flex-col gap-4">
      {zeile?.quelle !== "lager" && artWaehlbar && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-muted">Was</p>
          <div className="flex flex-wrap gap-2">
            {arten.map((wert) => (
              <WahlChip key={wert} gruppe="verkauf-art" aktiv={art === wert} onWahl={() => setArt(wert)}>
                {VERKAUF_ART_NAME[wert]}
              </WahlChip>
            ))}
          </div>
          <input type="hidden" name="art" value={art} />
        </div>
      )}
      {zeile?.quelle !== "lager" && frei && (
        <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-3">
          <div>
            <Label htmlFor="verkauf-bezeichnung">Bezeichnung</Label>
            <Input
              id="verkauf-bezeichnung"
              name="bezeichnung"
              defaultValue={zeile?.titel ?? ""}
              placeholder={art === "KOENIGIN" ? "z.B. Carnica 2026" : "z.B. Ableger Carnica"}
            />
          </div>
          <div>
            <Label htmlFor="verkauf-anzahl">Anzahl</Label>
            <Input id="verkauf-anzahl" name="anzahl" type="number" inputMode="numeric" min={1} max={999} defaultValue={zeile?.anzahl ?? 1} />
          </div>
        </div>
      )}
      <div>
        <Label htmlFor="verkauf-datum">Datum</Label>
        <Input id="verkauf-datum" name="datum" type="date" defaultValue={zeile?.datum ?? heuteAlsInputWert()} required />
      </div>
      <VerkaufFelder
        idPrefix="verkauf"
        preis={zeile && !zeile.geschaetzt ? zeile.erloes : null}
        kaeufer={zeile?.kaeufer ?? ""}
        vorschlag={zeile?.geschaetzt ? zeile.erloes : null}
        vorschlagHinweis="Geschätzt nach deiner Preisliste. Speichern übernimmt den Betrag."
      />
      <div>
        <Label htmlFor="verkauf-notiz">Notiz</Label>
        <Input id="verkauf-notiz" name="notiz" defaultValue={zeile?.notiz ?? ""} />
      </div>
      {zeile && !zeile.frei && zeile.quelle === "verkauf" && (
        <p className="text-xs text-muted">
          Entfernen geht über {zeile.verkaufArt === "KOENIGIN" ? "das Ereignis bei der Königin" : "den Status des Volkes"}.
        </p>
      )}
      <FormularFehler />
      <SpeichernKnopf>{zeile ? "Speichern" : "Verkauf erfassen"}</SpeichernKnopf>
    </SicheresFormular>
  );
}

function Zeile({ zeile, bearbeiten }: { zeile: VerkaufZeile; bearbeiten: () => void }) {
  const unten = [datumKurz(zeile.datum), zeile.menge, zeile.kaeufer ? `an ${zeile.kaeufer}` : null, zeile.zusatz].filter(Boolean);
  return (
    <li className="flex items-start gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted">{zeile.art}</span>
          {zeile.link ? (
            <Link href={zeile.link} className="font-semibold text-accent hover:underline">
              {zeile.titel}
            </Link>
          ) : (
            <span className="font-semibold">{zeile.titel}</span>
          )}
        </p>
        <p className="mt-0.5 text-sm text-muted">{unten.join(" · ")}</p>
        {zeile.notiz && <p className="text-xs text-muted">{zeile.notiz}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className={`text-right tabular-nums ${zeile.erloes === null ? "text-sm text-muted" : "font-semibold"}`}>
          {zeile.erloes === null ? "kein Erlös" : `${zeile.geschaetzt ? "≈ " : ""}${euro(zeile.erloes)}`}
        </span>
        <button
          type="button"
          data-schreibt
          onClick={bearbeiten}
          aria-label={`${zeile.titel} bearbeiten`}
          className="flex h-11 w-11 items-center justify-center rounded-md text-muted hover:bg-background hover:text-accent"
        >
          <IconBearbeiten className="h-5 w-5" />
        </button>
      </div>
    </li>
  );
}

export function VerkaufsListe({
  zeilen,
  anlegen,
  aendern,
  lagerAendern,
  loeschen,
}: {
  zeilen: VerkaufZeile[];
  anlegen: Aktion;
  aendern: IdAktion;
  lagerAendern: IdAktion;
  loeschen: (id: string) => Promise<void>;
}) {
  const [ordnung, setOrdnung] = useOrdnung();
  const [suche, setSuche] = useState("");
  const [jahr, setJahr] = useState<string>("alle");
  const [dialog, setDialog] = useState<{ art: "neu" } | { art: "bearbeiten"; zeile: VerkaufZeile } | null>(null);

  const jahre = useMemo(() => [...new Set(zeilen.map((zeile) => zeile.datum.slice(0, 4)))].sort().reverse(), [zeilen]);

  const gefiltert = useMemo(() => {
    const woerter = suche.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return zeilen.filter((zeile) => {
      if (jahr !== "alle" && !zeile.datum.startsWith(jahr)) return false;
      if (woerter.length === 0) return true;
      const text = [zeile.art, zeile.titel, zeile.zusatz, zeile.menge, zeile.kaeufer, zeile.notiz, datumKurz(zeile.datum)]
        .filter(Boolean)
        .join(" ")
        .replace(/\u00a0/g, " ")
        .toLowerCase();
      return woerter.every((wort) => text.includes(wort));
    });
  }, [zeilen, suche, jahr]);

  const gruppen = gruppieren(gefiltert, ordnung);
  const gesamt = summe(gefiltert);
  const schliessen = () => setDialog(null);
  const bearbeitet = dialog?.art === "bearbeiten" ? dialog.zeile : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" data-schreibt onClick={() => setDialog({ art: "neu" })} className="w-full sm:w-auto">
          + Verkauf erfassen
        </Button>
        <p className="text-sm text-muted">Honig und Co. kommen beim Auslagern mit Grund „Verkauf“ von selbst dazu.</p>
      </div>

      {zeilen.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
          Noch nichts verkauft. Lagere ein Erzeugnis mit Grund „Verkauf“ aus, setz ein Volk auf „verkauft“ oder erfasse
          einen Verkauf hier.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-sm text-muted">Erlös{jahr === "alle" ? "" : ` ${jahr}`}</p>
              <p className="text-xl font-semibold tabular-nums">
                {gesamt.geschaetzt ? "≈ " : ""}
                {euro(gesamt.wert)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-sm text-muted">Verkäufe</p>
              <p className="text-xl font-semibold tabular-nums">{gefiltert.length}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <Label htmlFor="verkauf-suche">Suchen</Label>
              <Input
                id="verkauf-suche"
                type="search"
                value={suche}
                onChange={(event) => setSuche(event.target.value)}
                placeholder="z.B. Waldhonig, Ableger, Meier"
              />
            </div>
            {jahre.length > 1 && (
              <div role="radiogroup" aria-label="Jahr" className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">Jahr</span>
                <WahlChip gruppe="verkauf-jahr" aktiv={jahr === "alle"} onWahl={() => setJahr("alle")}>
                  Alle
                </WahlChip>
                {jahre.map((wert) => (
                  <WahlChip key={wert} gruppe="verkauf-jahr" aktiv={jahr === wert} onWahl={() => setJahr(wert)}>
                    {wert}
                  </WahlChip>
                ))}
              </div>
            )}
            <SortierWahl gruppe="verkauf-ordnung" wert={ordnung} optionen={ORDNUNGEN} onWahl={setOrdnung} />
          </div>

          {gefiltert.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
              Nichts gefunden.
            </p>
          ) : (
            <div className="rounded-xl border border-border bg-card">
              {gruppen.map((gruppe, index) => (
                <section key={gruppe.schluessel}>
                  <Zwischenkopf titel={gruppe.titel} zusatz={summenText(gruppe.zeilen)} erste={index === 0} />
                  <ul>
                    {gruppe.zeilen.map((zeile) => (
                      <Zeile key={zeile.schluessel} zeile={zeile} bearbeiten={() => setDialog({ art: "bearbeiten", zeile })} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {gesamt.geschaetzt && (
            <p className="text-xs text-muted">
              ≈ heißt: Bei diesen Verkäufen fehlt der Erlös. Er ist nach deiner Preisliste geschätzt. Über den Stift
              trägst du den echten Betrag ein.
            </p>
          )}
        </>
      )}

      <Fenster offen={dialog !== null} schliessen={schliessen} titel={bearbeitet ? bearbeitet.titel : "Verkauf erfassen"}>
        {dialog?.art === "neu" && <VerkaufFormular zeile={null} aktion={anlegen} fertig={schliessen} />}
        {bearbeitet && (
          <>
            <VerkaufFormular
              zeile={bearbeitet}
              aktion={(formData) =>
                bearbeitet.quelle === "lager" ? lagerAendern(bearbeitet.id, formData) : aendern(bearbeitet.id, formData)
              }
              fertig={schliessen}
            />
            {bearbeitet.frei && (
              <Button
                type="button"
                variant="leiseGefahr"
                onClick={async () => {
                  if (!(await bestaetigen(`Verkauf „${bearbeitet.titel}“ löschen?`, { ja: "Löschen", gefahr: true }))) return;
                  await loeschen(bearbeitet.id);
                  schliessen();
                }}
              >
                Verkauf löschen
              </Button>
            )}
          </>
        )}
      </Fenster>
    </div>
  );
}
