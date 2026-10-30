"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@/components/ui";
import { ZahlEingabe } from "@/components/zahl-eingabe";
import { LagerortAuswahl } from "@/components/lagerort-auswahl";
import { zargeBezeichnung } from "@/lib/honig";
import type { KlimadeckelBestand, LagerortAnzeige, ZargeBestand } from "@/lib/lager";

export type MaterialartikelAnzeige = {
  id: string;
  name: string;
  einheit: string;
  bestand: number;
  notizen: string | null;
  lagerortId: string | null;
  lagerort: { name: string } | null;
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
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-card hover:text-gefahr"
      >
        ✕
      </button>
    </form>
  );
}

// Eine Zarge mit ihrem Gesamtbestand, direkt in der Zeile änderbar - "im
// Einsatz" und "verfügbar" sind reine Anzeige, die errechnet sich aus
// aktiven Honigraumaufsätzen bzw. Völkern (siehe web/src/lib/lager.ts).
function ZargeZeile({ zarge, speichern }: { zarge: ZargeBestand; speichern: SpeichernAktion }) {
  const [bestand, setBestand] = useState(zarge.gesamtbestand?.toString() ?? "");
  const [laeuft, setLaeuft] = useState(false);
  const geaendert = bestand !== (zarge.gesamtbestand?.toString() ?? "");

  const bezeichnung = zargeBezeichnung({
    systemName: zarge.systemName,
    name: zarge.name,
    wabenAnzahl: zarge.wabenAnzahl,
  });

  async function uebernehmen() {
    setLaeuft(true);
    try {
      const daten = new FormData();
      daten.set("zargeId", zarge.id);
      daten.set("gesamtbestand", bestand);
      await speichern(daten);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-background px-3 py-2">
      <span className="min-w-40 flex-1 text-sm font-medium">{bezeichnung}</span>
      <ZahlEingabe
        breite="w-24"
        einheit="gesamt"
        step="1"
        value={bestand}
        onChange={(event) => setBestand(event.target.value)}
        aria-label={`Gesamtbestand ${bezeichnung}`}
      />
      <span className="w-24 shrink-0 text-right text-xs text-muted">
        {zarge.imEinsatz} im Einsatz
      </span>
      <span
        className={`w-28 shrink-0 text-right text-xs font-medium ${
          zarge.verfuegbar === null
            ? "text-muted"
            : zarge.verfuegbar < 0
              ? "text-gefahr"
              : "text-foreground"
        }`}
      >
        {zarge.verfuegbar === null ? "Bestand fehlt" : `${zarge.verfuegbar} verfügbar`}
      </span>
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
    </div>
  );
}

// Mit `einsatz` (nur Klimadeckel) ist der Bestand der Gesamtbestand, dahinter
// stehen wie bei den Zargen "im Einsatz" (Völker mit diesem Deckel) und
// "verfügbar" als reine Anzeige.
function MaterialartikelZeile({
  artikel,
  lagerorte,
  speichern,
  loeschen,
  einsatz,
}: {
  artikel: MaterialartikelAnzeige;
  lagerorte: LagerortAnzeige[];
  speichern: SpeichernAktion;
  loeschen: LoeschenAktion;
  einsatz?: { imEinsatz: number; verfuegbar: number };
}) {
  const [bestand, setBestand] = useState(artikel.bestand.toString());
  const [lagerortBearbeiten, setLagerortBearbeiten] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const geaendert = bestand !== artikel.bestand.toString();

  async function uebernehmen(formData?: FormData) {
    setLaeuft(true);
    try {
      // Ohne eigenes formData (schnelles Übernehmen des Bestands) muss der
      // bisherige Lagerort ausdrücklich mitgeschickt werden - sonst würde
      // ihn lagerortIdAufloesen() als "nicht gesetzt" lesen und löschen.
      const daten = formData ?? new FormData();
      if (!formData) daten.set("lagerortId", artikel.lagerortId ?? "");
      daten.set("materialartikelId", artikel.id);
      daten.set("bestand", bestand);
      await speichern(daten);
    } finally {
      setLaeuft(false);
      setLagerortBearbeiten(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-28 flex-1 text-sm font-medium">
          {artikel.name}
          {artikel.notizen && <span className="ml-2 text-xs text-muted">{artikel.notizen}</span>}
        </span>
        <ZahlEingabe
          breite="w-24"
          einheit={einsatz ? "gesamt" : artikel.einheit}
          step={einsatz ? "1" : "0.1"}
          inputMode={einsatz ? "numeric" : "decimal"}
          value={bestand}
          onChange={(event) => setBestand(event.target.value)}
          aria-label={`${einsatz ? "Gesamtbestand" : "Bestand"} ${artikel.name}`}
        />
        {einsatz && (
          <>
            <span className="shrink-0 text-xs text-muted">{einsatz.imEinsatz} im Einsatz</span>
            <span
              className={`shrink-0 text-xs font-medium ${
                einsatz.verfuegbar < 0 ? "text-gefahr" : "text-foreground"
              }`}
            >
              {einsatz.verfuegbar} verfügbar
            </span>
          </>
        )}
        <button
          type="button"
          onClick={() => setLagerortBearbeiten((offen) => !offen)}
          className="text-xs text-muted hover:text-accent hover:underline"
        >
          {artikel.lagerort?.name ?? "kein Lagerort"}
        </button>
        {geaendert && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => uebernehmen()}
            disabled={laeuft}
            className="py-1 text-xs"
          >
            {laeuft ? "…" : "Übernehmen"}
          </Button>
        )}
        <LoeschKnopf aktion={loeschen} id={artikel.id} beschriftung={`${artikel.name} entfernen`} />
      </div>

      {lagerortBearbeiten && (
        <form
          action={(formData) => uebernehmen(formData)}
          className="flex flex-wrap items-end gap-2 border-t border-border pt-2"
        >
          <div className="w-48">
            <LagerortAuswahl
              lagerorte={lagerorte}
              idPrefix={`material-${artikel.id}`}
              defaultLagerortId={artikel.lagerortId ?? ""}
            />
          </div>
          <Button type="submit" variant="secondary" className="py-1 text-xs" disabled={laeuft}>
            Übernehmen
          </Button>
        </form>
      )}
    </div>
  );
}

function NeuerMaterialartikel({
  lagerorte,
  anlegen,
  klimadeckel = false,
}: {
  lagerorte: LagerortAnzeige[];
  anlegen: SpeichernAktion;
  /// Legt einen Klimadeckel an (Völkern zuordenbar, Bestand in Stück).
  klimadeckel?: boolean;
}) {
  const [offen, setOffen] = useState(false);
  const prefix = klimadeckel ? "klimadeckel-neu" : "material-neu";

  if (!offen) {
    return (
      <button
        type="button"
        data-schreibt
        onClick={() => setOffen(true)}
        className="self-start rounded-md border border-rand-ruhig bg-card px-3 py-2.5 text-xs font-medium hover:bg-card"
      >
        {klimadeckel ? "+ Klimadeckel" : "+ Material"}
      </button>
    );
  }

  return (
    <form
      action={anlegen}
      className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border p-3"
      onSubmit={() => setOffen(false)}
    >
      {klimadeckel && <input type="hidden" name="klimadeckel" value="1" />}
      <div className="min-w-32 flex-1">
        <Label htmlFor={`${prefix}-name`}>Bezeichnung</Label>
        <Input
          id={`${prefix}-name`}
          name="name"
          placeholder={klimadeckel ? "z.B. Klimadeckel Beelive" : "z.B. Boden, Absperrgitter"}
          required
          autoFocus
        />
      </div>
      <div className="w-24">
        <Label htmlFor={`${prefix}-bestand`}>{klimadeckel ? "Gesamt" : "Bestand"}</Label>
        <Input
          id={`${prefix}-bestand`}
          name="bestand"
          type="number"
          step={klimadeckel ? "1" : "0.1"}
          min="0"
          defaultValue={0}
        />
      </div>
      {!klimadeckel && (
        <div className="w-24">
          <Label htmlFor={`${prefix}-einheit`}>Einheit</Label>
          <Input id={`${prefix}-einheit`} name="einheit" defaultValue="Stück" />
        </div>
      )}
      <div className="w-48">
        <LagerortAuswahl lagerorte={lagerorte} idPrefix={prefix} />
      </div>
      <Button type="submit">Anlegen</Button>
      <button
        type="button"
        onClick={() => setOffen(false)}
        className="pb-2 text-xs text-muted hover:underline"
      >
        Abbrechen
      </button>
    </form>
  );
}

export function MaterialUebersicht({
  zargen,
  klimadeckel,
  materialartikel,
  lagerorte,
  zargeBestandSpeichern,
  materialartikelAnlegen,
  materialartikelSpeichern,
  materialartikelLoeschen,
}: {
  zargen: ZargeBestand[];
  klimadeckel: KlimadeckelBestand[];
  materialartikel: MaterialartikelAnzeige[];
  lagerorte: LagerortAnzeige[];
  zargeBestandSpeichern: SpeichernAktion;
  materialartikelAnlegen: SpeichernAktion;
  materialartikelSpeichern: SpeichernAktion;
  materialartikelLoeschen: LoeschenAktion;
}) {
  return (
    <div className="flex flex-col gap-5">
      {zargen.length === 0 ? (
        <p className="rounded-md border border-border bg-background p-3 text-xs text-muted">
          Für Zargen fehlen noch die Beutensysteme. Lege sie unter{" "}
          <Link href="/einstellungen/beuten" className="text-accent hover:underline">
            Einstellungen → Beutensysteme
          </Link>{" "}
          an. Danach kannst du hier ihren Bestand erfassen.
        </p>
      ) : (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Zargen</h3>
          <div className="flex flex-col gap-1">
            {zargen.map((zarge) => (
              <ZargeZeile key={zarge.id} zarge={zarge} speichern={zargeBestandSpeichern} />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">
            Wird eine Zarge in der Stockkarte als Honigraum aufgesetzt oder einem Volk als Brutraum
            zugewiesen, sinkt &bdquo;verfügbar&ldquo; automatisch. Beim Ernten bzw. Auflösen steigt es
            wieder.
          </p>
        </div>
      )}

      <div>
        <h3 className="mb-1 text-sm font-semibold">Klimadeckel</h3>
        <p className="mb-2 text-xs text-muted">
          Ob ein Volk einen Klimadeckel hat, stellst du unter &bdquo;Volk bearbeiten&ldquo; ein.
          &bdquo;Im Einsatz&ldquo; zählt die Völker mit Klimadeckel. Standarddeckel werden nicht erfasst.
        </p>
        <div className="flex flex-col gap-1">
          {klimadeckel.map((deckel) => (
            <MaterialartikelZeile
              key={deckel.id}
              artikel={{ ...deckel, bestand: deckel.gesamtbestand }}
              lagerorte={lagerorte}
              speichern={materialartikelSpeichern}
              loeschen={materialartikelLoeschen}
              einsatz={{ imEinsatz: deckel.imEinsatz, verfuegbar: deckel.verfuegbar }}
            />
          ))}
          <NeuerMaterialartikel lagerorte={lagerorte} anlegen={materialartikelAnlegen} klimadeckel />
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Sonstiges Material</h3>
        <p className="mb-2 text-xs text-muted">
          Alles, was sich keiner Zarge zuordnen lässt: Böden, Standarddeckel, Absperrgitter, Werkzeug usw.
        </p>
        <div className="flex flex-col gap-1">
          {materialartikel.map((artikel) => (
            <MaterialartikelZeile
              key={artikel.id}
              artikel={artikel}
              lagerorte={lagerorte}
              speichern={materialartikelSpeichern}
              loeschen={materialartikelLoeschen}
            />
          ))}
          <NeuerMaterialartikel lagerorte={lagerorte} anlegen={materialartikelAnlegen} />
        </div>
      </div>
    </div>
  );
}
