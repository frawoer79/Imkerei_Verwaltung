import Link from "next/link";
import { IconCode } from "@/components/icons";
import { REPOSITORY_URL, RUHE_MINUTEN } from "@/lib/demo";
import { demoNeuStarten } from "@/lib/demo-actions";

// Leiste ganz oben in der öffentlichen Demo (lib/demo.ts), in allen Designs:
// Hinweis aufs Zurücksetzen, Neustart, und gut sichtbar der Weg zum
// Quellcode auf GitHub.
export function DemoLeiste() {
  return (
    <div className="border-b border-warnung-rand bg-warnung-flaeche print:hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-4 py-2 text-center text-sm text-warnung">
        <span>
          <span className="font-semibold">Demo mit erfundenen Daten.</span> Nach {RUHE_MINUTEN} Minuten ohne Klick wird
          alles zurückgesetzt.
        </span>
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-warnung-rand bg-card px-3 py-1 font-medium text-foreground hover:border-accent hover:text-accent"
        >
          <IconCode className="h-4 w-4" />
          Quellcode auf GitHub
        </a>
        <form action={demoNeuStarten} data-lesen-erlaubt="">
          <button type="submit" className="underline underline-offset-2 hover:text-foreground">
            Neu beginnen
          </button>
        </form>
        <span className="text-xs">
          <Link href="/impressum" className="underline underline-offset-2 hover:text-foreground">
            Impressum
          </Link>
          {" · "}
          <Link href="/datenschutz" className="underline underline-offset-2 hover:text-foreground">
            Datenschutz
          </Link>
        </span>
      </div>
    </div>
  );
}
