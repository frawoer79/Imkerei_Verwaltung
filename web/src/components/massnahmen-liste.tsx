"use client";

import { useState } from "react";
import Link from "next/link";
import { massnahmeHinzufuegen, massnahmeLoeschen } from "@/lib/actions";
import { Button } from "@/components/ui";
import { useAbhaken, useWartendeHaken } from "@/lib/use-abhaken";
import { LoeschenButton } from "@/components/loeschen-button";
import { MassnahmeFelder } from "@/components/massnahme-felder";
import { MassnahmeBearbeitenFormular } from "@/components/massnahme-bearbeiten-formular";
import {
  FAELLIGKEIT_KAERTCHEN,
  FAELLIGKEIT_PLAKETTE,
  FAELLIGKEIT_RAHMEN,
  FAELLIGKEIT_TEXT,
  KAERTCHEN_BASIS,
  faelligkeitBestimmen,
  faelligkeitText,
  plakettenText,
} from "@/lib/faelligkeit";

export type MassnahmeWert = {
  id: string;
  text: string;
  faelligAm: Date | null;
  erledigt: boolean;
  /// Weiterführender Knopf, z.B. "Behandlung eintragen" beim
  /// Medikamenten-Schritt eines biotechnischen Verfahrens.
  link?: { href: string; text: string };
};

function datumAnzeige(datum: Date): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(datum);
}

// Eigenständig von der übrigen Sperr-/Entsperr-Logik des Eintrags: Maßnahmen
// sollen sich jederzeit abhaken lassen, auch ohne den Eintrag extra zum
// Bearbeiten zu entsperren.
export function MassnahmenListe({
  volkId,
  stockkartenEintragId,
  massnahmen,
  heute,
  kompakt = false,
}: {
  volkId: string;
  /// Ohne Eintrag (lose Maßnahme im Verlauf des Volkes) gibt es kein
  /// Formular zum Hinzufügen - die Liste zeigt nur, was übergeben wird.
  stockkartenEintragId?: string;
  massnahmen: MassnahmeWert[];
  heute: Date;
  /// Nur Haken, Text und Termin - ohne Bearbeiten und Löschen (für die
  /// Karte "Offene Maßnahmen" oben auf der Volk-Seite).
  kompakt?: boolean;
}) {
  const [bearbeiteId, setBearbeiteId] = useState<string | null>(null);
  const abhaken = useAbhaken();
  // Haken, die noch in der Warteschlange liegen, zählen schon. Die Karte
  // oben auf der Volk-Seite zeigt nur offene: dort verschwindet ein
  // abgehakter wie nach dem Speichern.
  const haken = useWartendeHaken();
  const aktuell = massnahmen
    .map((massnahme) => (haken.has(massnahme.id) ? { ...massnahme, erledigt: haken.get(massnahme.id)! } : massnahme))
    .filter((massnahme) => !kompakt || !massnahme.erledigt);
  const offene = aktuell.filter((massnahme) => !massnahme.erledigt);
  const erledigte = aktuell.filter((massnahme) => massnahme.erledigt);

  return (
    <div className={`flex flex-col ${kompakt ? "gap-2" : "gap-3"}`}>
      {massnahmen.length === 0 && stockkartenEintragId && <p className="text-sm text-muted">Noch keine Maßnahmen angelegt.</p>}

      {[...offene, ...erledigte].map((massnahme) => {
        const faelligkeit = massnahme.erledigt
          ? "ohne"
          : faelligkeitBestimmen(massnahme.faelligAm, heute);
        // Kompakt (Karte oben auf der Volk-Seite) wie auf der Maßnahmen-Seite:
        // weißes Kärtchen mit Farbleiste und Termin-Plakette.
        const kaertchen = kompakt && !massnahme.erledigt;
        return (
        <div
          key={massnahme.id}
          className={
            kaertchen
              ? `flex items-center gap-3 px-3 py-3 ${KAERTCHEN_BASIS} ${FAELLIGKEIT_KAERTCHEN[faelligkeit]}`
              : `flex flex-wrap items-start gap-3 rounded-md border px-3 py-2 ${
                  massnahme.erledigt ? "border-border bg-background" : FAELLIGKEIT_RAHMEN[faelligkeit]
                }`
          }
        >
          {/* Ganze 48-px-Fläche ist das Tippziel (Handschuhe); die Ränder ragen
              über das Polster der Zeile hinaus, damit die Zeile nicht höher wird.
              Gesendet wird über die Warteschlange (lib/use-abhaken.ts). */}
          <label className="-m-3 flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center">
            <input
              key={String(massnahme.erledigt)}
              type="checkbox"
              data-schreibt-gesperrt
              defaultChecked={massnahme.erledigt}
              onChange={() => void abhaken([{ ...massnahme, volkId }], !massnahme.erledigt)}
              aria-label={massnahme.erledigt ? "Als offen markieren" : "Als erledigt markieren"}
              className="h-6 w-6 cursor-pointer accent-accent"
            />
          </label>

          {bearbeiteId === massnahme.id ? (
            <MassnahmeBearbeitenFormular
              massnahme={massnahme}
              fertig={() => setBearbeiteId(null)}
            />
          ) : (
            <>
              <div className={kaertchen ? "min-w-0 flex-1" : "min-w-40 flex-1"}>
                <p
                  className={
                    massnahme.erledigt
                      ? "text-sm text-muted line-through"
                      : kaertchen
                        ? "text-[15px] font-semibold leading-snug"
                        : "text-sm font-medium"
                  }
                >
                  {massnahme.text}
                </p>
                {haken.has(massnahme.id) && <p className="text-xs text-warnung">Haken wartet auf Senden</p>}
                {massnahme.faelligAm && !kaertchen && (
                  <p
                    className={`text-xs ${
                      massnahme.erledigt ? "text-muted" : FAELLIGKEIT_TEXT[faelligkeit]
                    }`}
                  >
                    {faelligkeitText(faelligkeit, datumAnzeige(massnahme.faelligAm))}
                  </p>
                )}
                {massnahme.link && !massnahme.erledigt && (
                  <Link href={massnahme.link.href} className="mt-1 inline-block text-sm font-medium text-accent underline">
                    {massnahme.link.text}
                  </Link>
                )}
              </div>

              {kaertchen && (
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${FAELLIGKEIT_PLAKETTE[faelligkeit]}`}
                  title={massnahme.faelligAm ? faelligkeitText(faelligkeit, datumAnzeige(massnahme.faelligAm)) : undefined}
                >
                  {plakettenText(faelligkeit, massnahme.faelligAm, heute)}
                </span>
              )}

              {!kompakt && (
              <div className="flex shrink-0 gap-2">
                <Button data-schreibt
                  type="button"
                  variant="secondary"
                  groesse="mittel"
                  onClick={() => setBearbeiteId(massnahme.id)}
                >
                  Bearbeiten
                </Button>
                <LoeschenButton
                  action={massnahmeLoeschen.bind(null, massnahme.id)}
                  bestaetigung="Diese Maßnahme wirklich löschen?"
                  groesse="mittel"
                >
                  Löschen
                </LoeschenButton>
              </div>
              )}
            </>
          )}
        </div>
        );
      })}

      {stockkartenEintragId && (
      <form
        action={massnahmeHinzufuegen.bind(null, volkId, stockkartenEintragId)}
        className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-end"
      >
        <MassnahmeFelder idPraefix={`neu-${stockkartenEintragId}`} />
        <Button type="submit" variant="secondary">
          Hinzufügen
        </Button>
      </form>
      )}
    </div>
  );
}
