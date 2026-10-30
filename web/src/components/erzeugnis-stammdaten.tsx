"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Button, EntfernChip, Input, Label, PlusChip, Switch } from "@/components/ui";
import { istHonig } from "@/components/erzeugnis-uebersicht";
import { GebindeNeuFelder, GebindeSymbol } from "@/components/gebinde";
import { FormularFehler, SicheresFormular, SpeichernKnopf, type AktionsErgebnis } from "@/components/sicheres-formular";
import { bestaetigen } from "@/lib/bestaetigen";
import { istEimerGebinde } from "@/lib/eimer";
import { jeStueck, preisFeld } from "@/lib/warenwert";
import { GEBINDE_ART_NAME, gebindeGruppen, groesseKurz, loseName, type GebindeArt } from "@/lib/gebinde";

type LoeschenAktion = (id: string) => Promise<void>;
type StammdatenAktion = (formData: FormData) => Promise<AktionsErgebnis>;

// Füllmenge bis aufs Gramm, sonst stünde "Glas 250 g" als 0,3 kg da.
// Stückzahlen ohne Komma.
function inhaltAnzeige(menge: number, einheit: string): string {
  const mindestens = einheit.toLowerCase() === "stück" ? 0 : 1;
  return menge.toLocaleString("de-DE", { minimumFractionDigits: mindestens, maximumFractionDigits: 3 });
}

export type ErzeugnisStamm = {
  id: string;
  name: string;
  einheit: string;
  eimerEinzeln: boolean;
  /// Euro je Einheit (Warenwert), leer = kein Preis.
  preis: number | null;
  // Was davon gerade auf Lager liegt - nur für die Rückfrage beim Löschen.
  sorten: {
    id: string;
    name: string;
    aufLager: number;
    preis: number | null;
    gebindePreise: { gebindeId: string; preis: number }[];
  }[];
  gebinde: { id: string; name: string; inhalt: number; aufLager: number; preis: number | null }[];
};

function Abschnitt({ titel, hinweis, children }: { titel: string; hinweis: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-border p-4 first:border-t-0">
      <div>
        <h3 className="font-semibold">{titel}</h3>
        <p className="text-xs text-muted">{hinweis}</p>
      </div>
      {children}
    </div>
  );
}

function Abbrechen({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" onClick={onClick}>
      Abbrechen
    </Button>
  );
}

// Löschen per × am Chip, mit Rückfrage. Liegt davon noch etwas auf Lager,
// sagt die Rückfrage, was mit dem Bestand passiert (er bleibt erhalten).
function useLoeschen(aktion: LoeschenAktion) {
  const [, starten] = useTransition();
  return async (id: string, frage: string) => {
    if (!(await bestaetigen(frage, { ja: "Löschen", gefahr: true }))) return;
    starten(() => aktion(id));
  };
}

