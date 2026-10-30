import Link from "next/link";
import { IconWinkelRechts } from "@/components/icons";

export type AuswahlZeile = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
  // Kurz, wie es gerade steht, z.B. "2 Systeme, 5 Zargengrößen".
  stand?: string;
  // Stand als Hinweis hervorheben (etwas fehlt noch).
  fehlt?: boolean;
};

export type AuswahlGruppe = { titel: string; zusatz?: string; zeilen: AuswahlZeile[] };

// Liste zum Weiterspringen wie in den iPhone-Einstellungen: Gruppen mit
// kleiner Überschrift, je Zeile Symbol, Name, Stand und Pfeil. Jede Zeile
// öffnet eine eigene Seite.
export function AuswahlListe({ gruppen }: { gruppen: AuswahlGruppe[] }) {
  return (
    <div className="flex flex-col gap-5">
      {gruppen.map((gruppe) => (
        <section key={gruppe.titel} aria-label={gruppe.titel}>
          <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold tracking-wider text-muted uppercase">
            {gruppe.titel}
            {gruppe.zusatz && (
              <span className="rounded-full border border-rand-ruhig px-2 py-px text-[11px] font-medium tracking-normal normal-case">
                {gruppe.zusatz}
              </span>
            )}
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-md">
            {gruppe.zeilen.map((zeile) => (
              <Link
                key={zeile.href}
                href={zeile.href}
                className="flex min-h-14 items-center gap-3 border-t border-border px-3 py-2.5 first:border-t-0 hover:bg-flaeche"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <zeile.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{zeile.label}</span>
                  {zeile.stand && (
                    <span className={`block truncate text-sm ${zeile.fehlt ? "text-warnung" : "text-muted"}`}>
                      {zeile.stand}
                    </span>
                  )}
                </span>
                <IconWinkelRechts className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
