"use client";

import Link from "next/link";
import { Suspense, useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { menuepunktZuPfad } from "@/components/navigation";
import { IconWinkelRechts, IconZurueck } from "@/components/icons";
import {
  formularAbgeschickt,
  pfadOhneSuche,
  seiteErfassen,
  verlaufAbonnieren,
  verlaufLeeren,
  verlaufLesen,
  verlaufRoh,
  vorherigeSeite,
} from "@/lib/seitenverlauf";

export type Station = { href: string; label: string };

// Zeile über der Seitenüberschrift, auf jeder Seite gleich aufgebaut:
//
//   [← Zurück]   ⌂ Bienenstände › Stand Dachtel
//
// - "Zurück" führt auf die Seite, von der man tatsächlich gekommen ist
//   (siehe lib/seitenverlauf.ts). Gibt es keine - Seite per QR-Code, Link
//   oder in neuem Tab geöffnet -, führt er eine Ebene höher, damit man nie
//   aus der App fällt.
// - Rechts daneben der Pfad: zuerst der Menüpunkt (mit seinem Symbol aus dem
//   Menü, ergibt sich aus der Adresse), dann die übergeordneten Seiten. Jede
//   Station ist anklickbar - damit bleibt der direkte Sprung zum Menüpunkt.
//
// `pfad`: die übergeordneten Seiten zwischen Menüpunkt und aktueller Seite,
// von oben nach unten. Die aktuelle Seite selbst steht nicht drin (sie ist die
// Überschrift darunter). Auf den Hauptseiten der Menüpunkte bleibt `pfad`
// leer; dort erscheint die Zeile nur, wenn man von einer anderen App-Seite
// kam (dann nur mit "Zurück").
export function SeitenNavigation({
  pfad = [],
  menuepunkt,
  hauptseite = false,
  className = "",
}: {
  pfad?: Station[];
  // Seite steht gleichrangig neben der Hauptseite des Menüpunkts (Reiter):
  // kein Pfad, "Zurück" nur mit App-Vorgeschichte.
  hauptseite?: boolean;
  // Nur nötig, wo sich der Menüpunkt nicht aus der Adresse ergibt.
  menuepunkt?: string;
  className?: string;
}) {
  const router = useRouter();
  const aktuellerPfad = usePathname();
  const roh = useSyncExternalStore(verlaufAbonnieren, verlaufRoh, () => null);

  const menue = menuepunktZuPfad(menuepunkt ?? aktuellerPfad);
  // Der Menüpunkt erscheint nur, wenn man nicht schon auf seiner Hauptseite ist.
  const stationen: (Station & { icon?: (props: { className?: string }) => React.ReactNode })[] = [];
  if (menue && menue.href !== aktuellerPfad && !hauptseite) stationen.push(menue);
  stationen.push(...pfad);

  const vorherige = vorherigeSeite(verlaufLesen(roh), aktuellerPfad);
  const uebergeordnet = stationen[stationen.length - 1]?.href ?? null;

  if (!vorherige && !uebergeordnet) return null;

  function zurueck() {
    const verlauf = verlaufLesen();
    const ziel = vorherigeSeite(verlauf, aktuellerPfad);
    if (ziel) {
      // Browser-Verlauf nur nutzen, wenn er sicher auf dieselbe Seite führt -
      // dann bleibt auch die Scrollposition der vorigen Seite erhalten.
      const oben = verlauf.seiten[verlauf.seiten.length - 1];
      if (verlauf.browserGleich && oben && pfadOhneSuche(oben) === aktuellerPfad) router.back();
      else router.push(ziel);
    } else if (uebergeordnet) {
      verlaufLeeren();
      router.push(uebergeordnet);
    }
  }

  // Mit weiteren Stationen am Handy nur das Symbol des Menüpunkts zeigen
  // (wie im Menü), damit der Name der übergeordneten Seite Platz hat.
  const menueKurz = stationen.length >= 2;

  return (
    <nav aria-label="Seitennavigation" className={`flex min-w-0 items-center gap-3 print:hidden ${className}`}>
      <button
        type="button"
        onClick={zurueck}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card pl-2.5 pr-3.5 text-sm font-medium shadow-sm hover:border-accent hover:text-accent active:scale-95"
      >
        <IconZurueck className="h-4 w-4" />
        Zurück
      </button>
      {stationen.length > 0 && (
        <ol className="flex min-w-0 items-center gap-1 text-sm text-muted">
          {stationen.map((station, i) => (
            <li key={station.href} className={`flex items-center gap-1 ${i === stationen.length - 1 ? "min-w-0" : "min-w-0 shrink-[2]"}`}>
              {i > 0 && <IconWinkelRechts className="h-3.5 w-3.5 shrink-0 opacity-60" />}
              <Link
                href={station.href}
                title={station.label}
                className="flex min-w-0 items-center gap-1.5 rounded py-1 hover:text-accent hover:underline"
              >
                {station.icon && <station.icon className="h-4 w-4 shrink-0" />}
                <span className={`truncate ${station.icon && menueKurz ? "sr-only sm:not-sr-only" : ""}`}>
                  {station.label}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}

function Erfassen() {
  const pfad = usePathname();
  const suche = useSearchParams().toString();

  useEffect(() => {
    seiteErfassen(suche ? `${pfad}?${suche}` : pfad);
  }, [pfad, suche]);

  useEffect(() => {
    // Abgeschickte Formulare merken (Erfassungsphase, damit es auch bei
    // Formularen greift, die das Ereignis selbst abfangen).
    const beimAbschicken = () => formularAbgeschickt();
    document.addEventListener("submit", beimAbschicken, true);
    return () => document.removeEventListener("submit", beimAbschicken, true);
  }, []);

  return null;
}

// Einmal im Layout eingebunden: schreibt jeden Seitenwechsel in den Verlauf.
export function SeitenverlaufErfassen() {
  return (
    <Suspense fallback={null}>
      <Erfassen />
    </Suspense>
  );
}
