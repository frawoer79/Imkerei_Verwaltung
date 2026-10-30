// Ordnung der Lagerliste (Lager -> Erzeugnisse): nach Sorte (wie bisher)
// oder nach Gebinde. Die Wahl merkt sich jedes Gerät.
import { useSyncExternalStore } from "react";
import { GEBINDE_ART_NAME, GEBINDE_ARTEN, gebindeArt, loseName } from "@/lib/gebinde";
import type { ErzeugnisBestandGruppe } from "@/lib/lager";

export type LagerOrdnung = "sorte" | "gebinde";

const SCHLUESSEL = "lager-ordnung";
const EREIGNIS = "lager-ordnung";

function lesen(): LagerOrdnung {
  try {
    return localStorage.getItem(SCHLUESSEL) === "gebinde" ? "gebinde" : "sorte";
  } catch {
    // Ohne Speicher (privates Fenster) bleibt es beim Standard.
    return "sorte";
  }
}

function abonnieren(neuLesen: () => void): () => void {
  window.addEventListener(EREIGNIS, neuLesen);
  window.addEventListener("storage", neuLesen);
  return () => {
    window.removeEventListener(EREIGNIS, neuLesen);
    window.removeEventListener("storage", neuLesen);
  };
}

// Gewählte Ordnung dieses Geräts (localStorage). Der Server kennt sie nicht
// und zeigt zuerst "sorte", der Browser stellt danach um.
export function useLagerOrdnung(): [LagerOrdnung, (neu: LagerOrdnung) => void] {
  const ordnung = useSyncExternalStore(abonnieren, lesen, () => "sorte" as const);
  function setzen(neu: LagerOrdnung) {
    try {
      localStorage.setItem(SCHLUESSEL, neu);
    } catch {
      // Nicht speicherbar (privates Fenster): es bleibt beim Standard.
    }
    window.dispatchEvent(new Event(EREIGNIS));
  }
  return [ordnung, setzen];
}

export type PostenGruppe = {
  schluessel: string;
  titel: string;
  posten: ErzeugnisBestandGruppe[];
  menge: number;
  // Stückzahl, wenn alle Posten der Gruppe Gebinde haben, sonst null.
  anzahl: number | null;
};

// Bei Honig Gruppen Eimer/Gläser/Sonstige, sonst je Gebinde; ohne Gebinde
// zuletzt als "Gewicht" bzw. "Menge" (so heißt der Posten auch in der Liste).
function gebindeGruppe(
  posten: ErzeugnisBestandGruppe,
  honig: boolean,
  einheit: string,
): { schluessel: string; titel: string; rang: number } {
  if (!posten.gebindeName) return { schluessel: "gewicht", titel: loseName(einheit), rang: 9 };
  if (!honig) return { schluessel: `g:${posten.gebindeName}`, titel: posten.gebindeName, rang: 0 };
  const art = gebindeArt(posten.gebindeName);
  return { schluessel: art, titel: GEBINDE_ART_NAME[art], rang: GEBINDE_ARTEN.indexOf(art) };
}

// Die Posten kommen vom Server schon nach Sorte sortiert (lib/lager.ts),
// "sorte" behält diese Reihenfolge. "gebinde": Gruppe, große Gebinde vor
// kleinen, dann wie bisher.
export function postenGruppieren(
  posten: ErzeugnisBestandGruppe[],
  ordnung: LagerOrdnung,
  honig: boolean,
  einheit: string,
): PostenGruppe[] {
  const gruppen = new Map<string, PostenGruppe & { rang: number }>();
  const liste =
    ordnung === "sorte"
      ? posten
      : posten
          .map((eintrag, index) => ({ eintrag, index, gruppe: gebindeGruppe(eintrag, honig, einheit) }))
          .sort(
            (a, b) =>
              a.gruppe.rang - b.gruppe.rang ||
              a.gruppe.titel.localeCompare(b.gruppe.titel) ||
              (b.eintrag.gebindeInhalt ?? -1) - (a.eintrag.gebindeInhalt ?? -1) ||
              a.index - b.index,
          )
          .map(({ eintrag }) => eintrag);
  for (const eintrag of liste) {
    const { schluessel, titel, rang } =
      ordnung === "sorte"
        ? { schluessel: `s:${eintrag.sorteId ?? ""}`, titel: eintrag.sorteName ?? "Ohne Sorte", rang: 0 }
        : gebindeGruppe(eintrag, honig, einheit);
    const gruppe = gruppen.get(schluessel) ?? { schluessel, titel, rang, posten: [], menge: 0, anzahl: 0 };
    gruppe.posten.push(eintrag);
    gruppe.menge = Math.round((gruppe.menge + eintrag.menge) * 1000) / 1000;
    gruppe.anzahl = gruppe.anzahl !== null && eintrag.gebindeId ? gruppe.anzahl + (eintrag.anzahl ?? 0) : null;
    gruppen.set(schluessel, gruppe);
  }
  return [...gruppen.values()];
}
