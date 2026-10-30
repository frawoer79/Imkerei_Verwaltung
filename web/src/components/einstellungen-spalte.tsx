"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sichtbareGruppen } from "@/lib/einstellungen-punkte";

// Spalte links in den Einstellungen (ab lg): alle Punkte nach Gruppen, der
// geöffnete hervorgehoben. So wechselt man am PC mit einem Klick, ohne
// Zurück. Auf /einstellungen selbst steht rechts der Bienenhalter.
export function EinstellungenSpalte({ aus, admin, helfer }: { aus: readonly string[]; admin: boolean; helfer: boolean }) {
  const pathname = usePathname();
  const gruppen = sichtbareGruppen(aus, admin, helfer);
  return (
    <nav aria-label="Einstellungen" className="flex flex-col gap-4">
      <p className="px-3 text-2xl font-semibold tracking-tight">Einstellungen</p>
      {gruppen.map((gruppe) => (
        <div key={gruppe.titel} className="flex flex-col gap-0.5">
          <p className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold tracking-wider text-muted uppercase">
            {gruppe.titel}
            {gruppe.nurAdmin && (
              <span className="rounded-full border border-rand-ruhig px-2 py-px text-[11px] font-medium tracking-normal normal-case">
                nur du
              </span>
            )}
          </p>
          {gruppe.punkte.map((punkt) => {
            const aktiv =
              pathname.startsWith(punkt.href) || (pathname === "/einstellungen" && punkt.schluessel === "bienenhalter");
            return (
              <Link
                key={punkt.href}
                href={punkt.href}
                aria-current={aktiv ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 font-medium ${
                  aktiv ? "bg-accent/10 text-accent" : "text-foreground/85 hover:bg-flaeche hover:text-foreground"
                }`}
              >
                <punkt.icon className={`h-5 w-5 shrink-0 ${aktiv ? "" : "text-muted"}`} />
                {punkt.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
