"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input, knopfKlassen } from "@/components/ui";
import { anzeigeFarbe } from "@/lib/koeniginnen";
import { MAX_KARTEN_PRO_BLATT } from "@/lib/zuchtkarte-inhalt";
import { KoeniginStern } from "@/components/koenigin-stern";

export type KarteZurAuswahl = {
  koeniginId: string;
  kennung: string;
  stern: boolean;
  rasse: string | null;
  jahrgang: number | null;
  zeichenFarbe: string | null;
  /// "03.10.2026" - wann die Karte zuletzt gespeichert wurde.
  stand: string;
};

// Auswahl von bis zu fünf Zuchtkarten, die gemeinsam auf ein A4-Blatt quer
// gedruckt werden. Die Reihenfolge des Anhakens ist die Reihenfolge auf dem
// Blatt (die zuerst gewählte steht links).
export function ZuchtkartenAuswahl({
  karten,
  vorauswahl,
}: {
  karten: KarteZurAuswahl[];
  /// Königin, deren Karte schon angehakt sein soll (Weg von ihrer Seite).
  vorauswahl: string | null;
}) {
  const [gewaehlt, setGewaehlt] = useState<string[]>(
    vorauswahl && karten.some((karte) => karte.koeniginId === vorauswahl) ? [vorauswahl] : []
  );
  const [suche, setSuche] = useState("");

  const sichtbar = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    if (!begriff) return karten;
    return karten.filter((karte) =>
      [karte.kennung, karte.rasse, karte.jahrgang].join(" ").toLowerCase().includes(begriff)
    );
  }, [karten, suche]);

  const voll = gewaehlt.length >= MAX_KARTEN_PRO_BLATT;

  function umschalten(koeniginId: string) {
    setGewaehlt((alt) =>
      alt.includes(koeniginId)
        ? alt.filter((id) => id !== koeniginId)
        : alt.length < MAX_KARTEN_PRO_BLATT
          ? [...alt, koeniginId]
          : alt
    );
  }

  const druckHref = `/koeniginnen/zuchtkarten/druck?ids=${gewaehlt.join(",")}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          placeholder="Königin suchen …"
          value={suche}
          onChange={(ereignis) => setSuche(ereignis.target.value)}
          className="sm:max-w-xs"
        />
        <p className="text-sm text-muted" aria-live="polite">
          {gewaehlt.length} von {MAX_KARTEN_PRO_BLATT} gewählt
          {voll && " (Blatt ist voll)"}
        </p>
      </div>

      {sichtbar.length === 0 ? (
        <p className="text-sm text-muted">Keine Karte gefunden.</p>
      ) : (
        <ul className="flex flex-col">
          {sichtbar.map((karte) => {
            const position = gewaehlt.indexOf(karte.koeniginId);
            const angehakt = position >= 0;
            const gesperrt = voll && !angehakt;
            const farbe = anzeigeFarbe(karte.jahrgang, karte.zeichenFarbe);
            return (
              <li key={karte.koeniginId} className="border-b border-border last:border-b-0">
                <label
                  className={`flex items-center gap-3 py-2.5 ${gesperrt ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    checked={angehakt}
                    disabled={gesperrt}
                    onChange={() => umschalten(karte.koeniginId)}
                    className="h-5 w-5 shrink-0 accent-[var(--accent)]"
                  />
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-rand-bedienung"
                    style={{ background: farbe?.hex ?? "transparent" }}
                    title={farbe ? `gezeichnet ${farbe.name}` : "keine Zeichenfarbe"}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-sm font-medium">
                      {karte.kennung}
                      {karte.stern && <KoeniginStern className="h-7 w-7" />}
                    </span>
                    <span className="block text-xs text-muted">
                      {[karte.rasse, karte.jahrgang && `Jahrgang ${karte.jahrgang}`, `Karte vom ${karte.stand}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {angehakt && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
                      {position + 1}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {gewaehlt.length > 0 ? (
          <a
            href={druckHref}
            target="_blank"
            rel="noreferrer"
            className={knopfKlassen("primary", "klein")}
          >
            {gewaehlt.length === 1 ? "Karte drucken" : `${gewaehlt.length} Karten drucken`}
          </a>
        ) : (
          <span
            aria-disabled="true"
            className={`${knopfKlassen("primary", "klein")} opacity-50 pointer-events-none`}
          >
            Karten drucken
          </span>
        )}
        {gewaehlt.length > 0 && (
          <button
            type="button"
            onClick={() => setGewaehlt([])}
            className="rounded-md px-3 py-2 text-sm text-muted hover:text-foreground"
          >
            Auswahl leeren
          </button>
        )}
        <Link href="/koeniginnen" className="ml-auto text-sm text-muted hover:text-accent">
          Zurück zu den Königinnen
        </Link>
      </div>
    </div>
  );
}
