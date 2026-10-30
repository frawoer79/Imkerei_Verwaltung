"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  rueckgaengigAbonnieren,
  rueckgaengigLesen,
  rueckgaengigSchliessen,
} from "@/lib/rueckgaengig";

// Wie lange die Leiste zum Rückgängigmachen stehen bleibt.
const ANZEIGEDAUER_MS = 6000;

// Leiste unten am Bildschirm: "Erledigt: Varroa-Windel ziehen · Rückgängig".
// Ein Fehltipp beim Abhaken lässt sich damit zurücknehmen, ohne die Maßnahme
// in der Liste der Erledigten suchen zu müssen. Sie liegt im Layout, damit sie
// den Seitenwechsel und das Neuladen der Liste überlebt.
export function RueckgaengigLeiste() {
  const angebot = useSyncExternalStore(rueckgaengigAbonnieren, rueckgaengigLesen, () => null);
  const [laeuft, setLaeuft] = useState(false);
  // Nummer des Angebots, bei dem das Rückgängigmachen scheiterte.
  const [fehlerNummer, setFehlerNummer] = useState<number | null>(null);
  const nummer = angebot?.nummer;
  const fehler = nummer !== undefined && fehlerNummer === nummer;

  useEffect(() => {
    if (nummer === undefined) return;
    const timer = setTimeout(rueckgaengigSchliessen, ANZEIGEDAUER_MS);
    return () => clearTimeout(timer);
  }, [nummer]);

  if (!angebot) return null;

  async function zuruecknehmen() {
    if (!angebot) return;
    setLaeuft(true);
    try {
      await angebot.aktion();
      rueckgaengigSchliessen();
    } catch {
      // Keine Verbindung o. Ä.: Leiste bleibt, ein zweiter Versuch ist möglich.
      setFehlerNummer(angebot.nummer);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-border bg-foreground py-2 pl-4 pr-2 text-sm text-background shadow-lg print:hidden"
    >
      <span className="min-w-0 flex-1 break-words">
        {fehler ? "Rückgängig fehlgeschlagen. Bitte Verbindung prüfen." : angebot.text}
      </span>
      <button
        type="button"
        onClick={zuruecknehmen}
        disabled={laeuft}
        className="inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-md px-3 font-semibold underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
      >
        {fehler ? "Nochmal" : "Rückgängig"}
      </button>
    </div>
  );
}
