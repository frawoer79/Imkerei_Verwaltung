"use client";

import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui";
import { MassnahmenUebersicht, type MassnahmeMitVolk } from "@/components/massnahmen-uebersicht";
import { massnahmenGruppieren } from "@/lib/massnahmen-gruppen";

const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];
const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/// "2026-10-17" - Termine werden als Tag ohne Uhrzeit gespeichert (UTC-Mitternacht),
/// heute dagegen zählt nach der Uhr im Browser.
function terminTag(datum: Date): string {
  return datum.toISOString().slice(0, 10);
}
function lokalerTag(jahr: number, monat: number, tag: number): string {
  return `${jahr}-${String(monat + 1).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}
function tagAnzeige(tag: string): string {
  const [jahr, monat, t] = tag.split("-");
  return `${t}.${monat}.${jahr}`;
}

// Monatskalender über den offenen Maßnahmen (ab Tablet-Breite zwei Monate
// nebeneinander): Tage mit Terminen sind markiert
// (rot = überfällig, gelb = heute, grün = kommt noch), der heutige Tag
// steht im gefüllten grünen Kreis, die Zahl nennt die
// Maßnahmen des Tages - eine Sammelmaßnahme oder Zuchtserie zählt einmal.
// Antippen eines Tages zeigt darunter nur dessen Maßnahmen.
export function MassnahmenMitKalender({
  offene,
  erledigte,
  heute: heuteServer,
}: {
  offene: MassnahmeMitVolk[];
  /// Nur zum Mitzählen bei Sammelmaßnahmen ("3/9 erledigt").
  erledigte: MassnahmeMitVolk[];
  heute: Date;
}) {
  const listeRef = useRef<HTMLDivElement>(null);
  const jetzt = new Date();
  const heute = lokalerTag(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate());
  const [monat, setMonat] = useState({ jahr: jetzt.getFullYear(), monat: jetzt.getMonth() });
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);

  const jeTag = useMemo(() => {
    const tage = new Map<string, MassnahmeMitVolk[]>();
    for (const massnahme of offene) {
      if (!massnahme.faelligAm) continue;
      const tag = terminTag(massnahme.faelligAm);
      tage.set(tag, [...(tage.get(tag) ?? []), massnahme]);
    }
    return tage;
  }, [offene]);

  function blaettern(schritt: number) {
    const datum = new Date(monat.jahr, monat.monat + schritt, 1);
    setMonat({ jahr: datum.getFullYear(), monat: datum.getMonth() });
  }

  const naechster = new Date(monat.jahr, monat.monat + 1, 1);
  const folgemonat = { jahr: naechster.getFullYear(), monat: naechster.getMonth() };

  // Ein Monatsblatt mit eigener Überschrift - am Handy steht nur der gewählte
  // Monat, ab Tablet-Breite (md) daneben zusätzlich der Folgemonat.
  function monatsblatt(blatt: { jahr: number; monat: number }) {
    const ersterWochentag = (new Date(blatt.jahr, blatt.monat, 1).getDay() + 6) % 7;
    const tageImMonat = new Date(blatt.jahr, blatt.monat + 1, 0).getDate();
    const zellen: (number | null)[] = [
      ...Array.from({ length: ersterWochentag }, () => null),
      ...Array.from({ length: tageImMonat }, (_, i) => i + 1),
    ];
    return (
      // Eigene, leicht abgesetzte Fläche je Monat, damit sich die Monate
      // vom Kachelhintergrund und voneinander abheben.
      <div className="rounded-lg border border-border bg-background p-2 sm:p-3">
        <h3 className="mb-2 px-1 font-semibold">
          {MONATE[blatt.monat]} {blatt.jahr}
        </h3>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {WOCHENTAGE.map((wochentag) => (
            <div key={wochentag} className="pb-0.5 text-sm font-semibold text-muted">
              {wochentag}
            </div>
          ))}
          {zellen.map((tagNummer, index) => {
            if (tagNummer === null) return <div key={`leer-${index}`} />;
            const tag = lokalerTag(blatt.jahr, blatt.monat, tagNummer);
            const termine = jeTag.get(tag);
            const zahl = termine ? massnahmenGruppieren(termine).length : 0;
            const istHeute = tag === heute;
            const farbe = !termine
              ? "border-transparent hover:bg-card"
              : tag < heute
                ? "border-gefahr-rand bg-gefahr-flaeche text-gefahr"
                : istHeute
                  ? "border-warnung-rand bg-warnung-flaeche text-warnung"
                  : "border-accent/50 bg-accent/15 text-accent";
            return (
              <button
                key={tag}
                type="button"
                disabled={!termine}
                onClick={() => {
                  setGewaehlt(gewaehlt === tag ? null : tag);
                  // Die Liste steht jetzt über dem Kalender - dorthin springen,
                  // sonst sähe man vom Antippen nichts.
                  if (gewaehlt !== tag) listeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                aria-pressed={gewaehlt === tag}
                aria-label={`${tagAnzeige(tag)}${zahl ? `, ${zahl} ${zahl === 1 ? "Maßnahme" : "Maßnahmen"}` : ""}`}
                className={`relative flex h-10 flex-col items-center justify-center gap-0.5 rounded-md border text-base font-medium leading-none disabled:cursor-default ${farbe} ${
                  gewaehlt === tag ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""
                }`}
              >
                <span
                  className={
                    istHeute
                      ? "flex h-7 w-7 items-center justify-center rounded-full bg-accent font-bold leading-none text-accent-foreground shadow-sm"
                      : ""
                  }
                >
                  {tagNummer}
                </span>
                {zahl > 0 && <span className="text-xs font-semibold leading-none">{zahl}×</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const liste = gewaehlt ? (jeTag.get(gewaehlt) ?? []) : offene;
  const anzahl = massnahmenGruppieren(offene).length;

  // Reihenfolge: erst die Liste (Überfälliges oben), dann der Kalender.
  return (
    <>
      <div ref={listeRef} className="flex scroll-mt-4 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {gewaehlt ? `Fällig am ${tagAnzeige(gewaehlt)}` : "Offen"}
            {!gewaehlt && anzahl > 0 && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 text-sm font-bold text-accent-foreground">
                {anzahl}
              </span>
            )}
          </h2>
          {gewaehlt && (
            <button
              type="button"
              onClick={() => setGewaehlt(null)}
              className="text-sm text-accent hover:underline"
            >
              Alle offenen zeigen ({anzahl})
            </button>
          )}
        </div>
        <MassnahmenUebersicht massnahmen={liste} heute={heuteServer} erledigte={erledigte} />
      </div>

      <Card className="p-4 sm:p-5 md:max-w-3xl">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="flex-1 text-lg font-semibold">Kalender</h2>
          <button
            type="button"
            onClick={() => setMonat({ jahr: jetzt.getFullYear(), monat: jetzt.getMonth() })}
            className="rounded-md border border-border px-2.5 py-1 text-xs hover:border-accent hover:text-accent"
          >
            Heute
          </button>
          <button
            type="button"
            onClick={() => blaettern(-1)}
            aria-label="Vorheriger Monat"
            className="h-8 w-8 rounded-md border border-border text-lg leading-none hover:border-accent hover:text-accent"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => blaettern(1)}
            aria-label="Nächster Monat"
            className="h-8 w-8 rounded-md border border-border text-lg leading-none hover:border-accent hover:text-accent"
          >
            ›
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {monatsblatt(monat)}
          <div className="hidden md:block">{monatsblatt(folgemonat)}</div>
        </div>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-(--marke-gefahr) align-middle" />
            überfällig
          </span>
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-(--marke-warnung) align-middle" />
            heute fällig
          </span>
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-accent/60 align-middle" />
            geplant
          </span>
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-accent align-middle" />
            Heute
          </span>
          <span>Tag antippen zeigt nur dessen Maßnahmen</span>
        </p>
      </Card>
    </>
  );
}
