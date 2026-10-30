"use client";

import { useCallback, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { massnahmenErledigtSetzen } from "@/lib/actions";
import { rueckgaengigAnbieten } from "@/lib/rueckgaengig";
import {
  abonnieren,
  einreihenUndSenden,
  erledigtSendung,
  serverZustand,
  wartendeHaken,
  zustandLesen,
} from "@/lib/warteschlange";

// Maßnahmen abhaken über die Warteschlange (lib/warteschlange.ts): Im
// Funkloch bleibt der Haken auf dem Gerät und wird nachgesendet. Die Listen
// zeigen mit useWartendeHaken() schon den neuen Stand.

export type AbhakMassnahme = { id: string; text: string; volkId: string };

export function useAbhaken() {
  const router = useRouter();
  const pfad = usePathname();

  return useCallback(
    function abhaken(massnahmen: AbhakMassnahme[], erledigt: boolean, mitRueckgaengig = true): Promise<void> {
      if (massnahmen.length === 0) return Promise.resolve();
      if (mitRueckgaengig) {
        const voelker = new Set(massnahmen.map((massnahme) => massnahme.volkId)).size;
        rueckgaengigAnbieten(
          `${erledigt ? "Erledigt" : "Wieder offen"}: ${massnahmen[0].text}${voelker > 1 ? ` (${voelker} Völker)` : ""}`,
          () => abhaken(massnahmen, !erledigt, false)
        );
      }
      return (async () => {
        const ergebnis = await einreihenUndSenden(erledigtSendung(massnahmen, erledigt, pfad));
        // Ohne Warteschlange (kein IndexedDB) wie früher direkt senden.
        if (ergebnis === null) {
          await massnahmenErledigtSetzen(
            massnahmen.map((massnahme) => massnahme.id),
            erledigt
          );
        }
        if (ergebnis === null || ergebnis.art === "ok") router.refresh();
      })();
    },
    [router, pfad]
  );
}

/// Maßnahme -> erledigt ja/nein, solange der Haken noch nicht angekommen ist.
export function useWartendeHaken(): Map<string, boolean> {
  const { sendungen } = useSyncExternalStore(abonnieren, zustandLesen, serverZustand);
  return wartendeHaken(sendungen);
}
