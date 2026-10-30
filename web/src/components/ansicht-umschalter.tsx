"use client";

import { useOptimistic, useTransition } from "react";
import { IconKacheln, IconListe } from "@/components/icons";
import { koeniginnenAnsichtSetzen } from "@/lib/actions";

export type Ansicht = "liste" | "kacheln";

const OPTIONEN: { wert: Ansicht; label: string; Icon: typeof IconListe }[] = [
  { wert: "liste", label: "Liste", Icon: IconListe },
  { wert: "kacheln", label: "Kacheln", Icon: IconKacheln },
];

// Schaltet die Königinnen-Übersicht zwischen Liste und Kacheln um. Die Wahl
// speichert der Server als Cookie, damit die Seite beim nächsten Öffnen gleich
// in der gewählten Ansicht kommt (kein kurzes Aufblitzen der anderen).
export function AnsichtUmschalter({ ansicht }: { ansicht: Ansicht }) {
  const [anzeige, setAnzeige] = useOptimistic(ansicht);
  const [, startTransition] = useTransition();

  function waehlen(wert: Ansicht) {
    if (wert === anzeige) return;
    startTransition(async () => {
      setAnzeige(wert);
      await koeniginnenAnsichtSetzen(wert);
    });
  }

  return (
    <div className="flex shrink-0 overflow-hidden rounded-md border border-border" role="group" aria-label="Ansicht">
      {OPTIONEN.map(({ wert, label, Icon }, index) => (
        <button
          key={wert}
          type="button"
          onClick={() => waehlen(wert)}
          aria-pressed={anzeige === wert}
          className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium ${index > 0 ? "border-l border-border" : ""} ${
            anzeige === wert ? "bg-accent text-accent-foreground" : "bg-card hover:bg-background"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
