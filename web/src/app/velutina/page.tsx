import Link from "next/link";
import { after } from "next/server";
import { basisPrisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { VelutinaKarte } from "@/components/velutina-karte";
import { VelutinaReiter } from "@/components/velutina-reiter";
import { AbrufKnopf, GesehenKnopf, JahrAuswahl, MailSchalter } from "@/components/velutina-steuerung";
import { mailBereit } from "@/lib/mail";
import {
  abgleichFaellig,
  abrufStandLaden,
  meldungenLaden,
  neuesteFreigabe,
  saisonLage,
  velutinaAbgleich,
} from "@/lib/velutina";
import {
  AKUT_FARBE,
  VELUTINA_ART_LABEL,
  WARN_FARBE,
  abstandAnzeige,
  velutinaDatum,
  type MeldungImBereich,
} from "@/lib/velutina-daten";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";
import { BUNDESLAENDER, lubwLage } from "@/lib/bundeslaender";
import { prisma } from "@/lib/prisma";

function zeitpunkt(datum: Date): string {
  return datum.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

export default async function VelutinaPage({
  searchParams,
}: {
  searchParams: Promise<{ jahr?: string; stand?: string }>;
}) {
  await bereichPflicht("velutina");
  const parameter = await searchParams;

  // Die Meldungen gibt es nur für Baden-Württemberg. Wer laut Bienenhalterdaten
  // woanders imkert, bekommt statt Karte und Bereichen nur einen Hinweis.
  const lubw = await lubwLage();
  if (lubw === "anderes") {
    const betrieb = await prisma.betrieb.findUnique({ where: { id: "standard" }, select: { bundesland: true } });
    const land = BUNDESLAENDER.find((eintrag) => eintrag.kuerzel === betrieb?.bundesland)?.name;
    return (
      <div className="flex flex-col gap-6">
        <SeitenNavigation className="-mb-3" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Velutina</h1>
          <p className="text-sm text-muted">Asiatische Hornisse: Fundmeldungen und Nestsuche.</p>
        </div>
        <VelutinaReiter aktiv="meldungen" />
        <Card className="flex flex-col gap-2 text-sm">
          <p>
            Fundmeldungen mit Karte und Warnungen gibt es nur für Baden-Württemberg. Für {land ?? "dein Bundesland"}{" "}
            stehen keine geprüften Meldungen offen zur Verfügung.
          </p>
          <p className="text-muted">
            Die{" "}
            <Link href="/velutina/nestsuche" className="text-accent hover:underline">
              Nestsuche
            </Link>{" "}
            funktioniert überall. Das Bundesland steht unter{" "}
            <Link href="/einstellungen/bienenhalter" className="text-accent hover:underline">
              Einstellungen → Bienenhalter
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }
  const bundeslandFehlt = lubw === "unbekannt";
  const aktuellesJahr = new Date().getFullYear();
  const jahr = parameter.jahr === "alle" ? "alle" : Number(parameter.jahr) || aktuellesJahr;

  const [lage, abruf, freigabe, mailMoeglich, aeltesteMeldung] = await Promise.all([
    saisonLage(),
    abrufStandLaden(),
    neuesteFreigabe(),
    mailBereit(),
    basisPrisma.velutinaMeldung.findFirst({ orderBy: { datum: "asc" }, select: { datum: true } }),
  ]);
  const { einstellung, staende, imBereich } = lage;

  const kartenMeldungen = await meldungenLaden(
    jahr === "alle" ? null : new Date(Date.UTC(jahr, 0, 1)),
    jahr === "alle" ? null : new Date(Date.UTC(jahr + 1, 0, 1)),
    einstellung.gesehenBis,
  );

  const erstesJahr = aeltesteMeldung ? aeltesteMeldung.datum.getFullYear() : aktuellesJahr;
  const jahre: number[] = [];
  for (let wert = aktuellesJahr; wert >= erstesJahr; wert--) jahre.push(wert);

  // Länger nicht abgerufen? Dann nach dem Ausliefern der Seite nachholen,
  // ohne dass das Öffnen der Seite darauf wartet.
  if (await abgleichFaellig()) after(() => velutinaAbgleich());

  // Auf der Karte nur hervorheben, was neu UND in einem Bereich ist - beim
  // ersten Abruf wäre sonst jeder Punkt in ganz Baden-Württemberg "neu".
  const neuImBereich = new Set(imBereich.filter((meldung) => meldung.neu).map((meldung) => meldung.id));

  const akut = imBereich.filter((meldung) => meldung.bereich === "akut");
  const warnung = imBereich.filter((meldung) => meldung.bereich === "warnung");
  const anzahlNeu = imBereich.filter((meldung) => meldung.neu).length;

  return (
    <div className="flex flex-col gap-6">
      <SeitenNavigation className="-mb-3" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Velutina</h1>
        <p className="text-sm text-muted">
          Geprüfte Fundmeldungen der Asiatischen Hornisse in Baden-Württemberg, mit Akut- und Warnbereich um deine
          Stände.
        </p>
      </div>

      <VelutinaReiter aktiv="meldungen" />

      {bundeslandFehlt && (
        <p className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted">
          Die Meldungen gibt es nur für Baden-Württemberg. Trag dein Bundesland unter{" "}
          <Link href="/einstellungen/bienenhalter" className="text-accent hover:underline">
            Einstellungen → Bienenhalter
          </Link>{" "}
          ein, dann blendet die App Karte und Warnungen außerhalb von BW aus.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <JahrAuswahl jahr={String(jahr)} jahre={jahre} />
        <div className="flex flex-col items-start gap-0.5 text-xs text-muted sm:items-end">
          <span>
            {abruf?.letzterErfolg
              ? `Zuletzt abgerufen: ${zeitpunkt(abruf.letzterErfolg)}`
              : "Noch nicht abgerufen"}
            {" · "}
            <AbrufKnopf />
          </span>
          {freigabe && <span>Neueste Freigabe der LUBW: {velutinaDatum(freigabe)}</span>}
          {abruf?.fehler && (
            <span className="text-gefahr">Letzter Abruf fehlgeschlagen: {abruf.fehler}</span>
          )}
        </div>
      </div>

      <VelutinaKarte
        // Neu aufbauen, wenn sich die Grundlage ändert (anderes Jahr, "gesehen").
        key={`${jahr}-${einstellung.gesehenBis?.getTime() ?? 0}`}
        staende={staende}
        meldungen={kartenMeldungen.map((meldung) => ({
          id: meldung.id,
          art: meldung.art,
          datumText: velutinaDatum(meldung.datum),
          meldungsNr: meldung.meldungsNr,
          lat: meldung.lat,
          lng: meldung.lng,
          neu: neuImBereich.has(meldung.id),
        }))}
        akutRadiusM={einstellung.akutRadiusM}
        warnRadiusM={einstellung.warnRadiusM}
        fokusStandId={parameter.stand}
      />

      {staende.length === 0 ? (
        <Card className="text-sm text-muted">
          Sobald ein Bienenstand einen Standort auf der Karte hat, zeigt diese Seite die Meldungen in seiner Nähe
          und warnt auf der Startseite.
        </Card>
      ) : (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              In deinen Bereichen, Saison {aktuellesJahr}
              {anzahlNeu > 0 && (
                <span className="ml-2 whitespace-nowrap rounded-full bg-gefahr-voll px-2 py-0.5 align-middle text-xs font-bold text-gefahr-voll-text">
                  {anzahlNeu} neu
                </span>
              )}
            </h2>
            {anzahlNeu > 0 && <GesehenKnopf />}
          </div>

          {imBereich.length === 0 ? (
            <p className="text-sm text-muted">
              Keine Meldung in diesem Jahr innerhalb von {abstandAnzeige(einstellung.warnRadiusM)} um deine Stände.
            </p>
          ) : (
            <>
              <MeldungsGruppe
                titel={`Akutbereich (bis ${abstandAnzeige(einstellung.akutRadiusM)})`}
                farbe={AKUT_FARBE}
                meldungen={akut}
              />
              <MeldungsGruppe
                titel={`Warnbereich (bis ${abstandAnzeige(einstellung.warnRadiusM)})`}
                farbe={WARN_FARBE}
                meldungen={warnung}
              />
            </>
          )}

          {mailMoeglich ? (
            <MailSchalter an={einstellung.mailAn} />
          ) : (
            <p className="text-xs text-muted">
              Benachrichtigung per E-Mail ist möglich, sobald unter{" "}
              <Link href="/einstellungen/email" className="text-accent hover:underline">
                Einstellungen → E-Mail-Versand
              </Link>{" "}
              der Versand eingerichtet ist.
            </p>
          )}
        </Card>
      )}

      <p className="text-xs text-muted">
        Quelle:{" "}
        <a
          href="https://www.lubw.baden-wuerttemberg.de/natur-und-landschaft/asiatische-hornisse-fundortkarte"
          className="hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          LUBW, Meldeplattform Asiatische Hornisse
        </a>
        . Die LUBW zeigt Meldungen erst nach Prüfung, das kann einige Wochen dauern. Gewarnt wird nur bei Meldungen,
        die nach dem ersten Abruf neu hinzukommen. Ob ein Nest schon entfernt wurde, steht nicht in den Daten. Abruf automatisch alle sechs Stunden.
      </p>
    </div>
  );
}

function MeldungsGruppe({
  titel,
  farbe,
  meldungen,
}: {
  titel: string;
  farbe: string;
  meldungen: MeldungImBereich[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ background: farbe }} />
        {titel}: {meldungen.length === 0 ? "keine" : meldungen.length}
      </h3>
      {meldungen.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {meldungen.map((meldung) => (
            <li key={meldung.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2 text-sm">
              <span className={meldung.art === "NEST" ? "font-semibold" : ""}>{VELUTINA_ART_LABEL[meldung.art]}</span>
              <span className="text-muted">{velutinaDatum(meldung.datum)}</span>
              <span>
                {abstandAnzeige(meldung.abstandM)} von{" "}
                <Link href={`/bienenstaende/${meldung.standId}`} className="text-accent hover:underline">
                  {meldung.standName}
                </Link>
              </span>
              {meldung.meldungsNr && <span className="text-xs text-muted">Meldung {meldung.meldungsNr}</span>}
              {meldung.neu && (
                <span className="rounded-full bg-gefahr-voll px-1.5 py-0.5 text-xs font-bold uppercase text-gefahr-voll-text">
                  neu
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
