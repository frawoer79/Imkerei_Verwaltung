"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Input } from "@/components/ui";
import { LoeschenButton } from "@/components/loeschen-button";
import { IconBild, IconDokument } from "@/components/icons";
import { DokumenteMailDialog, type MailVersandEinstellungen } from "@/components/dokumente-mail-dialog";
import { DOKUMENT_TYP_LABEL, dateigroesseAnzeige, type DokumentEintrag, type DokumentTyp } from "@/lib/dokumente-typen";

export type DokumentListenEintrag = DokumentEintrag & {
  loeschenAction?: () => void;
};

function datumAnzeige(datum: Date): string {
  const zweistellig = (zahl: number) => zahl.toString().padStart(2, "0");
  return `${zweistellig(datum.getDate())}.${zweistellig(datum.getMonth() + 1)}.${datum.getFullYear()}`;
}

const TYP_FARBE: Record<DokumentTyp, string> = {
  DOKUMENT: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  BEHANDLUNGSNACHWEIS: "bg-warnung-flaeche text-warnung",
  MEDIKAMENTENBELEG: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  ZUCHTKARTE: "bg-ok-flaeche text-ok",
  LAGERLISTE: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
};

// Filter-Chips ergeben sich aus dem, was tatsächlich geladen wurde - bei
// "DOKUMENT" je Kategorie (die sind ja vom Nutzer frei erweiterbar), bei den
// übrigen Arten je Typ. So passt die Chip-Liste sich automatisch an, ohne
// dass eigene Kategorien hier extra gepflegt werden müssten.
type FilterChip = { schluessel: string; label: string };

function filterSchluessel(dokument: DokumentListenEintrag): string {
  return dokument.typ === "DOKUMENT" ? `kategorie:${dokument.kategorie}` : `typ:${dokument.typ}`;
}

function auswahlSchluessel(dokument: DokumentListenEintrag): string {
  return `${dokument.typ}:${dokument.id}`;
}

