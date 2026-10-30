import Link from "next/link";
import { IconHornisse } from "@/components/icons";
import { abstandAnzeige, velutinaDatum, type MeldungImBereich } from "@/lib/velutina-daten";

function anzahlText(meldungen: MeldungImBereich[]): string {
  const nester = meldungen.filter((meldung) => meldung.art === "NEST").length;
  const tiere = meldungen.length - nester;
  return [
    nester > 0 ? `${nester} ${nester === 1 ? "Nest" : "Nester"}` : null,
    tiere > 0 ? `${tiere} ${tiere === 1 ? "Einzeltier" : "Einzeltiere"}` : null,
  ]
    .filter(Boolean)
    .join(" und ");
}

// Warnkasten zur Asiatischen Hornisse - rot, sobald etwas im Akutbereich
// liegt, sonst gelb. Auf der Startseite mit den noch nicht gesehenen
// Meldungen, auf der Stand-Seite mit allen dieser Saison um diesen Stand.
export function VelutinaHinweis({
  meldungen,
  akutRadiusM,
  warnRadiusM,
  link,
  zeigeStand,
}: {
  meldungen: MeldungImBereich[];
  akutRadiusM: number;
  warnRadiusM: number;
  link: string;
  zeigeStand: boolean;
}) {
  if (meldungen.length === 0) return null;
  const akut = meldungen.filter((meldung) => meldung.bereich === "akut");
  const warnung = meldungen.filter((meldung) => meldung.bereich === "warnung");
  const naechste = meldungen[0];
  const istAkut = akut.length > 0;

  return (
    <Link
      href={link}
      className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
        istAkut
          ? "border-gefahr-rand bg-gefahr-flaeche text-foreground"
          : "border-warnung-rand bg-warnung-flaeche text-foreground"
      }`}
    >
      <IconHornisse
        className={`mt-0.5 h-7 w-7 shrink-0 ${istAkut ? "text-gefahr" : "text-warnung"}`}
      />
      <div className="flex min-w-0 flex-col gap-0.5 text-sm">
        <p className="font-semibold">Asiatische Hornisse in der Nähe</p>
        {akut.length > 0 && (
          <p>
            Akutbereich (bis {abstandAnzeige(akutRadiusM)}): {anzahlText(akut)}
          </p>
        )}
        {warnung.length > 0 && (
          <p>
            Warnbereich (bis {abstandAnzeige(warnRadiusM)}): {anzahlText(warnung)}
          </p>
        )}
        <p className="opacity-80">
          Am nächsten: {naechste.art === "NEST" ? "Nest" : "Einzeltier"}, {abstandAnzeige(naechste.abstandM)}
          {zeigeStand ? ` von ${naechste.standName}` : ""}, Fund vom {velutinaDatum(naechste.datum)} →
        </p>
      </div>
    </Link>
  );
}
