"use client";

import { useState } from "react";
import Link from "next/link";
import { Input, Label, Select } from "@/components/ui";
import {
  type AufsatzZeile,
  type ErnteAnteil,
  type OffenerAufsatz,
  type Wabenbeschaffenheit,
  type WabenmassAuswahl,
  type ZargeAuswahl,
  KORREKTUR_MAX,
  KORREKTUR_MIN,
  KORREKTUR_SCHRITT,
  WABENBESCHAFFENHEITEN,
  WABENBESCHAFFENHEIT_LABEL,
  anteilBezeichnung,
  kgAnzeige,
  kurzesDatum,
  runden,
  schaetzungBerechnen,
} from "@/lib/honig";

export type ErnteAnteilVorgabe = {
  istZarge: boolean;
  zargeId: string | null;
  wabenmassId: string | null;
  anzahl: number;
};

export type AufsatzVorgabe = { zargeId: string | null; wabenbeschaffenheit: string | null };

let zaehler = 0;
function neueZeilenId(): string {
  zaehler += 1;
  return `zeile-${zaehler}`;
}

// Plus/Minus-Steller - am Stand mit Handschuhen leichter zu treffen als ein
// Zahlenfeld.
function AnzahlSteller({
  wert,
  aendern,
  bezeichnung,
}: {
  wert: number;
  aendern: (neu: number) => void;
  bezeichnung: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => aendern(Math.max(1, wert - 1))}
        disabled={wert <= 1}
        aria-label={`${bezeichnung} verringern`}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-rand-ruhig bg-card text-2xl font-medium hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <span className="w-8 text-center text-base font-semibold tabular-nums">{wert}</span>
      <button
        type="button"
        onClick={() => aendern(Math.min(20, wert + 1))}
        aria-label={`${bezeichnung} erhöhen`}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-rand-ruhig bg-card text-2xl font-medium hover:bg-card"
      >
        +
      </button>
    </div>
  );
}

// Zargen-Auswahl, nach Beutensystem gruppiert. Das System des Volkes steht
// oben - meistens ist es genau das, was gesucht wird.
function ZargenAuswahl({
  zargen,
  wert,
  aendern,
  beschriftung,
  eigenesSystemId,
}: {
  zargen: ZargeAuswahl[];
  wert: string;
  aendern: (neu: string) => void;
  beschriftung: string;
  eigenesSystemId?: string | null;
}) {
  const eigene = zargen.filter((zarge) => zarge.systemId === eigenesSystemId);
  const andere = zargen.filter((zarge) => zarge.systemId !== eigenesSystemId);

  const option = (zarge: ZargeAuswahl) => (
    <option key={zarge.id} value={zarge.id}>
      {zarge.systemName} {zarge.name}
    </option>
  );

  return (
    <Select
      aria-label={beschriftung}
      value={wert}
      onChange={(event) => aendern(event.target.value)}
      className="min-w-40 flex-1"
    >
      {eigene.length > 0 && andere.length > 0 ? (
        <>
          <optgroup label={`${eigene[0].systemName} (Beutensystem des Volkes)`}>
            {eigene.map(option)}
          </optgroup>
          <optgroup label="Andere Beutensysteme">{andere.map(option)}</optgroup>
        </>
      ) : (
        zargen.map(option)
      )}
    </Select>
  );
}

