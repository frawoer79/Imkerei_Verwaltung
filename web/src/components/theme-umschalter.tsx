"use client";

import { useSyncExternalStore } from "react";
import { Switch } from "@/components/ui";
import { IconMond, IconSonne } from "@/components/icons";

type Thema = "hell" | "dunkel";

// Minimaler Mechanismus, damit useSyncExternalStore mitbekommt, wenn sich
// das Thema (per Klick unten) geändert hat - es gibt kein natives
// Browser-Ereignis dafür.
const beobachter = new Set<() => void>();

function beobachten(callback: () => void) {
  beobachter.add(callback);
  return () => beobachter.delete(callback);
}

function ermittleAktuellesThema(): Thema {
  return document.documentElement.dataset.theme === "dark" ? "dunkel" : "hell";
}

// Auf dem Server ist unbekannt, welches Thema zuvor im Browser gewählt
// wurde - "hell" als neutraler Platzhalter, bis nach dem Einhängen im
// Browser der echte Wert feststeht.
function serverThema(): Thema {
  return "hell";
}

// Schaltet fest zwischen hell/dunkel um (unabhängig von der
// Systemeinstellung) und merkt sich die Wahl im Browser. Das eigentliche
// Setzen des Attributs beim ersten Laden übernimmt ein kleines Inline-Skript
// in layout.tsx, damit die Seite nicht kurz im falschen Modus aufblitzt.
export function ThemeUmschalter() {
  const thema = useSyncExternalStore(beobachten, ermittleAktuellesThema, serverThema);

  function umschalten() {
    const naechstesThema: Thema = ermittleAktuellesThema() === "dunkel" ? "hell" : "dunkel";
    document.documentElement.dataset.theme = naechstesThema === "dunkel" ? "dark" : "light";
    try {
      localStorage.setItem("theme", naechstesThema === "dunkel" ? "dark" : "light");
    } catch {
      // Browser blockiert lokalen Speicher (z.B. privates Fenster) - kein Blocker,
      // der Modus gilt dann nur für diesen Seitenaufruf.
    }
    beobachter.forEach((callback) => callback());
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      {thema === "dunkel" ? <IconMond className="h-4 w-4" /> : <IconSonne className="h-4 w-4" />}
      <Switch checked={thema === "dunkel"} onChange={umschalten} label="Hell-/Dunkelmodus umschalten" />
    </div>
  );
}
