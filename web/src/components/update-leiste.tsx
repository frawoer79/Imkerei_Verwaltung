import Link from "next/link";
import type { UpdateHinweis } from "@/lib/update";
import { updateSpaeter, updateUeberspringen } from "@/lib/update-actions";

// Band ganz oben, wenn es eine neuere Version gibt (siehe lib/update.ts).
// Nur für den Hauptzugang, in allen Designs. "Später" blendet es 7 Tage aus,
// "Überspringen" bis zur nächsten Version. Sicherheitsupdates erscheinen rot
// und lassen sich nicht überspringen.
export function UpdateLeiste({ hinweis }: { hinweis: UpdateHinweis }) {
  const farbe = hinweis.sicherheit
    ? "border-gefahr-rand bg-gefahr-flaeche"
    : "border-honig bg-honig-flaeche";
  const knopf = "rounded-md px-2 py-1 font-medium underline-offset-2 hover:underline cursor-pointer";

  return (
    <div className={`border-b ${farbe} print:hidden`} data-update-leiste>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-1.5 text-center text-sm">
        <p>
          {hinweis.sicherheit ? (
            <b className="text-gefahr">Sicherheitsupdate {hinweis.version} verfügbar.</b>
          ) : (
            <>
              Neue Version <b>{hinweis.version}</b> verfügbar.
            </>
          )}
          {hinweis.hauptversion && " Neue Hauptversion: vorher die Hinweise lesen."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-1">
          <Link href="/einstellungen/system#neu" className={`${knopf} text-accent`}>
            Was ist neu?
          </Link>
          <form action={updateSpaeter}>
            <button type="submit" className={`${knopf} text-muted`}>
              Später
            </button>
          </form>
          {!hinweis.sicherheit && (
            <form action={updateUeberspringen}>
              <input type="hidden" name="version" value={hinweis.version} />
              <button type="submit" className={`${knopf} text-muted`}>
                <span className="sm:hidden">Überspringen</span>
                <span className="hidden sm:inline">Diese Version überspringen</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