// Honigraum aufsetzen und ernten in einem Abschnitt der Stockkarte.
//
// Aufgesetzte Honigräume merkt sich die App am Volk. Bei einer späteren
// Durchsicht stehen sie zum Abhaken bereit - so muss beim Ernten nicht neu
// eingetippt werden, was oben sitzt.
export function Honigraum({
  honigraeume,
  wabenmasse,
  offeneAufsaetze,
  eigenesSystemId,
  aufgesetzt = [],
  geerntet,
  geernteteAufsatzIds = [],
  anteile = [],
  korrekturProzent,
  honigertragKg,
  honigart,
}: {
  honigraeume: ZargeAuswahl[];
  wabenmasse: WabenmassAuswahl[];
  /// Honigräume, die gerade auf diesem Volk sitzen (beim Bearbeiten inklusive
  /// derer, die dieser Eintrag selbst geerntet hat).
  offeneAufsaetze: OffenerAufsatz[];
  eigenesSystemId?: string | null;
  aufgesetzt?: AufsatzVorgabe[];
  geerntet?: boolean | null;
  geernteteAufsatzIds?: string[];
  anteile?: ErnteAnteilVorgabe[];
  korrekturProzent?: number | null;
  honigertragKg?: number | null;
  honigart?: string | null;
}) {
  // --- Aufsetzen ---------------------------------------------------------
  // Gleiche Zarge + gleiche Wabenbeschaffenheit werden zu einer Zeile mit
  // Anzahl zusammengefasst; gespeichert wird je Zarge eine eigene Zeile.
  const [aufsatzZeilen, setAufsatzZeilen] = useState<AufsatzZeile[]>(() => {
    const gruppen = new Map<string, AufsatzZeile>();
    for (const vorgabe of aufgesetzt) {
      if (!vorgabe.zargeId) continue;
      const schluessel = `${vorgabe.zargeId}|${vorgabe.wabenbeschaffenheit ?? ""}`;
      const vorhanden = gruppen.get(schluessel);
      if (vorhanden) {
        vorhanden.anzahl += 1;
      } else {
        gruppen.set(schluessel, {
          zeilenId: neueZeilenId(),
          zargeId: vorgabe.zargeId,
          anzahl: 1,
          wabenbeschaffenheit: (vorgabe.wabenbeschaffenheit ?? "AUSGEBAUT") as Wabenbeschaffenheit,
        });
      }
    }
    return [...gruppen.values()];
  });

  // --- Ernten ------------------------------------------------------------
  const [istGeerntet, setIstGeerntet] = useState(geerntet === true);
  const [gewaehlteAufsaetze, setGewaehlteAufsaetze] = useState<string[]>(geernteteAufsatzIds);
  const [zeilen, setZeilen] = useState<ErnteAnteil[]>(() =>
    anteile
      // Die Zargen aus abgehakten Aufsätzen stecken schon in der Auswahl oben -
      // sie dürfen hier nicht doppelt auftauchen.
      .filter((anteil) => !anteil.istZarge || geernteteAufsatzIds.length === 0)
      .map((anteil) => ({
        zeilenId: neueZeilenId(),
        istZarge: anteil.istZarge,
        groesseId: (anteil.istZarge ? anteil.zargeId : anteil.wabenmassId) ?? "",
        anzahl: anteil.anzahl,
      }))
  );
  const [prozent, setProzent] = useState(korrekturProzent ?? 100);
  const [mengeVonHand, setMengeVonHand] = useState(
    honigertragKg !== null && honigertragKg !== undefined ? honigertragKg.toString() : ""
  );

  const keineStammdaten = honigraeume.length === 0 && wabenmasse.length === 0;

  const ausAufsaetzen = offeneAufsaetze
    .filter((aufsatz) => gewaehlteAufsaetze.includes(aufsatz.id))
    .reduce((summe, aufsatz) => summe + aufsatz.honigProZargeKg, 0);
  const schaetzung = runden(ausAufsaetzen + schaetzungBerechnen(zeilen, honigraeume, wabenmasse));
  const ergebnis = runden((schaetzung * prozent) / 100);
  const abweichung = ergebnis - schaetzung;
  const nichtsErfasst = gewaehlteAufsaetze.length === 0 && zeilen.length === 0;

  function aufsatzZeileHinzufuegen() {
    const erste = honigraeume[0]?.id;
    if (!erste) return;
    const bevorzugt = honigraeume.find((zarge) => zarge.systemId === eigenesSystemId)?.id ?? erste;
    setAufsatzZeilen((bisher) => [
      ...bisher,
      { zeilenId: neueZeilenId(), zargeId: bevorzugt, anzahl: 1, wabenbeschaffenheit: "AUSGEBAUT" },
    ]);
  }

  function zeileHinzufuegen(istZarge: boolean) {
    const auswahl = istZarge ? honigraeume : wabenmasse;
    const erste = auswahl[0]?.id;
    if (!erste) return;
    setZeilen((bisher) => [
      ...bisher,
      { zeilenId: neueZeilenId(), istZarge, groesseId: erste, anzahl: 1 },
    ]);
  }

  return (
    <>
      {keineStammdaten ? (
        <p className="rounded-md border border-border bg-background p-3 text-xs text-muted">
          Für Honigräume fehlen noch die Beutensysteme. Lege sie unter{" "}
          <Link href="/einstellungen/beuten" className="text-accent hover:underline">
            Einstellungen → Beutensysteme
          </Link>{" "}
          an. Danach kannst du hier Honigräume aufsetzen und ernten.
        </p>
      ) : (
        <>
          {/* ---------------- Aufsetzen ---------------- */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted">Honigraum aufgesetzt</p>

            {aufsatzZeilen.map((zeile) => (
              <div
                key={zeile.zeilenId}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-2"
              >
                <ZargenAuswahl
                  zargen={honigraeume}
                  wert={zeile.zargeId}
                  aendern={(neu) =>
                    setAufsatzZeilen((bisher) =>
                      bisher.map((eintrag) =>
                        eintrag.zeilenId === zeile.zeilenId ? { ...eintrag, zargeId: neu } : eintrag
                      )
                    )
                  }
                  beschriftung="Aufgesetzte Honigraumgröße"
                  eigenesSystemId={eigenesSystemId}
                />
                <AnzahlSteller
                  wert={zeile.anzahl}
                  aendern={(neu) =>
                    setAufsatzZeilen((bisher) =>
                      bisher.map((eintrag) =>
                        eintrag.zeilenId === zeile.zeilenId ? { ...eintrag, anzahl: neu } : eintrag
                      )
                    )
                  }
                  bezeichnung="Aufgesetzte Zargen"
                />
                <Select
                  aria-label="Waben im Honigraum"
                  value={zeile.wabenbeschaffenheit}
                  onChange={(event) =>
                    setAufsatzZeilen((bisher) =>
                      bisher.map((eintrag) =>
                        eintrag.zeilenId === zeile.zeilenId
                          ? {
                              ...eintrag,
                              wabenbeschaffenheit: event.target.value as Wabenbeschaffenheit,
                            }
                          : eintrag
                      )
                    )
                  }
                  className="min-w-36 flex-1"
                >
                  {WABENBESCHAFFENHEITEN.map((eintrag) => (
                    <option key={eintrag.wert} value={eintrag.wert}>
                      {eintrag.label}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() =>
                    setAufsatzZeilen((bisher) =>
                      bisher.filter((eintrag) => eintrag.zeilenId !== zeile.zeilenId)
                    )
                  }
                  aria-label="Aufgesetzten Honigraum entfernen"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-card hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={aufsatzZeileHinzufuegen}
              disabled={honigraeume.length === 0}
              className="self-start rounded-md border border-rand-ruhig bg-card px-3 py-2.5 text-xs font-medium hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Honigraum aufgesetzt
            </button>
          </div>

          {/* ---------------- Ernten ---------------- */}
          <label
            htmlFor="honigGeerntet"
            className="flex cursor-pointer items-center gap-2 rounded-md border border-rand-ruhig bg-card px-3 py-2 text-sm"
          >
            <input
              id="honigGeerntet"
              name="honigGeerntet"
              type="checkbox"
              value="ja"
              checked={istGeerntet}
              onChange={(event) => setIstGeerntet(event.target.checked)}
              className="h-5 w-5 shrink-0 accent-accent"
            />
            Honig geerntet
          </label>

          {istGeerntet && (
            <>
              {offeneAufsaetze.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted">
                    Aufgesetzte Honigräume: abhaken, was du abgenommen hast
                  </p>
                  {offeneAufsaetze.map((aufsatz) => {
                    const gewaehlt = gewaehlteAufsaetze.includes(aufsatz.id);
                    return (
                      <label
                        key={aufsatz.id}
                        className="flex cursor-pointer flex-wrap items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={gewaehlt}
                          onChange={(event) =>
                            setGewaehlteAufsaetze((bisher) =>
                              event.target.checked
                                ? [...bisher, aufsatz.id]
                                : bisher.filter((id) => id !== aufsatz.id)
                            )
                          }
                          className="h-5 w-5 shrink-0 accent-accent"
                        />
                        <span className="flex-1">{aufsatz.bezeichnung}</span>
                        <span className="text-xs text-muted">
                          seit {kurzesDatum(aufsatz.aufgesetztAm)}
                          {aufsatz.wabenbeschaffenheit
                            ? ` · ${WABENBESCHAFFENHEIT_LABEL[aufsatz.wabenbeschaffenheit]}`
                            : ""}
                        </span>
                        <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted">
                          {kgAnzeige(aufsatz.honigProZargeKg)} kg
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted">
                  {offeneAufsaetze.length > 0 ? "Zusätzlich abgenommen" : "Abgenommen"}
                </p>

                {zeilen.map((zeile) => {
                  const gewicht = zeile.istZarge
                    ? honigraeume.find((eintrag) => eintrag.id === zeile.groesseId)?.honigProZargeKg
                    : wabenmasse.find((eintrag) => eintrag.id === zeile.groesseId)?.honigProWabeKg;

                  return (
                    <div
                      key={zeile.zeilenId}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-2"
                    >
                      <span className="w-14 shrink-0 text-xs text-muted">
                        {zeile.istZarge ? "Zargen" : "Waben"}
                      </span>
                      {zeile.istZarge ? (
                        <ZargenAuswahl
                          zargen={honigraeume}
                          wert={zeile.groesseId}
                          aendern={(neu) =>
                            setZeilen((bisher) =>
                              bisher.map((eintrag) =>
                                eintrag.zeilenId === zeile.zeilenId
                                  ? { ...eintrag, groesseId: neu }
                                  : eintrag
                              )
                            )
                          }
                          beschriftung="Honigraumgröße"
                          eigenesSystemId={eigenesSystemId}
                        />
                      ) : (
                        <Select
                          aria-label="Wabenmaß"
                          value={zeile.groesseId}
                          onChange={(event) =>
                            setZeilen((bisher) =>
                              bisher.map((eintrag) =>
                                eintrag.zeilenId === zeile.zeilenId
                                  ? { ...eintrag, groesseId: event.target.value }
                                  : eintrag
                              )
                            )
                          }
                          className="min-w-40 flex-1"
                        >
                          {wabenmasse.map((eintrag) => (
                            <option key={eintrag.id} value={eintrag.id}>
                              {eintrag.systemName} {eintrag.name}
                            </option>
                          ))}
                        </Select>
                      )}
                      <AnzahlSteller
                        wert={zeile.anzahl}
                        aendern={(neu) =>
                          setZeilen((bisher) =>
                            bisher.map((eintrag) =>
                              eintrag.zeilenId === zeile.zeilenId
                                ? { ...eintrag, anzahl: neu }
                                : eintrag
                            )
                          )
                        }
                        bezeichnung={zeile.istZarge ? "Zargen" : "Waben"}
                      />
                      <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted">
                        {gewicht === undefined ? "–" : `${kgAnzeige(gewicht * zeile.anzahl)} kg`}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setZeilen((bisher) =>
                            bisher.filter((eintrag) => eintrag.zeilenId !== zeile.zeilenId)
                          )
                        }
                        aria-label={`${anteilBezeichnung(zeile, honigraeume, wabenmasse)} entfernen`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-card hover:text-foreground"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => zeileHinzufuegen(true)}
                    disabled={honigraeume.length === 0}
                    className="rounded-md border border-rand-ruhig bg-card px-3 py-2.5 text-xs font-medium hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    + Zargen
                  </button>
                  <button
                    type="button"
                    onClick={() => zeileHinzufuegen(false)}
                    disabled={wabenmasse.length === 0}
                    className="rounded-md border border-rand-ruhig bg-card px-3 py-2.5 text-xs font-medium hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    + Einzelne Waben
                  </button>
                </div>
              </div>

              {!nichtsErfasst && (
                <div className="rounded-md border border-border bg-background p-3">
                  {/* Nur zum Auslesen durch den Speichern-Hinweis (Lager-Frage) -
                      der eigentliche Ertrag wird serverseitig aus honigAnteile
                      berechnet, dieser Wert ist nur die clientseitig bekannte
                      Vorschau davon. */}
                  <input type="hidden" name="honigMengeGeschaetzt" value={ergebnis} />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm text-muted">Schätzung {kgAnzeige(schaetzung)} kg</span>
                    <span className="text-xl font-semibold tabular-nums">
                      {kgAnzeige(ergebnis)} kg
                    </span>
                  </div>

                  <input
                    type="range"
                    min={KORREKTUR_MIN}
                    max={KORREKTUR_MAX}
                    step={KORREKTUR_SCHRITT}
                    value={prozent}
                    onChange={(event) => setProzent(Number(event.target.value))}
                    aria-label="Schätzung korrigieren"
                    className="mt-2 w-full accent-accent"
                  />
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>weniger</span>
                    <span className={prozent === 100 ? "" : "font-medium text-foreground"}>
                      {prozent === 100
                        ? "Schätzung übernommen"
                        : `${abweichung > 0 ? "+" : "−"}${kgAnzeige(Math.abs(abweichung))} kg (${prozent} %)`}
                    </span>
                    <span>mehr</span>
                  </div>
                  {prozent !== 100 && (
                    <button
                      type="button"
                      onClick={() => setProzent(100)}
                      className="mt-1 text-xs text-accent hover:underline"
                    >
                      zurück auf die Schätzung
                    </button>
                  )}
                </div>
              )}

              {/* Nichts erfasst? Dann gibt es nichts zu rechnen - bleibt das
                  schlichte Zahlenfeld. */}
              {nichtsErfasst && (
                <div>
                  <Label htmlFor="honigertragKg">Geerntete Menge (kg)</Label>
                  <Input
                    id="honigertragKg"
                    name="honigertragKg"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    value={mengeVonHand}
                    onChange={(event) => setMengeVonHand(event.target.value)}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="honigart">Honigart</Label>
                <Input
                  id="honigart"
                  name="honigart"
                  defaultValue={honigart ?? ""}
                  placeholder="z.B. Frühtracht, Raps"
                />
              </div>

              <input
                type="hidden"
                name="honigGeernteteAufsaetze"
                value={JSON.stringify(gewaehlteAufsaetze)}
              />
              <input
                type="hidden"
                name="honigAnteile"
                value={JSON.stringify(
                  zeilen.map((zeile) => ({
                    istZarge: zeile.istZarge,
                    groesseId: zeile.groesseId,
                    anzahl: zeile.anzahl,
                  }))
                )}
              />
              <input type="hidden" name="honigKorrekturProzent" value={prozent} />
            </>
          )}

          {/* Aufgesetzte Honigräume werden auch dann gespeichert, wenn bei
              dieser Durchsicht nicht geerntet wurde. */}
          <input
            type="hidden"
            name="honigraumAufgesetzt"
            value={JSON.stringify(
              aufsatzZeilen.map((zeile) => ({
                zargeId: zeile.zargeId,
                anzahl: zeile.anzahl,
                wabenbeschaffenheit: zeile.wabenbeschaffenheit,
              }))
            )}
          />
        </>
      )}
    </>
  );
}
