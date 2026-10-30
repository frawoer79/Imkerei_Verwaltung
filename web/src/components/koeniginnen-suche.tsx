"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input, Select } from "@/components/ui";
import { AnsichtUmschalter, type Ansicht } from "@/components/ansicht-umschalter";
import { koeniginnenAnsichtSetzen } from "@/lib/actions";
import {
  BEGATTUNGSARTEN,
  BEGATTUNGSART_KURZ,
  KOENIGIN_SORTIERUNGEN,
  type KoeniginSuche,
  type KoeniginSortierung,
} from "@/lib/koeniginnen";


// Suche und Sortierung stehen in der Adresse (?q=...&sort=...), damit die
// Auswahl beim Zurückkommen von einer Königin erhalten bleibt und sich die
// gefilterte Liste als Lesezeichen speichern lässt. Gefiltert wird auf dem
// Server - das Feld schickt nur nach einer kurzen Tipp-Pause ab.
export function KoeniginnenSuche({
  werte,
  jahrgaenge,
  orte,
  staende,
  ansicht,
}: {
  werte: KoeniginSuche;
  jahrgaenge: number[];
  /// Belegstellen bzw. Begattungsstände zur gewählten Begattungsart - leer,
  /// wenn keine Art mit Ort gewählt ist.
  orte: { id: string; name: string }[];
  /// Bienenstände für die Stand-Auswahl.
  staende: { id: string; name: string }[];
  ansicht: Ansicht;
}) {
  const router = useRouter();
  const pfad = usePathname();
  const [suche, setSuche] = useState(werte.q);
  const [, startTransition] = useTransition();

  function anwenden(aenderung: Partial<KoeniginSuche>) {
    const neu = { ...werte, q: suche, ...aenderung };
    const params = new URLSearchParams();
    if (neu.q.trim()) params.set("q", neu.q.trim());
    if (neu.sort !== "jahrgang") params.set("sort", neu.sort);
    if (neu.jahrgang) params.set("jahrgang", neu.jahrgang);
    if (neu.begattung) params.set("begattung", neu.begattung);
    if (neu.begattung && neu.ort) params.set("ort", neu.ort);
    if (neu.stand) params.set("stand", neu.stand);
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pfad}?${query}` : pfad, { scroll: false }));
  }

  useEffect(() => {
    if (suche === werte.q) return;
    const zeitgeber = setTimeout(() => anwenden({ q: suche }), 300);
    return () => clearTimeout(zeitgeber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suche]);

  const gefiltert = werte.q || werte.jahrgang || werte.begattung || werte.stand;

  function zuruecksetzen() {
    setSuche("");
    anwenden({ q: "", jahrgang: "", begattung: "", ort: "", stand: "" });
  }

  const suchfeld = (
    <Input
      type="search"
      value={suche}
      onChange={(event) => setSuche(event.target.value)}
      placeholder="Suchen: Kennung, Volk, Stand, Rasse, Belegstelle, Mutter …"
      aria-label="Königinnen durchsuchen"
      className="sm:flex-1"
    />
  );

  return (
    <>
      <FilterChips
        werte={werte}
        jahrgaenge={jahrgaenge}
        orte={orte}
        staende={staende}
        ansicht={ansicht}
        suchfeld={suchfeld}
        anwenden={anwenden}
        zuruecksetzen={gefiltert ? zuruecksetzen : null}
      />
      <div className="hidden max-w-3xl flex-col gap-2 sm:flex">
        <div className="flex flex-col gap-2 sm:flex-row">
          {suchfeld}
          <Select
            value={werte.sort}
            onChange={(event) => anwenden({ sort: event.target.value as KoeniginSortierung })}
            aria-label="Sortierung"
            className="sm:w-56"
          >
            {KOENIGIN_SORTIERUNGEN.map((sortierung) => (
              <option key={sortierung.wert} value={sortierung.wert}>
                {sortierung.label}
              </option>
            ))}
          </Select>
          <AnsichtUmschalter ansicht={ansicht} />
        </div>
        <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
          <Select
            value={werte.stand}
            onChange={(event) => anwenden({ stand: event.target.value })}
            aria-label="Bienenstand"
            className="col-span-2 sm:w-48"
          >
            <option value="">Alle Stände</option>
            {staende.map((stand) => (
              <option key={stand.id} value={stand.id}>
                {stand.name}
              </option>
            ))}
            <option value="ohne">Ohne Volk</option>
          </Select>
          <Select
            value={werte.jahrgang}
            onChange={(event) => anwenden({ jahrgang: event.target.value })}
            aria-label="Jahrgang"
            className="sm:w-48"
          >
            <option value="">Alle Jahrgänge</option>
            {jahrgaenge.map((jahr) => (
              <option key={jahr} value={jahr}>
                Jahrgang {jahr}
              </option>
            ))}
          </Select>
          <Select
            value={werte.begattung}
            onChange={(event) => anwenden({ begattung: event.target.value, ort: "" })}
            aria-label="Begattung"
            className="sm:w-48"
          >
            <option value="">Jede Begattung</option>
            {BEGATTUNGSARTEN.map((art) => (
              <option key={art} value={art}>
                {BEGATTUNGSART_KURZ[art]}
              </option>
            ))}
          </Select>
          {orte.length > 0 && (
            <Select
              value={werte.ort}
              onChange={(event) => anwenden({ ort: event.target.value })}
              aria-label={werte.begattung === "BELEGSTELLE" ? "Belegstelle" : "Begattungsstand"}
              className="sm:w-48"
            >
              <option value="">
                {werte.begattung === "BELEGSTELLE" ? "Alle Belegstellen" : "Jeder Begattungsstand"}
              </option>
              {orte.map((ort) => (
                <option key={ort.id} value={ort.id}>
                  {ort.name}
                </option>
              ))}
            </Select>
          )}
          {gefiltert && (
            <button
              type="button"
              onClick={zuruecksetzen}
              className="col-span-2 cursor-pointer justify-self-start text-sm text-muted hover:text-accent"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      </div>
    </>
  );
}

type Auswahl = {
  schluessel: "sort" | "stand" | "jahrgang" | "begattung" | "ort" | "ansicht";
  titel: string;
  wert: string;
  optionen: { wert: string; label: string }[];
  /// Filter (leerer Wert = alle) zeigen auf dem Chip ihren Titel, solange
  /// nichts gewählt ist; Sortierung und Ansicht immer den gewählten Wert.
  istFilter: boolean;
};

// Handy-Variante: Suchfeld und darunter eine waagerecht wischbare Leiste
// mit einem Chip je Auswahl. Ein Chip öffnet seine Auswahl als Blatt von
// unten; ein gesetzter Filter ist am gefüllten Chip zu erkennen.
function FilterChips({
  werte,
  jahrgaenge,
  orte,
  staende,
  ansicht,
  suchfeld,
  anwenden,
  zuruecksetzen,
}: {
  werte: KoeniginSuche;
  jahrgaenge: number[];
  orte: { id: string; name: string }[];
  staende: { id: string; name: string }[];
  ansicht: Ansicht;
  suchfeld: React.ReactNode;
  anwenden: (aenderung: Partial<KoeniginSuche>) => void;
  zuruecksetzen: (() => void) | null;
}) {
  const [anzeigeAnsicht, setAnzeigeAnsicht] = useOptimistic(ansicht);
  const [, startTransition] = useTransition();
  const [offen, setOffen] = useState<Auswahl["schluessel"] | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const auswahlen: Auswahl[] = [
    {
      schluessel: "sort",
      titel: "Sortierung",
      wert: werte.sort,
      optionen: KOENIGIN_SORTIERUNGEN.map((eintrag) => ({ wert: eintrag.wert, label: eintrag.label })),
      istFilter: false,
    },
    {
      schluessel: "stand",
      titel: "Stand",
      wert: werte.stand,
      optionen: [
        { wert: "", label: "Alle Stände" },
        ...staende.map((stand) => ({ wert: stand.id, label: stand.name })),
        { wert: "ohne", label: "Ohne Volk" },
      ],
      istFilter: true,
    },
    {
      schluessel: "jahrgang",
      titel: "Jahrgang",
      wert: werte.jahrgang,
      optionen: [
        { wert: "", label: "Alle Jahrgänge" },
        ...jahrgaenge.map((jahr) => ({ wert: String(jahr), label: `Jahrgang ${jahr}` })),
      ],
      istFilter: true,
    },
    {
      schluessel: "begattung",
      titel: "Begattung",
      wert: werte.begattung,
      optionen: [
        { wert: "", label: "Jede Begattung" },
        ...BEGATTUNGSARTEN.map((art) => ({ wert: art, label: BEGATTUNGSART_KURZ[art] })),
      ],
      istFilter: true,
    },
    ...(orte.length > 0
      ? [
          {
            schluessel: "ort" as const,
            titel: werte.begattung === "BELEGSTELLE" ? "Belegstelle" : "Begattungsstand",
            wert: werte.ort,
            optionen: [
              { wert: "", label: werte.begattung === "BELEGSTELLE" ? "Alle Belegstellen" : "Jeder Begattungsstand" },
              ...orte.map((ort) => ({ wert: ort.id, label: ort.name })),
            ],
            istFilter: true,
          },
        ]
      : []),
    {
      schluessel: "ansicht",
      titel: "Ansicht",
      wert: anzeigeAnsicht,
      optionen: [
        { wert: "liste", label: "Liste" },
        { wert: "kacheln", label: "Kacheln" },
      ],
      istFilter: false,
    },
  ];
  const aktuell = auswahlen.find((auswahl) => auswahl.schluessel === offen);

  function oeffnen(schluessel: Auswahl["schluessel"]) {
    setOffen(schluessel);
    dialogRef.current?.showModal();
  }

  function waehlen(auswahl: Auswahl, wert: string) {
    dialogRef.current?.close();
    if (wert === auswahl.wert) return;
    if (auswahl.schluessel === "ansicht") {
      startTransition(async () => {
        setAnzeigeAnsicht(wert as Ansicht);
        await koeniginnenAnsichtSetzen(wert as Ansicht);
      });
    } else if (auswahl.schluessel === "begattung") {
      anwenden({ begattung: wert, ort: "" });
    } else {
      anwenden({ [auswahl.schluessel]: wert });
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:hidden">
      {suchfeld}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {auswahlen.map((auswahl) => {
          const gesetzt = auswahl.istFilter && auswahl.wert !== "";
          const label =
            auswahl.istFilter && !gesetzt
              ? auswahl.titel
              : (auswahl.optionen.find((option) => option.wert === auswahl.wert)?.label ?? auswahl.titel);
          return (
            <button
              key={auswahl.schluessel}
              type="button"
              onClick={() => oeffnen(auswahl.schluessel)}
              aria-label={`${auswahl.titel}: ${label}`}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-sm ${
                gesetzt ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"
              }`}
            >
              {label}
              <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="m5.5 8 4.5 4.5L14.5 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          );
        })}
        {zuruecksetzen && (
          <button
            type="button"
            onClick={zuruecksetzen}
            className="shrink-0 cursor-pointer px-2 text-sm text-muted hover:text-accent"
          >
            Zurücksetzen
          </button>
        )}
      </div>

      {/* Blatt von unten. Tippen neben das Blatt schließt es. */}
      <dialog
        ref={dialogRef}
        onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
        onClose={() => setOffen(null)}
        className="mx-0 mt-auto mb-0 w-full max-w-none rounded-t-2xl border-0 bg-card p-0 text-foreground shadow-lg backdrop:bg-black/40"
      >
        {aktuell && (
          <div
            className="flex max-h-[75vh] flex-col overflow-y-auto px-4 pt-2"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <span className="mb-2 h-1 w-10 self-center rounded-full bg-border" aria-hidden="true" />
            <div className="flex items-center justify-between py-1">
              <h2 className="text-lg font-semibold">{aktuell.titel}</h2>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="cursor-pointer text-sm font-medium text-accent"
              >
                Schließen
              </button>
            </div>
            {aktuell.optionen.map((option) => (
              <button
                key={option.wert}
                type="button"
                onClick={() => waehlen(aktuell, option.wert)}
                className={`flex cursor-pointer items-center justify-between border-b border-border py-3 text-left text-base last:border-b-0 ${
                  option.wert === aktuell.wert ? "font-semibold text-accent" : ""
                }`}
              >
                {option.label}
                {option.wert === aktuell.wert && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        )}
      </dialog>
    </div>
  );
}