// Eine Gruppe (Eimer, Gläser, Sonstige) mit ihren Größen als Chips und
// "+ Größe" - dieselben Gruppen und dieselben Felder wie im Einlagern-Fenster.
function GebindeGruppe({
  erzeugnistyp,
  art,
  gebinde,
  honig,
  anlegen,
  loeschen,
}: {
  erzeugnistyp: ErzeugnisStamm;
  art: GebindeArt;
  gebinde: ErzeugnisStamm["gebinde"];
  honig: boolean;
  anlegen: StammdatenAktion;
  loeschen: LoeschenAktion;
}) {
  const [neuOffen, setNeuOffen] = useState(false);
  const [name, setName] = useState("");
  const [inhalt, setInhalt] = useState("");
  const loeschenFragen = useLoeschen(loeschen);
  function schliessen() {
    setNeuOffen(false);
    setName("");
    setInhalt("");
  }

  return (
    <div className="flex flex-col gap-2">
      {honig && (
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <span className="text-accent">
            <GebindeSymbol name={art === "glas" ? "Glas" : "Eimer"} />
          </span>
          {GEBINDE_ART_NAME[art]}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {gebinde.map((eintrag) => {
          const kurz = honig ? groesseKurz(eintrag.name) : eintrag.name;
          return (
            <EntfernChip
              key={eintrag.id}
              beschriftung={`Gebinde ${eintrag.name} löschen`}
              onEntfernen={() =>
                loeschenFragen(
                  eintrag.id,
                  `„${eintrag.name}“ löschen?` +
                    (eintrag.aufLager > 0
                      ? `\n\nIm Lager ${eintrag.aufLager === 1 ? "liegt" : "liegen"} noch ${eintrag.aufLager} Stück. Die Menge bleibt erhalten und steht danach unter „${loseName(erzeugnistyp.einheit)}“.`
                      : ""),
                )
              }
            >
              {kurz}
              {!/\d/.test(eintrag.name) ? (
                <span className="ml-1 text-xs text-muted">
                  {inhaltAnzeige(eintrag.inhalt, erzeugnistyp.einheit)} {erzeugnistyp.einheit}
                </span>
              ) : null}
            </EntfernChip>
          );
        })}
        {!neuOffen && <PlusChip onClick={() => setNeuOffen(true)}>+ Größe</PlusChip>}
      </div>
      {neuOffen && (
        <SicheresFormular
          action={anlegen}
          beiErfolg={schliessen}
          className="flex flex-col gap-3 rounded-lg border border-dashed border-accent p-3"
        >
          <input type="hidden" name="erzeugnistypId" value={erzeugnistyp.id} />
          <GebindeNeuFelder
            idPrefix={`einstellungen-${erzeugnistyp.id}-${art}`}
            art={art}
            honig={honig}
            einheit={erzeugnistyp.einheit}
            vorhandene={gebinde}
            name={name}
            setName={setName}
            inhalt={inhalt}
            setInhalt={setInhalt}
            autoFocus
          />
          <FormularFehler />
          <div className="flex flex-wrap justify-end gap-2">
            <Abbrechen onClick={schliessen} />
            <SpeichernKnopf>Anlegen</SpeichernKnopf>
          </div>
        </SicheresFormular>
      )}
    </div>
  );
}

// Gebinde eines Erzeugnisses, bei Honig nach Eimer, Gläser und Sonstige.
function GebindeVerwaltung({
  erzeugnistyp,
  anlegen,
  loeschen,
}: {
  erzeugnistyp: ErzeugnisStamm;
  anlegen: StammdatenAktion;
  loeschen: LoeschenAktion;
}) {
  const honig = istHonig(erzeugnistyp);
  const gruppen = gebindeGruppen(erzeugnistyp.gebinde, honig, true);

  return (
    <Abschnitt
      titel={`Gebinde (${erzeugnistyp.gebinde.length})`}
      hinweis={
        honig
          ? "Größen, in denen du Honig einlagerst. Gruppiert wie beim Einlagern: Eimer, Gläser, Sonstige."
          : `Feste Füllmengen, in denen du ${erzeugnistyp.name.toLowerCase()} lagerst. Beim Einlagern wählst du dann nur noch die Stückzahl.`
      }
    >
      <div className="flex flex-col gap-4">
        {gruppen.map((gruppe) => (
          <GebindeGruppe
            key={gruppe.art}
            erzeugnistyp={erzeugnistyp}
            art={gruppe.art}
            gebinde={gruppe.gebinde}
            honig={honig}
            anlegen={anlegen}
            loeschen={loeschen}
          />
        ))}
      </div>
    </Abschnitt>
  );
}

// Sorten eines Erzeugnisses (z.B. bei Honig: Waldhonig, Rapshonig, ...) -
// als Chips wie im Einlagern-Fenster, "+ Sorte" an beiden Stellen.
function SortenVerwaltung({
  erzeugnistyp,
  anlegen,
  loeschen,
}: {
  erzeugnistyp: ErzeugnisStamm;
  anlegen: StammdatenAktion;
  loeschen: LoeschenAktion;
}) {
  const [neuOffen, setNeuOffen] = useState(false);
  const loeschenFragen = useLoeschen(loeschen);

  return (
    <Abschnitt
      titel={`Sorten (${erzeugnistyp.sorten.length})`}
      hinweis={`Sorten für ${erzeugnistyp.name.toLowerCase()}, z.B. Frühtracht oder Waldhonig. Dieselbe Liste wie beim Einlagern.`}
    >
      <div className="flex flex-wrap gap-2">
        {erzeugnistyp.sorten.map((sorte) => (
          <EntfernChip
            key={sorte.id}
            beschriftung={`Sorte ${sorte.name} löschen`}
            onEntfernen={() =>
              loeschenFragen(
                sorte.id,
                `Sorte „${sorte.name}“ löschen?` +
                  (sorte.aufLager > 0
                    ? `\n\nIm Lager liegen noch ${inhaltAnzeige(sorte.aufLager, erzeugnistyp.einheit)} ${erzeugnistyp.einheit} davon. Die Menge bleibt erhalten, nur ohne Sorte.`
                    : ""),
              )
            }
          >
            {sorte.name}
          </EntfernChip>
        ))}
        {!neuOffen && <PlusChip onClick={() => setNeuOffen(true)}>+ Sorte</PlusChip>}
      </div>
      {neuOffen && (
        <SicheresFormular
          action={anlegen}
          beiErfolg={() => setNeuOffen(false)}
          className="flex flex-col gap-3 rounded-lg border border-dashed border-accent p-3"
        >
          <input type="hidden" name="erzeugnistypId" value={erzeugnistyp.id} />
          <div>
            <Label htmlFor={`sorte-name-${erzeugnistyp.id}`}>Name der neuen Sorte</Label>
            <Input id={`sorte-name-${erzeugnistyp.id}`} name="name" placeholder="z.B. Tannenhonig" required autoFocus />
          </div>
          <FormularFehler />
          <div className="flex flex-wrap justify-end gap-2">
            <Abbrechen onClick={() => setNeuOffen(false)} />
            <SpeichernKnopf>Anlegen</SpeichernKnopf>
          </div>
        </SicheresFormular>
      )}
    </Abschnitt>
  );
}

// Schalter "Eimer einzeln wiegen" je Erzeugnis.
function EimerSchalter({
  erzeugnistyp,
  setzen,
}: {
  erzeugnistyp: ErzeugnisStamm;
  setzen: (erzeugnistypId: string, an: boolean) => Promise<void>;
}) {
  const [an, setAnSofort] = useOptimistic(erzeugnistyp.eimerEinzeln);
  const [, starten] = useTransition();
  return (
    <div className="flex items-start gap-3 border-t border-border p-4">
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">Eimer einzeln wiegen</h3>
        <p className="text-xs text-muted">
          Für Eimer und Hobbocks das echte Gewicht je Eimer führen, z.B. für die Bio-Kontrolle. Jeder Eimer bekommt
          eine Nummer. Aus: gezählt wird nach Anzahl und Nennwert. Gläser zählen immer nach Nennwert.
        </p>
      </div>
      <Switch
        checked={an}
        label="Eimer einzeln wiegen"
        onChange={() => {
          const neu = !an;
          starten(async () => {
            setAnSofort(neu);
            await setzen(erzeugnistyp.id, neu);
          });
        }}
      />
    </div>
  );
}

// Abschnitt Warenwert am Ende der Karte: Schalter "Warenwert anzeigen" (gilt
// für alle Erzeugnisse), darunter bei "an" die Preisliste.
function WarenwertSchalter({
  an: gespeichert,
  setzen,
  children,
}: {
  an: boolean;
  setzen: (an: boolean) => Promise<void>;
  children: React.ReactNode;
}) {
  const [an, setAnSofort] = useOptimistic(gespeichert);
  const [, starten] = useTransition();
  return (
    <div className="flex flex-col gap-3 border-t border-border p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Warenwert anzeigen</h3>
          <p className="text-xs text-muted">
            Gilt für alle Erzeugnisse. Das Lager zeigt dann den Wert je Posten und die Summe, z.B. 50 Kerzen × 4,50 € =
            225,00 €. Aus: das Lager bleibt ohne Preise, gespeicherte Preise bleiben erhalten.
          </p>
        </div>
        <Switch
          checked={an}
          label="Warenwert anzeigen"
          onChange={() => {
            const neu = !an;
            starten(async () => {
              setAnSofort(neu);
              await setzen(neu);
            });
          }}
        />
      </div>
      {an && children}
    </div>
  );
}

// Preisliste eines Erzeugnisses: Standard (ohne Sorte) und je Sorte. Gläser
// und andere feste Gebinde je Stück, Eimer und lose Menge je Einheit (kg).
// Leere Sortenfelder = Standard.
function PreisVerwaltung({ erzeugnistyp, speichern }: { erzeugnistyp: ErzeugnisStamm; speichern: StammdatenAktion }) {
  const [gespeichert, setGespeichert] = useState(false);
  const stueckGebinde = erzeugnistyp.gebinde.filter((gebinde) => jeStueck(gebinde));
  const mitEimern = erzeugnistyp.gebinde.some((gebinde) => !jeStueck(gebinde));
  const einheitText = `${mitEimern ? "Eimer und lose, " : ""}je ${erzeugnistyp.einheit}`;
  const feld = (id: string, name: string, wert: number | null | undefined, beschriftung: string, vorgabe?: number | null) => (
    <div key={id} className="flex items-center gap-3">
      <label htmlFor={id} className="min-w-0 flex-1 text-sm">
        {beschriftung}
      </label>
      <div className="flex w-36 shrink-0 items-center gap-1.5">
        <Input
          id={id}
          name={name}
          inputMode="decimal"
          defaultValue={preisFeld(wert)}
          placeholder={vorgabe === undefined ? "–" : vorgabe === null ? "–" : preisFeld(vorgabe)}
          onChange={() => setGespeichert(false)}
          className="text-right tabular-nums"
        />
        <span className="text-sm text-muted">€</span>
      </div>
    </div>
  );
  const standard = (
    <div className="flex flex-col gap-2">
      {feld(`preis-${erzeugnistyp.id}`, "preis", erzeugnistyp.preis, einheitText)}
      {stueckGebinde.map((gebinde) =>
        feld(`preis-${gebinde.id}`, `preis-${gebinde.id}`, gebinde.preis, `${gebinde.name}, je Stück`),
      )}
    </div>
  );
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted">
        {erzeugnistyp.sorten.length > 0
          ? `Preisliste wie beim Verkauf. Gläser und andere feste Gebinde je Stück, ${mitEimern ? "Eimer und lose Menge" : "lose Menge"} je ${erzeugnistyp.einheit}. Je Sorte eigene Preise, leere Felder nehmen den Standard.`
          : `Was ${erzeugnistyp.name} wert ist, z.B. dein Verkaufspreis. Feste Gebinde je Stück${mitEimern ? ", Eimer" : ""} und lose Menge je ${erzeugnistyp.einheit}. Leer = kein Preis.`}
      </p>
      <SicheresFormular action={speichern} beiErfolg={() => setGespeichert(true)} className="flex flex-col gap-3">
        <input type="hidden" name="erzeugnistypId" value={erzeugnistyp.id} />
        {erzeugnistyp.sorten.length === 0 ? (
          standard
        ) : (
          <>
            {erzeugnistyp.sorten.map((sorte) => {
              const gesetzt = (sorte.preis !== null ? 1 : 0) + sorte.gebindePreise.length;
              return (
                <details key={sorte.id} className="group rounded-lg border border-border">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 [&::-webkit-details-marker]:hidden">
                    <span className="font-semibold">{sorte.name}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted">
                      {gesetzt === 0 ? "wie Standard" : `${gesetzt} ${gesetzt === 1 ? "Preis" : "Preise"}`}
                    </span>
                    <span aria-hidden className="text-muted transition-transform group-open:rotate-90">▸</span>
                  </summary>
                  <div className="flex flex-col gap-2 border-t border-border p-3">
                    {feld(`sorte-${sorte.id}`, `sorte-${sorte.id}`, sorte.preis, einheitText, erzeugnistyp.preis)}
                    {stueckGebinde.map((gebinde) =>
                      feld(
                        `sorte-${sorte.id}-${gebinde.id}`,
                        `sorte-${sorte.id}-${gebinde.id}`,
                        sorte.gebindePreise.find((eintrag) => eintrag.gebindeId === gebinde.id)?.preis,
                        `${gebinde.name}, je Stück`,
                        gebinde.preis,
                      ),
                    )}
                  </div>
                </details>
              );
            })}
            <details className="group rounded-lg border border-dashed border-rand-ruhig">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">Standard</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">ohne Sorte und für leere Felder</span>
                <span aria-hidden className="text-muted transition-transform group-open:rotate-90">▸</span>
              </summary>
              <div className="border-t border-border p-3">{standard}</div>
            </details>
          </>
        )}
        <FormularFehler />
        <div className="flex flex-wrap items-center justify-end gap-3">
          {gespeichert && <span className="text-sm text-ok">Gespeichert</span>}
          <SpeichernKnopf>Preise speichern</SpeichernKnopf>
        </div>
      </SicheresFormular>
    </div>
  );
}

// Einstellungen -> Lager, Teil Erzeugnisse: ein Reiter je Erzeugnis, darin
// Sorten, Gebinde und (bei Honig oder Eimer-Gebinden) "Eimer einzeln wiegen".
// Gebucht wird weiter im Lager.
export function ErzeugnisStammdaten({
  erzeugnisse,
  gebindeAnlegen,
  gebindeLoeschen,
  sorteAnlegen,
  sorteLoeschen,
  eimerEinzelnSetzen,
  warenwert,
  warenwertSetzen,
  preiseSpeichern,
}: {
  erzeugnisse: ErzeugnisStamm[];
  gebindeAnlegen: StammdatenAktion;
  gebindeLoeschen: LoeschenAktion;
  sorteAnlegen: StammdatenAktion;
  sorteLoeschen: LoeschenAktion;
  eimerEinzelnSetzen: (erzeugnistypId: string, an: boolean) => Promise<void>;
  warenwert: boolean;
  warenwertSetzen: (an: boolean) => Promise<void>;
  preiseSpeichern: StammdatenAktion;
}) {
  const [aktivId, setAktivId] = useState(erzeugnisse[0]?.id ?? "");
  const typ = erzeugnisse.find((eintrag) => eintrag.id === aktivId) ?? erzeugnisse[0] ?? null;
  if (!typ) return null;

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Erzeugnis" className="flex flex-wrap gap-2">
        {erzeugnisse.map((eintrag) => {
          const aktiv = eintrag.id === typ.id;
          return (
            <button
              key={eintrag.id}
              type="button"
              role="tab"
              aria-selected={aktiv}
              onClick={() => setAktivId(eintrag.id)}
              className={`flex min-h-11 min-w-20 items-center justify-center rounded-lg border px-3.5 text-sm ${
                aktiv
                  ? "border-2 border-accent bg-card font-semibold text-foreground"
                  : "border-rand-ruhig bg-card text-muted hover:text-foreground"
              }`}
            >
              {eintrag.name}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border">
        <SortenVerwaltung key={`s-${typ.id}`} erzeugnistyp={typ} anlegen={sorteAnlegen} loeschen={sorteLoeschen} />
        <GebindeVerwaltung key={`g-${typ.id}`} erzeugnistyp={typ} anlegen={gebindeAnlegen} loeschen={gebindeLoeschen} />
        {(istHonig(typ) || typ.gebinde.some((gebinde) => istEimerGebinde(gebinde.name))) && (
          <EimerSchalter key={`e-${typ.id}`} erzeugnistyp={typ} setzen={eimerEinzelnSetzen} />
        )}
        <WarenwertSchalter an={warenwert} setzen={warenwertSetzen}>
          <PreisVerwaltung key={`p-${typ.id}`} erzeugnistyp={typ} speichern={preiseSpeichern} />
        </WarenwertSchalter>
      </div>

      {istHonig(typ) && (
        <p className="text-xs text-muted">
          Honig aus einer Ernte musst du nicht im Lager buchen. Beim Speichern eines neuen Stockkarten-Eintrags mit
          Honigernte fragt die App, ob die Menge ins Lager übernommen werden soll. Die Sorte kommt aus der Honigart der
          Ernte. Der Honig erscheint dann unter „Gewicht“ und lässt sich von dort abfüllen.
        </p>
      )}
    </div>
  );
}
