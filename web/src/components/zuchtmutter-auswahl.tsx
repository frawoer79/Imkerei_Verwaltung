"use client";

import { useMemo, useState } from "react";
import { Input, Select } from "@/components/ui";
import { KoeniginStern } from "@/components/koenigin-stern";
import { anzeigeFarbe } from "@/lib/koeniginnen";
import type { Zuchtmutterkandidat } from "@/lib/zucht-daten";

// Auswahl der Zuchtmutter: die gewählte Königin steht als hervorgehobene
// Karte da, die übrigen nur, solange die Auswahl aufgeklappt ist - mit
// Suchfeld und Standfilter, damit auch bei vielen Königinnen am Handy nicht
// alles untereinander steht. Das Volk ist nur Zusatzinfo: nachgezogen wird
// von der Königin, das Zuchtvolk ergibt sich daraus, wo sie gerade sitzt.

const note = (wert: number) => wert.toFixed(1).replace(".", ",");

function Zeichen({ kandidat, gross = false }: { kandidat: Zuchtmutterkandidat; gross?: boolean }) {
  const farbe = anzeigeFarbe(kandidat.jahrgang, kandidat.zeichenFarbe);
  return (
    <span
      className={`${gross ? "h-7 w-7" : "h-5 w-5"} shrink-0 rounded-full border border-rand-bedienung`}
      style={{ background: farbe?.hex ?? "transparent" }}
      title={farbe ? `Zeichen ${farbe.name}` : "nicht gezeichnet"}
    />
  );
}

function Note({ kandidat }: { kandidat: Zuchtmutterkandidat }) {
  if (kandidat.gesamtnote === null) return null;
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${kandidat.gesamtnoteFarbe ?? ""}`}
      title="Gesamtnote aus der Bewertung"
    >
      {note(kandidat.gesamtnote)}
    </span>
  );
}

function wo(kandidat: Zuchtmutterkandidat): string {
  return kandidat.volkName ? `${kandidat.volkName} · ${kandidat.standName}` : "sitzt in keinem Volk mehr";
}

function bewertung(kandidat: Zuchtmutterkandidat): string {
  return (
    [
      ...kandidat.kriterien.map((kriterium) => `${kriterium.label} ${note(kriterium.schulnote)}`),
      kandidat.honigSummeKg > 0 && `${note(kandidat.honigSummeKg)} kg Honig`,
      kandidat.anzahlToechter > 0 && `${kandidat.anzahlToechter} Töchter`,
    ]
      .filter(Boolean)
      .join(" · ") || "noch keine Bewertung"
  );
}

export function ZuchtmutterAuswahl({
  kandidaten,
  anfangsWert,
  onChange,
}: {
  kandidaten: Zuchtmutterkandidat[];
  anfangsWert: string;
  onChange?: (koeniginId: string) => void;
}) {
  const [gewaehltId, setGewaehltIdIntern] = useState(anfangsWert);
  const setGewaehltId = (koeniginId: string) => {
    setGewaehltIdIntern(koeniginId);
    onChange?.(koeniginId);
  };
  const [offen, setOffen] = useState(!anfangsWert);
  const [suche, setSuche] = useState("");
  const [stand, setStand] = useState("");

  const gewaehlt = kandidaten.find((kandidat) => kandidat.koeniginId === gewaehltId);
  const staende = useMemo(
    () =>
      [...new Set(kandidaten.map((kandidat) => kandidat.standName).filter((name): name is string => !!name))].sort(
        (a, b) => a.localeCompare(b, "de")
      ),
    [kandidaten]
  );
  const begriff = suche.trim().toLowerCase();
  const gefiltert = kandidaten.filter(
    (kandidat) =>
      (!stand || kandidat.standName === stand) &&
      (!begriff ||
        [kandidat.kennung, kandidat.volkName, kandidat.standName, kandidat.rasse]
          .filter(Boolean)
          .some((text) => text!.toLowerCase().includes(begriff)))
  );

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="mutterKoeniginId" value={gewaehltId} />

      {gewaehlt ? (
        <div className="flex items-center gap-3 rounded-lg border-2 border-accent bg-accent/10 p-3">
          <Zeichen kandidat={gewaehlt} gross />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 whitespace-nowrap text-base font-semibold">
              {gewaehlt.kennung}
              {gewaehlt.stern && <KoeniginStern className="h-7 w-7" />}
            </p>
            <p className="text-sm">im {wo(gewaehlt)}</p>
            <p className="text-xs text-muted">
              {[gewaehlt.rasse, gewaehlt.jahrgang && `Jg. ${gewaehlt.jahrgang}`].filter(Boolean).join(" · ")}
            </p>
            <p className="truncate text-xs text-muted">{bewertung(gewaehlt)}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Note kandidat={gewaehlt} />
            {!offen && (
              <button
                type="button"
                onClick={() => setOffen(true)}
                className="rounded-md border border-border bg-card px-3 py-1 text-sm font-medium hover:border-accent hover:text-accent"
              >
                Ändern
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-lg border-2 border-dashed border-border p-3 text-sm text-muted">
          Noch keine Zuchtmutter gewählt.
        </p>
      )}

      {offen && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
          {kandidaten.length === 0 ? (
            <p className="text-sm text-muted">Noch keine Königin erfasst, die in einem Volk sitzt.</p>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="search"
                  placeholder="Kennung, Volk oder Stand suchen"
                  value={suche}
                  onChange={(event) => setSuche(event.target.value)}
                  aria-label="Königin suchen"
                  className="bg-card sm:flex-1"
                />
                {staende.length > 1 && (
                  <Select
                    value={stand}
                    onChange={(event) => setStand(event.target.value)}
                    aria-label="Nach Stand filtern"
                    className="bg-card sm:w-48"
                  >
                    <option value="">alle Stände</option>
                    {staende.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
              <p className="text-xs text-muted">Beste Bewertung zuerst. Antippen wählt die Königin.</p>
              <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto" role="listbox" aria-label="Zuchtmutter">
                {gefiltert.map((kandidat) => {
                  const aktiv = kandidat.koeniginId === gewaehltId;
                  return (
                    <li key={kandidat.koeniginId}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={aktiv}
                        onClick={() => {
                          setGewaehltId(kandidat.koeniginId);
                          setOffen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-md border px-2 py-2 text-left ${aktiv ? "border-accent bg-accent/10" : "border-transparent bg-card hover:border-accent"}`}
                      >
                        <Zeichen kandidat={kandidat} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1 text-sm font-medium">
                            {kandidat.kennung}
                            {kandidat.stern && <KoeniginStern className="h-6 w-6" />}
                          </span>
                          <span className="block truncate text-xs text-muted">{wo(kandidat)}</span>
                        </span>
                        <Note kandidat={kandidat} />
                      </button>
                    </li>
                  );
                })}
                {gefiltert.length === 0 && <li className="px-2 py-2 text-sm text-muted">Keine Königin gefunden.</li>}
              </ul>
              {gewaehlt && (
                <button
                  type="button"
                  onClick={() => setOffen(false)}
                  className="self-end text-sm text-muted hover:text-accent"
                >
                  Auswahl schließen
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
