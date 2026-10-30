import { Button } from "@/components/ui";
import { LoeschenButton } from "@/components/loeschen-button";
import { IconBild, IconDokument } from "@/components/icons";
import { datumAnzeige } from "@/lib/behandlung";
import { dateigroesseAnzeige } from "@/lib/dokumente-typen";

export type DokumentMiniEintrag = {
  id: string;
  kategorieName: string;
  titel: string | null;
  datum: Date;
  dateiname: string;
  mimeType: string;
  groesse: number;
  loeschenAction: () => void;
};

// Kompakte Dokumentenliste für Verknüpfungsseiten (Bienenstand, Volk,
// Königin) - anders als die zentrale Dokumentenliste (components/
// dokumente-liste.tsx) ohne Suche/Filter und ohne "Ort"-Link, weil man ja
// schon dort ist.
export function DokumenteMiniListe({ dokumente }: { dokumente: DokumentMiniEintrag[] }) {
  return (
    <ul className="flex flex-col">
      {dokumente.map((dokument) => {
        const dateiHref = `/dokument-dateien/${dokument.dateiname}`;
        return (
          <li
            key={dokument.id}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border py-2.5 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-sm font-medium">
                {dokument.mimeType === "application/pdf" ? (
                  <IconDokument className="h-4 w-4 shrink-0" />
                ) : (
                  <IconBild className="h-4 w-4 shrink-0" />
                )}
                {dokument.titel ? `${dokument.kategorieName} · ${dokument.titel}` : dokument.kategorieName}
              </p>
              <p className="text-xs text-muted">
                {datumAnzeige(dokument.datum)} · {dateigroesseAnzeige(dokument.groesse)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={dateiHref} target="_blank" rel="noreferrer">
                <Button type="button" variant="secondary">
                  Öffnen
                </Button>
              </a>
              <a href={`${dateiHref}?download=1`} download>
                <Button type="button" variant="secondary">
                  Herunterladen
                </Button>
              </a>
              <LoeschenButton action={dokument.loeschenAction} bestaetigung="Dieses Dokument wirklich entfernen?">
                Entfernen
              </LoeschenButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
