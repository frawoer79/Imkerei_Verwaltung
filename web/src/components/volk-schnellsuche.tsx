"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Input } from "@/components/ui";
import { natuerlich } from "@/lib/sortierung";

export type SuchVolk = { id: string; name: string; standName: string };

const MAX_TREFFER = 8;

// Suchfeld über den Standkacheln: Name oder Nummer eines Volkes tippen, Treffer
// antippen, schon ist man auf der Volk-Seite. Scannen des QR-Codes bleibt der
// schnellste Weg - die Suche ist für Völker ohne Code am Stock.
export function VolkSchnellsuche({ voelker }: { voelker: SuchVolk[] }) {
  const [eingabe, setEingabe] = useState("");
  const listeId = useId();
  const suche = eingabe.trim().toLocaleLowerCase("de");

  const treffer = useMemo(() => {
    if (!suche) return [];
    const gefunden = voelker.filter((volk) => volk.name.toLocaleLowerCase("de").includes(suche));
    // Wer "7" tippt, will "Volk 7" und nicht zuerst "Volk 17": ganze Wörter vorn.
    const rang = (volk: SuchVolk) =>
      volk.name.toLocaleLowerCase("de").split(/\s+/).includes(suche) ? 0 : 1;
    return gefunden.sort(
      (a, b) => rang(a) - rang(b) || natuerlich(a.standName, b.standName) || natuerlich(a.name, b.name)
    );
  }, [suche, voelker]);

  if (voelker.length === 0) return null;

  return (
    <div className="flex flex-col gap-2" role="search">
      <Input
        type="search"
        value={eingabe}
        onChange={(event) => setEingabe(event.target.value)}
        placeholder="Volk suchen (Name oder Nummer)"
        aria-label="Volk suchen (Name oder Nummer)"
        aria-controls={listeId}
        autoComplete="off"
        enterKeyHint="search"
        className="min-h-12 text-base"
      />
      <div id={listeId} aria-live="polite">
        {suche && treffer.length === 0 && <p className="px-1 text-sm text-muted">Kein Volk gefunden.</p>}
        {treffer.length > 0 && (
          <ul className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-md">
            {treffer.slice(0, MAX_TREFFER).map((volk) => (
              <li key={volk.id} className="border-b border-border last:border-b-0">
                <Link
                  href={`/voelker/${volk.id}`}
                  className="flex min-h-12 items-center gap-2 px-4 py-2 hover:bg-background"
                >
                  <span className="font-medium">{volk.name}</span>
                  <span className="text-sm text-muted">· {volk.standName}</span>
                </Link>
              </li>
            ))}
            {treffer.length > MAX_TREFFER && (
              <li className="px-4 py-2 text-sm text-muted">
                {treffer.length - MAX_TREFFER} weitere Treffer. Bitte genauer suchen.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
