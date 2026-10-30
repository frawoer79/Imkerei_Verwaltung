import Link from "next/link";
import { IconHornisse } from "@/components/icons";
import { abstandAnzeige, velutinaDatum, type MeldungImBereich } from "@/lib/velutina-daten";

function anzahlText(meldungen: MeldungImBereich[]): string {
  if (meldungen.length === 0) return "keine Meldung";
  const nester = meldungen.filter((meldung) => meldung.art === "NEST").length;
  const tiere = meldungen.length - nester;
  return [
    nester > 0 ? `${nester} ${nester === 1 ? "Nest" : "Nester"}` : null,
    tiere > 0 ? `${tiere} ${tiere === 1 ? "Einzeltier" : "Einzeltiere"}` : null,
  ]
    .filter(Boolean)
    .join(" und ");
}

const STUFEN = {
  akut: {
    label: "Akut",
    rahmen: "border-gefahr-rand bg-gefahr-flaeche",
    pille: "bg-gefahr-voll text-gefahr-voll-text",
    symbol: "text-gefahr",
  },
  warnung: {
    label: "Warnung",
    rahmen: "border-warnung-rand bg-warnung-flaeche",
    pille: "bg-warnung-voll text-warnung-voll-text",
    symbol: "text-warnung",
  },
  ruhig: {
    label: "Ruhig",
    rahmen: "border-border bg-background",
    pille: "bg-ok-voll text-ok-voll-text",
    symbol: "text-muted",
  },
} as const;

// Velutina-Status eines Stands, immer sichtbar - auch wenn nichts gemeldet
// ist. Auf der Stand-Seite am PC links neben der Karte, am Handy darunter.
export function VelutinaStandStatus({
  standId,
  meldungen,
  akutRadiusM,
  warnRadiusM,
  letzterAbruf,
}: {
  standId: string;
  meldungen: MeldungImBereich[];
  akutRadiusM: number;
  warnRadiusM: number;
  letzterAbruf: Date | null;
}) {
  const akut = meldungen.filter((meldung) => meldung.bereich === "akut");
  const warnung = meldungen.filter((meldung) => meldung.bereich === "warnung");
  const neu = meldungen.filter((meldung) => meldung.neu).length;
  const stufe = STUFEN[akut.length > 0 ? "akut" : warnung.length > 0 ? "warnung" : "ruhig"];
  const naechste = meldungen.length > 0 ? [...meldungen].sort((a, b) => a.abstandM - b.abstandM)[0] : null;

  return (
    <Link
      href={`/velutina?stand=${standId}`}
      className={`flex h-full flex-col gap-2 rounded-md border p-3 text-sm transition-shadow hover:shadow-md ${stufe.rahmen}`}
    >
      <div className="flex items-center gap-2">
        <IconHornisse className={`h-6 w-6 shrink-0 ${stufe.symbol}`} />
        <span className="font-semibold">Asiatische Hornisse</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${stufe.pille}`}>{stufe.label}</span>
      </div>
      <dl className="flex flex-col gap-1">
        <div>
          <dt className="text-xs text-muted">Akutbereich (bis {abstandAnzeige(akutRadiusM)})</dt>
          <dd className={akut.length > 0 ? "font-semibold text-gefahr" : ""}>{anzahlText(akut)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Warnbereich (bis {abstandAnzeige(warnRadiusM)})</dt>
          <dd className={warnung.length > 0 ? "font-semibold text-warnung" : ""}>
            {anzahlText(warnung)}
          </dd>
        </div>
        {naechste && (
          <div>
            <dt className="text-xs text-muted">Am nächsten</dt>
            <dd>
              {naechste.art === "NEST" ? "Nest" : "Einzeltier"}, {abstandAnzeige(naechste.abstandM)}, Fund vom{" "}
              {velutinaDatum(naechste.datum)}
            </dd>
          </div>
        )}
        {neu > 0 && (
          <p className="font-semibold text-gefahr">
            {neu} {neu === 1 ? "neue Meldung" : "neue Meldungen"}
          </p>
        )}
      </dl>
      <p className="mt-auto pt-1 text-xs text-muted">
        Saison {new Date().getFullYear()}
        {letzterAbruf
          ? ` · LUBW abgerufen ${letzterAbruf.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })}`
          : " · noch nicht abgerufen"}
        <span className="text-accent"> · Karte →</span>
      </p>
    </Link>
  );
}
