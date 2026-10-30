"use client";

import { useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { ZahlEingabe } from "@/components/zahl-eingabe";
import { EIGNUNGEN, EIGNUNG_LABEL, massAnzeige } from "@/lib/beutensysteme";
import { kgAnzeige, runden } from "@/lib/honig";

export type WabenmassAnzeige = {
  id: string;
  name: string;
  breiteMm: number | null;
  hoeheMm: number | null;
  eignung: string;
  honigProWabeKg: number;
};

// Eine Zarge ist nur noch eine Kistengröße - ob sie gerade als Brutraum
// (am Volk) oder als Honigraum (in der Stockkarte) dient, wird dort
// entschieden, nicht hier in den Stammdaten.
export type ZargeAnzeige = {
  id: string;
  /// Name der Zarge - meist gleich dem Rähmchenmaß, bei mehreren Zargen
  /// desselben Maßes aber eigen (Miniplus: Standard- und Überwinterungszarge).
  /// So steht sie auch in den Auswahllisten am Volk und in der Stockkarte.
  name: string;
  wabenmassId: string;
  wabenmassName: string;
  wabenAnzahl: number;
  honigProZargeKg: number;
};

export type BeutensystemAnzeige = {
  id: string;
  name: string;
  beschreibung: string | null;
  wabenmasse: WabenmassAnzeige[];
  zargen: ZargeAnzeige[];
  /// Wie viele Völker an diesem System hängen - Warnung vor dem Löschen.
  anzahlVoelker: number;
  /// Rähmchenmaße, die der Katalog für dieses System kennt, hier aber fehlen.
  fehlendeMasse: number;
};

type SpeichernAktion = (formData: FormData) => Promise<void>;
type LoeschenAktion = (id: string) => Promise<void>;

function LoeschKnopf({
  aktion,
  id,
  beschriftung,
}: {
  aktion: LoeschenAktion;
  id: string;
  beschriftung: string;
}) {
  return (
    <form action={aktion.bind(null, id)}>
      <button
        type="submit"
        aria-label={beschriftung}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-card hover:text-danger"
      >
        ✕
      </button>
    </form>
  );
}

// Eine Zarge, direkt in der Zeile änderbar.
//
// Bewusst kein <form action={...}>: React setzt ein Formular nach einer
// Server-Aktion zurück, was hier zwischen altem und neuem Stand hin und her
// springen würde. Die Werte liegen im Zustand, der Knopf schickt sie direkt.
function ZargenZeile({
  zarge,
  speichern,
  loeschen,
}: {
  zarge: ZargeAnzeige;
  speichern: SpeichernAktion;
  loeschen: LoeschenAktion;
}) {
  const [wabenAnzahl, setWabenAnzahl] = useState(zarge.wabenAnzahl.toString());
  const [kg, setKg] = useState(zarge.honigProZargeKg.toString());
  const [laeuft, setLaeuft] = useState(false);

  const geaendert = wabenAnzahl !== zarge.wabenAnzahl.toString() || kg !== zarge.honigProZargeKg.toString();

  async function uebernehmen() {
    setLaeuft(true);
    try {
      const daten = new FormData();
      daten.set("zargeId", zarge.id);
      daten.set("wabenAnzahl", wabenAnzahl);
      daten.set("honigProZargeKg", kg);
      await speichern(daten);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-background px-3 py-2">
      <span className="min-w-28 flex-1 text-sm font-medium">
        {zarge.name}
        {zarge.name !== zarge.wabenmassName && (
          <span className="ml-1 text-xs font-normal text-muted">({zarge.wabenmassName})</span>
        )}
      </span>

      <ZahlEingabe
        breite="w-20"
        einheit="Waben"
        step="1"
        min="1"
        value={wabenAnzahl}
        onChange={(event) => setWabenAnzahl(event.target.value)}
        aria-label={`Wabenzahl ${zarge.name}`}
      />
      <ZahlEingabe
        breite="w-24"
        einheit="kg voll"
        inputMode="decimal"
        step="0.1"
        value={kg}
        onChange={(event) => setKg(event.target.value)}
        aria-label={`Durchschnittsertrag ${zarge.name}`}
      />

      {geaendert && (
        <Button
          type="button"
          variant="secondary"
          onClick={uebernehmen}
          disabled={laeuft}
          className="py-1 text-xs"
        >
          {laeuft ? "…" : "Übernehmen"}
        </Button>
      )}
      <LoeschKnopf
        aktion={loeschen}
        id={zarge.id}
        beschriftung={`${zarge.name} entfernen`}
      />
    </div>
  );
}

// Zargen-Liste eines Systems, mit Formular zum Ergänzen. Dieselbe Zarge
// dient wahlweise als Brutraum (Auswahl am Volk) oder als Honigraum
// (Aufsetzen in der Stockkarte) - keine getrennten Gruppen mehr.
function ZargenListe({
  system,
  zargeSpeichern,
  zargeLoeschen,
}: {
  system: BeutensystemAnzeige;
  zargeSpeichern: SpeichernAktion;
  zargeLoeschen: LoeschenAktion;
}) {
  // Bewusst ohne Filter auf schon verwendete Maße: derselbe Rähmchentyp kann
  // mehrfach vorkommen, z.B. eine 9er und eine 10er Zarge desselben Maßes.
  const [neuOffen, setNeuOffen] = useState(false);
  const [gewaehltesMass, setGewaehltesMass] = useState(system.wabenmasse[0]?.id ?? "");
  const mass = system.wabenmasse.find((eintrag) => eintrag.id === gewaehltesMass);

  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <h4 className="text-sm font-semibold">Zargen</h4>
        <span className="text-xs text-muted">wählbar als Brutraum am Volk oder als Honigraum in der Stockkarte</span>
      </div>

      {system.zargen.length === 0 && !neuOffen && (
        <p className="mb-1 text-xs text-muted">Noch nichts festgelegt.</p>
      )}

      <div className="flex flex-col gap-1">
        {system.zargen.map((zarge) => (
          <ZargenZeile key={zarge.id} zarge={zarge} speichern={zargeSpeichern} loeschen={zargeLoeschen} />
        ))}

        {neuOffen && system.wabenmasse.length > 0 ? (
          <form
            action={zargeSpeichern}
            className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border px-3 py-2"
            onSubmit={() => setNeuOffen(false)}
          >
            <input type="hidden" name="wabenmassId" value={gewaehltesMass} />
            <Select
              aria-label="Rähmchenmaß für die neue Zarge"
              value={gewaehltesMass}
              onChange={(event) => setGewaehltesMass(event.target.value)}
              className="min-w-32 flex-1 py-1 text-sm"
            >
              {system.wabenmasse.map((eintrag) => (
                <option key={eintrag.id} value={eintrag.id}>
                  {eintrag.name}
                </option>
              ))}
            </Select>
            <ZahlEingabe
              breite="w-20"
              einheit="Waben"
              name="wabenAnzahl"
              step="1"
              min="1"
              defaultValue={10}
              aria-label="Wabenzahl"
            />
            <ZahlEingabe
              breite="w-24"
              einheit="kg voll"
              name="honigProZargeKg"
              step="0.1"
              defaultValue={mass ? runden(10 * mass.honigProWabeKg) : 20}
              aria-label="Durchschnittsertrag der vollen Zarge"
            />
            <Button type="submit" className="py-1 text-xs">
              Hinzufügen
            </Button>
            <button
              type="button"
              onClick={() => setNeuOffen(false)}
              className="text-xs text-muted hover:underline"
            >
              Abbrechen
            </button>
          </form>
        ) : (
          system.wabenmasse.length > 0 && (
            <button
              type="button"
              onClick={() => setNeuOffen(true)}
              className="self-start rounded-md border border-rand-ruhig bg-card px-3 py-2 text-xs text-muted hover:bg-card hover:text-foreground"
            >
              + Zarge
            </button>
          )
        )}
      </div>
    </div>
  );
}

// Ein Rähmchenmaß: Name, Maße, Eignung, kg je voller Wabe.
function WabenmassZeile({
  wabenmass,
  speichern,
  loeschen,
}: {
  wabenmass: WabenmassAnzeige;
  speichern: SpeichernAktion;
  loeschen: LoeschenAktion;
}) {
  const [kg, setKg] = useState(wabenmass.honigProWabeKg.toString());
  const [eignung, setEignung] = useState(wabenmass.eignung);
  const [laeuft, setLaeuft] = useState(false);

  const geaendert = kg !== wabenmass.honigProWabeKg.toString() || eignung !== wabenmass.eignung;
  const masse = massAnzeige(wabenmass.breiteMm, wabenmass.hoeheMm);

  async function uebernehmen() {
    setLaeuft(true);
    try {
      const daten = new FormData();
      daten.set("wabenmassId", wabenmass.id);
      daten.set("honigProWabeKg", kg);
      daten.set("eignung", eignung);
      if (wabenmass.breiteMm !== null) daten.set("breiteMm", wabenmass.breiteMm.toString());
      if (wabenmass.hoeheMm !== null) daten.set("hoeheMm", wabenmass.hoeheMm.toString());
      await speichern(daten);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-background px-3 py-2">
      <span className="min-w-28 flex-1">
        <span className="text-sm font-medium">{wabenmass.name}</span>
        {masse && <span className="ml-2 text-xs text-muted">{masse}</span>}
      </span>
      <span className="w-44 shrink-0">
        <Select
          aria-label={`Eignung ${wabenmass.name}`}
          value={eignung}
          onChange={(event) => setEignung(event.target.value)}
          className="py-1 text-xs"
        >
          {EIGNUNGEN.map((wert) => (
            <option key={wert} value={wert}>
              {EIGNUNG_LABEL[wert]}
            </option>
          ))}
        </Select>
      </span>
      <ZahlEingabe
        breite="w-24"
        einheit="kg/Wabe"
        inputMode="decimal"
        step="0.1"
        value={kg}
        onChange={(event) => setKg(event.target.value)}
        aria-label={`Durchschnittsertrag einer vollen Wabe ${wabenmass.name}`}
      />
      {geaendert && (
        <Button
          type="button"
          variant="secondary"
          onClick={uebernehmen}
          disabled={laeuft}
          className="py-1 text-xs"
        >
          {laeuft ? "…" : "Übernehmen"}
        </Button>
      )}
      <LoeschKnopf
        aktion={loeschen}
        id={wabenmass.id}
        beschriftung={`Rähmchenmaß ${wabenmass.name} löschen`}
      />
    </div>
  );
}

// Ein Beutensystem: die Zargen, dahinter aufgeklappt die Rähmchenmaße, weil
// man die selten anfasst.
export function BeutensystemKarte({
  system,
  beutensystemLoeschen,
  wabenmassSpeichern,
  wabenmassLoeschen,
  wabenmasseErgaenzen,
  zargeSpeichern,
  zargeLoeschen,
}: {
  system: BeutensystemAnzeige;
  beutensystemLoeschen: LoeschenAktion;
  wabenmassSpeichern: SpeichernAktion;
  wabenmassLoeschen: LoeschenAktion;
  wabenmasseErgaenzen: LoeschenAktion;
  zargeSpeichern: SpeichernAktion;
  zargeLoeschen: LoeschenAktion;
}) {
  const [masseOffen, setMasseOffen] = useState(false);
  const [neuesMassOffen, setNeuesMassOffen] = useState(false);

  // Zugeklappt steht in der Kopfzeile, was festgelegt ist - so sieht man auf
  // einen Blick, welches System schon fertig eingerichtet ist.
  const zusammenfassung =
    system.zargen.length > 0
      ? `Zargen: ${system.zargen.map((zarge) => zarge.name).join(", ")}`
      : "Noch keine Zarge festgelegt";

  return (
    <details className="group rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <div>
          <h3 className="text-base font-semibold">{system.name}</h3>
          <p className="text-xs text-muted">{zusammenfassung}</p>
          {system.anzahlVoelker > 0 && (
            <p className="text-xs text-muted">
              {system.anzahlVoelker} {system.anzahlVoelker === 1 ? "Volk" : "Völker"} laufen darauf
            </p>
          )}
        </div>
        <span className="shrink-0 text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>

      <div className="flex flex-col gap-4 border-t border-border p-4">
        {system.beschreibung && <p className="text-xs text-muted">{system.beschreibung}</p>}
        <ZargenListe system={system} zargeSpeichern={zargeSpeichern} zargeLoeschen={zargeLoeschen} />

        {system.zargen.length > 0 && (
          <p className="text-xs text-muted">
            Eine volle Ernte je Zarge:{" "}
            {system.zargen
              .map((zarge) => `${zarge.name} ${kgAnzeige(zarge.honigProZargeKg)} kg`)
              .join(" · ")}
          </p>
        )}

        <div>
          <button
            type="button"
            onClick={() => setMasseOffen((offen) => !offen)}
            className="text-xs text-accent hover:underline"
          >
            {masseOffen ? "Rähmchenmaße ausblenden" : `Rähmchenmaße (${system.wabenmasse.length})`}
          </button>

          {masseOffen && (
            <div className="mt-2 flex flex-col gap-1">
              <p className="text-xs text-muted">
                Die genormten Maße dieses Systems. &bdquo;kg/Wabe&ldquo; ist nur der Vorschlag beim
                Anlegen einer Zarge. Maßgeblich ist der kg-Wert an der Zarge selbst.
              </p>

              {system.fehlendeMasse > 0 && (
                <form
                  action={wabenmasseErgaenzen.bind(null, system.id)}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border px-3 py-2"
                >
                  <span className="flex-1 text-xs text-muted">
                    Der Katalog kennt {system.fehlendeMasse} weitere{" "}
                    {system.fehlendeMasse === 1 ? "Maß" : "Maße"} für {system.name}.
                  </span>
                  <Button type="submit" variant="secondary" className="py-1 text-xs">
                    Ergänzen
                  </Button>
                </form>
              )}
              {system.wabenmasse.map((wabenmass) => (
                <WabenmassZeile
                  key={wabenmass.id}
                  wabenmass={wabenmass}
                  speichern={wabenmassSpeichern}
                  loeschen={wabenmassLoeschen}
                />
              ))}

              {neuesMassOffen ? (
                <form
                  action={wabenmassSpeichern}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border px-3 py-2"
                  onSubmit={() => setNeuesMassOffen(false)}
                >
                  <input type="hidden" name="beutensystemId" value={system.id} />
                  <Input
                    name="name"
                    placeholder="Name, z.B. ganz (1/1)"
                    aria-label="Name des neuen Rähmchenmaßes"
                    className="min-w-28 flex-1 py-1 text-sm"
                    required
                  />
                  <ZahlEingabe
                    breite="w-24"
                    einheit="×"
                    name="breiteMm"
                    step="1"
                    placeholder="Breite"
                    aria-label="Breite in mm"
                  />
                  <ZahlEingabe
                    breite="w-24"
                    einheit="mm"
                    name="hoeheMm"
                    step="1"
                    placeholder="Höhe"
                    aria-label="Höhe in mm"
                  />
                  <span className="w-44 shrink-0">
                    <Select
                      name="eignung"
                      defaultValue="BEIDES"
                      aria-label="Eignung"
                      className="py-1 text-xs"
                    >
                      {EIGNUNGEN.map((wert) => (
                        <option key={wert} value={wert}>
                          {EIGNUNG_LABEL[wert]}
                        </option>
                      ))}
                    </Select>
                  </span>
                  <ZahlEingabe
                    breite="w-24"
                    einheit="kg/Wabe"
                    name="honigProWabeKg"
                    step="0.1"
                    defaultValue={2}
                    aria-label="Durchschnittsertrag einer vollen Wabe"
                  />
                  <Button type="submit" className="py-1 text-xs">
                    Anlegen
                  </Button>
                  <button
                    type="button"
                    onClick={() => setNeuesMassOffen(false)}
                    className="text-xs text-muted hover:underline"
                  >
                    Abbrechen
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setNeuesMassOffen(true)}
                  className="self-start rounded-md border border-rand-ruhig bg-card px-3 py-2 text-xs text-muted hover:bg-card hover:text-foreground"
                >
                  + Rähmchenmaß
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <form action={beutensystemLoeschen.bind(null, system.id)}>
            <Button type="submit" variant="secondary" className="py-1 text-xs">
              System löschen
            </Button>
          </form>
          {system.anzahlVoelker > 0 && (
            <span className="text-xs text-muted">
              Beim Löschen verlieren {system.anzahlVoelker}{" "}
              {system.anzahlVoelker === 1 ? "Volk seine" : "Völker ihre"} Brutraum-Angabe.
            </span>
          )}
        </div>
      </div>
    </details>
  );
}

// Neues System: entweder aus dem Katalog (dann kommen die genormten
// Rähmchenmaße gleich mit) oder frei benannt.
export function NeuesBeutensystem({
  action,
  katalog,
  vorhandeneNamen,
}: {
  action: SpeichernAktion;
  katalog: { name: string; beschreibung: string }[];
  vorhandeneNamen: string[];
}) {
  const offen = katalog.filter((eintrag) => !vorhandeneNamen.includes(eintrag.name));
  const [eigenesOffen, setEigenesOffen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {offen.length > 0 && (
        <div>
          <p className="mb-2 text-sm text-muted">
            System hinzufügen (die genormten Rähmchenmaße kommen gleich mit):
          </p>
          <div className="flex flex-wrap gap-2">
            {offen.map((eintrag) => (
              <form key={eintrag.name} action={action}>
                <input type="hidden" name="name" value={eintrag.name} />
                <button
                  type="submit"
                  title={eintrag.beschreibung}
                  className="rounded-md border border-rand-ruhig bg-card px-3 py-2.5 text-sm hover:bg-background"
                >
                  + {eintrag.name}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {eigenesOffen ? (
        <form action={action} className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <Label htmlFor="neuesSystem">Eigenes Beutensystem</Label>
            <Input id="neuesSystem" name="name" placeholder="Name des Systems" required />
          </div>
          <Button type="submit">Anlegen</Button>
          <button
            type="button"
            onClick={() => setEigenesOffen(false)}
            className="pb-2 text-xs text-muted hover:underline"
          >
            Abbrechen
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setEigenesOffen(true)}
          className="self-start text-xs text-accent hover:underline"
        >
          Eigenes System anlegen, das nicht in der Liste steht
        </button>
      )}
    </div>
  );
}