export function DokumenteListe({
  dokumente,
  mail,
}: {
  dokumente: DokumentListenEintrag[];
  /// null, solange der E-Mail-Versand nicht eingerichtet ist - dann keine
  /// Kästchen und kein Knopf.
  mail: MailVersandEinstellungen | null;
}) {
  const [suche, setSuche] = useState("");
  const [filter, setFilter] = useState("ALLE");
  // Angekreuzte Dokumente zum Versenden per E-Mail. Bleiben beim Suchen und
  // Filtern erhalten, so lassen sich Dokumente aus mehreren Kategorien
  // zusammenstellen.
  const [ausgewaehlt, setAusgewaehlt] = useState<Set<string>>(() => new Set());

  const chips = useMemo(() => {
    const gesehen = new Map<string, FilterChip>();
    for (const dokument of dokumente) {
      const schluessel = filterSchluessel(dokument);
      if (!gesehen.has(schluessel)) {
        gesehen.set(schluessel, {
          schluessel,
          label: dokument.typ === "DOKUMENT" ? (dokument.kategorie ?? "Dokument") : DOKUMENT_TYP_LABEL[dokument.typ],
        });
      }
    }
    return Array.from(gesehen.values());
  }, [dokumente]);

  const gefiltert = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    return dokumente.filter((dokument) => {
      if (filter !== "ALLE" && filterSchluessel(dokument) !== filter) return false;
      if (!begriff) return true;
      return (
        dokument.titel.toLowerCase().includes(begriff) ||
        dokument.kontext.toLowerCase().includes(begriff)
      );
    });
  }, [dokumente, suche, filter]);

  // In der Reihenfolge der Liste (neueste zuerst); entfernte Dokumente fallen
  // dabei von selbst heraus.
  const auswahl = useMemo(
    () =>
      dokumente
        .filter((dokument) => ausgewaehlt.has(auswahlSchluessel(dokument)))
        .map((dokument) => ({ typ: dokument.typ, id: dokument.id, titel: dokument.titel, groesse: dokument.groesse })),
    [dokumente, ausgewaehlt],
  );

  function umschalten(schluessel: string) {
    setAusgewaehlt((vorher) => {
      const neu = new Set(vorher);
      if (neu.has(schluessel)) neu.delete(schluessel);
      else neu.add(schluessel);
      return neu;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {mail && dokumente.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-md bg-background px-3 py-2">
          <p className="text-sm text-muted">
            {auswahl.length === 0
              ? "Dokumente ankreuzen, um sie per E-Mail zu senden."
              : `${auswahl.length} ${auswahl.length === 1 ? "Dokument" : "Dokumente"} ausgewählt`}
            {auswahl.length > 0 && (
              <button
                type="button"
                onClick={() => setAusgewaehlt(new Set())}
                className="ml-2 text-accent hover:underline"
              >
                Auswahl aufheben
              </button>
            )}
          </p>
          <DokumenteMailDialog auswahl={auswahl} einstellungen={mail} onVersendet={() => setAusgewaehlt(new Set())} />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Dokumente durchsuchen …"
          value={suche}
          onChange={(ereignis) => setSuche(ereignis.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("ALLE")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === "ALLE" ? "bg-accent text-accent-foreground" : "bg-background text-muted hover:text-foreground"
            }`}
          >
            Alle
          </button>
          {chips.map((chip) => (
            <button
              key={chip.schluessel}
              type="button"
              onClick={() => setFilter(chip.schluessel)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === chip.schluessel ? "bg-accent text-accent-foreground" : "bg-background text-muted hover:text-foreground"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {dokumente.length === 0 ? (
        <p className="text-sm text-muted">Noch kein Dokument vorhanden.</p>
      ) : gefiltert.length === 0 ? (
        <p className="text-sm text-muted">Keine Dokumente gefunden.</p>
      ) : (
        <ul className="flex flex-col">
          {gefiltert.map((dokument) => (
            <li
              key={`${dokument.typ}-${dokument.id}`}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border py-2.5 last:border-b-0"
            >
              <div className="flex min-w-0 items-start gap-3">
                {mail && (
                  <input
                    type="checkbox"
                    checked={ausgewaehlt.has(auswahlSchluessel(dokument))}
                    onChange={() => umschalten(auswahlSchluessel(dokument))}
                    aria-label={`${dokument.titel} auswählen`}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-accent"
                  />
                )}
                <div className="min-w-0">
                  <Link
                    href={dokument.ortHref}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    {dokument.mimeType && dokument.mimeType !== "application/pdf" ? (
                      <IconBild className="h-4 w-4 shrink-0" />
                    ) : (
                      <IconDokument className="h-4 w-4 shrink-0" />
                    )}
                    {dokument.titel}
                  </Link>
                  <p className="text-xs text-muted">
                    <span className={`mr-1.5 rounded-full px-1.5 py-0.5 ${TYP_FARBE[dokument.typ]}`}>
                      {dokument.typ === "DOKUMENT" ? dokument.kategorie : DOKUMENT_TYP_LABEL[dokument.typ]}
                    </span>
                    {dokument.kontext} · {datumAnzeige(dokument.datum)}
                    {dokument.groesse !== undefined && ` · ${dateigroesseAnzeige(dokument.groesse)}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <a href={dokument.dateiHref} target="_blank" rel="noreferrer">
                  <Button type="button" variant="secondary">
                    Öffnen
                  </Button>
                </a>
                <a href={`${dokument.dateiHref}?download=1`} download>
                  <Button type="button" variant="secondary">
                    Herunterladen
                  </Button>
                </a>
                {dokument.loeschenAction && (
                  <LoeschenButton action={dokument.loeschenAction} bestaetigung="Dieses Dokument wirklich entfernen?">
                    Entfernen
                  </LoeschenButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
