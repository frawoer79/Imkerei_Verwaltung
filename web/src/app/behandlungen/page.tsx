import { prisma } from "@/lib/prisma";
import { natuerlich, nachNamen } from "@/lib/sortierung";
import { behandlungStornieren, nachweisErstellen, nachweisLoeschen } from "@/lib/actions";
import { Card, LinkKnopf, knopfKlassen } from "@/components/ui";
import { BehandlungStornieren } from "@/components/behandlung-stornieren";
import { LoeschenButton } from "@/components/loeschen-button";
import { NachweisExport } from "@/components/nachweis-export";
import { datumAnzeige, dauerAnzeige, mengeAnzeige, fehlendeMedikamentAngaben, honigFruehestens } from "@/lib/behandlung";
import { IconDokument, IconHaken, IconWarnung } from "@/components/icons";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";
import Link from "next/link";
import { verfahrenFortschritt, verfahrenSchritte, verfahrenTitel, VERBLEIB_LABEL } from "@/lib/bio-verfahren";

function dateigroesse(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export default async function BehandlungenPage({
  searchParams,
}: {
  searchParams: Promise<{ jahr?: string }>;
}) {
  await bereichPflicht("behandlungen");
  const { jahr: jahrParam } = await searchParams;
  const [alleBehandlungen, staendeRoh, betrieb, aktiveMedikamente, nachweise, alleVerfahren] = await Promise.all([
    prisma.behandlung.findMany({
      orderBy: [{ datum: "desc" }, { createdAt: "desc" }],
      include: {
        medikament: { include: { _count: { select: { belege: true } } } },
        voelker: { orderBy: { volkNameDamals: "asc" } },
      },
    }),
    prisma.bienenstand.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        voelker: { orderBy: { name: "asc" }, select: { id: true, name: true } },
      },
    }),
    prisma.betrieb.findUnique({ where: { id: "standard" } }),
    prisma.medikament.findMany({
      where: { archiviert: false },
      select: { lieferant: true, belegnummer: true, _count: { select: { belege: true } } },
    }),
    prisma.nachweisDatei.findMany({ orderBy: { erstelltAm: "desc" } }),
    prisma.bioVerfahren.findMany({
      orderBy: [{ beginn: "desc" }, { createdAt: "desc" }],
      include: {
        voelker: { select: { volkNameDamals: true, standNameDamals: true } },
        massnahmen: { select: { bioSchritt: true, erledigt: true, faelligAm: true, text: true } },
      },
    }),
  ]);

  const staendeSortiert = nachNamen(staendeRoh).map((stand) => ({ ...stand, voelker: nachNamen(stand.voelker) }));

  const medikamenteUnvollstaendig = aktiveMedikamente.filter(
    (medikament) =>
      fehlendeMedikamentAngaben({
        lieferant: medikament.lieferant,
        belegnummer: medikament.belegnummer,
        anzahlBelege: medikament._count.belege,
      }).length > 0
  ).length;

  const jahre = Array.from(
    new Set(alleBehandlungen.map((behandlung) => behandlung.datum.getFullYear()))
  ).sort((a, b) => b - a);
  if (jahre.length === 0) jahre.push(new Date().getFullYear());

  // Jahresreiter: das neueste Jahr (mindestens das laufende), das davor und
  // "älter" für alles Frühere. Voreingestellt ist das laufende Jahr.
  const laufendesJahr = new Date().getFullYear();
  const reiterJahr = Math.max(laufendesJahr, jahre[0]);
  const vorjahr = reiterJahr - 1;
  const gewaehltesJahr =
    jahrParam === "aelter" ? "aelter" : jahrParam === String(vorjahr) ? vorjahr : reiterJahr;
  const jahrVon = (behandlung: { datum: Date }) => behandlung.datum.getFullYear();
  const behandlungen = alleBehandlungen.filter((behandlung) =>
    gewaehltesJahr === "aelter" ? jahrVon(behandlung) < vorjahr : jahrVon(behandlung) === gewaehltesJahr
  );
  // Verfahren ohne Medikament: laufende immer, abgeschlossene im gewählten Jahr.
  const verfahrenListe = alleVerfahren
    .map((verfahren) => ({
      verfahren,
      fortschritt: verfahrenFortschritt(
        verfahrenSchritte(verfahren.art, verfahren),
        verfahren.massnahmen.map((massnahme) => ({ schluessel: massnahme.bioSchritt ?? "", erledigt: massnahme.erledigt }))
      ),
      naechster: verfahren.massnahmen
        .filter((massnahme) => !massnahme.erledigt && massnahme.faelligAm)
        .sort((a, b) => a.faelligAm!.getTime() - b.faelligAm!.getTime())[0],
    }))
    .filter(
      ({ verfahren, fortschritt }) =>
        !fortschritt.abgeschlossen ||
        (gewaehltesJahr === "aelter" ? jahrVon({ datum: verfahren.beginn }) < vorjahr : jahrVon({ datum: verfahren.beginn }) === gewaehltesJahr)
    );

  const reiter = [
    { wert: reiterJahr, text: String(reiterJahr), anzahl: alleBehandlungen.filter((b) => jahrVon(b) === reiterJahr).length },
    { wert: vorjahr, text: String(vorjahr), anzahl: alleBehandlungen.filter((b) => jahrVon(b) === vorjahr).length },
    { wert: "aelter" as const, text: "älter", anzahl: alleBehandlungen.filter((b) => jahrVon(b) < vorjahr).length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SeitenNavigation className="-mb-3" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Behandlungen</h1>
          <p className="text-sm text-muted">
            Nachweis über angewendete Tierarzneimittel: Varroose, Nosemose, Kalkbrut und
            alles Weitere.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkKnopf href="/medikamente" variant="secondary">Medikamente</LinkKnopf>
          <LinkKnopf href="/behandlungen/neu">+ Neue Behandlung</LinkKnopf>
        </div>
      </div>

      {!betrieb && (
        <Card className="border-gefahr-rand">
          <p className="flex items-start gap-2 text-sm">
            <IconWarnung className="mt-0.5 h-4 w-4 shrink-0 text-gefahr" />
            Noch keine Halterdaten hinterlegt. Name und Anschrift des Bienenhalters
            gehören in den Kopf jedes Nachweises.
          </p>
          <div className="mt-3">
            <LinkKnopf href="/einstellungen/bienenhalter">Halterdaten eintragen</LinkKnopf>
          </div>
        </Card>
      )}

      {medikamenteUnvollstaendig > 0 && (
        <Card>
          <p className="flex items-start gap-2 text-sm">
            <IconWarnung className="mt-0.5 h-4 w-4 shrink-0 text-warnung" />
            {medikamenteUnvollstaendig}{" "}
            {medikamenteUnvollstaendig === 1 ? "Medikament ist" : "Medikamente sind"} für den
            Nachweis unvollständig (Lieferant, Belegnummer oder Beleg fehlt). Der Erwerbsnachweis
            ist Teil des Bestandsbuchs.
          </p>
          <div className="mt-3">
            <LinkKnopf href="/medikamente" variant="secondary">Zu den Medikamenten</LinkKnopf>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Nachweis als PDF</h2>
        <p className="mb-3 text-sm text-muted">
          Jahresübersicht plus vollständige Einzelnachweise im Bestandsbuch-Format.
        </p>
        <NachweisExport action={nachweisErstellen} jahre={jahre} staende={staendeSortiert} />

        {nachweise.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-semibold">
              Gespeicherte Nachweise ({nachweise.length})
            </h3>
            <ul className="flex flex-col">
              {nachweise.map((nachweis) => (
                <li
                  key={nachweis.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <a
                      href={`/nachweise/${nachweis.dateiname}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                    >
                      <IconDokument className="h-4 w-4 shrink-0" /> Nachweis {nachweis.jahr} · {nachweis.bezeichnung}
                    </a>
                    <p className="text-xs text-muted">
                      {nachweis.anzahlBehandlungen}{" "}
                      {nachweis.anzahlBehandlungen === 1 ? "Behandlung" : "Behandlungen"} ·{" "}
                      {dateigroesse(nachweis.groesse)} · erstellt{" "}
                      {datumAnzeige(nachweis.erstelltAm)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a href={`/nachweise/${nachweis.dateiname}?download=1`} download className={knopfKlassen("secondary")}>Herunterladen</a>
                    <LoeschenButton
                      action={nachweisLoeschen.bind(null, nachweis.id)}
                      bestaetigung={`Nachweis ${nachweis.jahr} · ${nachweis.bezeichnung} löschen? Die PDF-Datei ist danach weg.`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          Dokumentierte Behandlungen
          {alleBehandlungen.length > 0 && (
            <span className="text-muted"> ({behandlungen.length})</span>
          )}
        </h2>

        {alleBehandlungen.length > 0 && (
          <nav aria-label="Jahr" className="grid grid-cols-3 gap-1 rounded-lg bg-border p-1 sm:max-w-md">
            {reiter.map((eintrag) => {
              const aktiv = eintrag.wert === gewaehltesJahr;
              return (
                <Link
                  key={eintrag.text}
                  href={eintrag.wert === reiterJahr ? "/behandlungen" : `/behandlungen?jahr=${eintrag.wert}`}
                  aria-current={aktiv ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium ${
                    aktiv ? "bg-card text-foreground shadow-sm" : "text-muted"
                  }`}
                >
                  {eintrag.text}
                  <span className="text-xs font-normal text-muted">{eintrag.anzahl}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {behandlungen.length === 0 ? (
          <Card className="text-center text-muted">
            {alleBehandlungen.length === 0
              ? "Noch keine Behandlung dokumentiert."
              : "Keine Behandlung in diesem Zeitraum."}
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {behandlungen.map((behandlung) => {
              const storniert = behandlung.storniertAm !== null;
              const fehlt = [
                ...fehlendeMedikamentAngaben({
                  lieferant: behandlung.medikament.lieferant,
                  belegnummer: behandlung.medikament.belegnummer,
                  anzahlBelege: behandlung.medikament._count.belege,
                }),
                ...(behandlung.mengeJeVolk > 0 ? [] : ["Menge je Volk"]),
                ...(behandlung.voelker.length > 0 ? [] : ["behandelte Völker"]),
              ];
              const honigAb = honigFruehestens(behandlung.datum, behandlung.endeDatum, behandlung.wartezeitTage);
              return (
                <Card key={behandlung.id} className={storniert ? "opacity-70" : ""}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className={`font-semibold ${storniert ? "line-through" : ""}`}>
                        {behandlung.medikament.name}
                        {behandlung.medikament.chargennummer &&
                          ` · Ch. ${behandlung.medikament.chargennummer}`}
                      </h3>
                      <p className="text-sm text-muted">
                        {behandlung.indikation} · {datumAnzeige(behandlung.datum)} ·{" "}
                        {dauerAnzeige(behandlung.datum, behandlung.endeDatum)}
                      </p>
                    </div>
                    {storniert && (
                      <span className="rounded-full bg-gefahr-flaeche px-2 py-0.5 text-xs text-gefahr">
                        storniert
                      </span>
                    )}
                  </div>

                  <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                    <div className="flex gap-2">
                      <dt className="text-muted">Menge je Volk</dt>
                      <dd>
                        {mengeAnzeige(behandlung.mengeJeVolk, behandlung.medikament.einheit)}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-muted">Wartezeit</dt>
                      <dd>{behandlung.wartezeitTage} Tage</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-muted">Anwender</dt>
                      <dd>{behandlung.anwender}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-muted">Völker</dt>
                      <dd>{behandlung.voelker.length}</dd>
                    </div>
                  </dl>

                  {!storniert && behandlung.wartezeitTage > 0 && (
                    <p className="mt-2 text-sm font-medium">
                      {honigAb < new Date() ? "Wartezeit vorbei seit" : "Honigentnahme frühestens ab"}{" "}
                      {datumAnzeige(honigAb)}
                    </p>
                  )}

                  <p className="mt-2 text-sm">
                    {behandlung.voelker
                      .map((eintrag) => `${eintrag.standNameDamals}/${eintrag.volkNameDamals}`)
                      .sort(natuerlich)
                      .join(" · ")}
                  </p>

                  {!storniert &&
                    (fehlt.length === 0 ? (
                      <p className="mt-2 text-sm text-ok">
                        <IconHaken className="mr-1 inline-block h-[1em] w-[1em] align-[-0.125em]" />
                        Angaben vollständig
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-warnung">
                        <IconWarnung className="mr-1 inline-block h-[1em] w-[1em] align-[-0.125em]" />
                        Unvollständig. Es fehlen: {fehlt.join(", ")}.{" "}
                        <Link href={`/medikamente/${behandlung.medikament.id}/bearbeiten`} className="underline">
                          Medikament ergänzen
                        </Link>
                      </p>
                    ))}

                  {behandlung.bemerkung && (
                    <p className="mt-2 text-sm text-muted">{behandlung.bemerkung}</p>
                  )}

                  {storniert ? (
                    <p className="mt-2 text-sm text-gefahr">
                      Storniert am {datumAnzeige(behandlung.storniertAm!)}:{" "}
                      {behandlung.storniertGrund}
                    </p>
                  ) : (
                    <div className="mt-3">
                      <BehandlungStornieren
                        action={behandlungStornieren.bind(null, behandlung.id)}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              Verfahren ohne Medikament
              {verfahrenListe.length > 0 && <span className="text-muted"> ({verfahrenListe.length})</span>}
            </h2>
            <p className="text-sm text-muted">TBE, Bannwabe, Käfigen. Nicht im Bestandsbuch, laufende stehen immer hier.</p>
          </div>
          <LinkKnopf href="/behandlungen/neu?art=bio" variant="secondary" groesse="mittel">
            + Verfahren
          </LinkKnopf>
        </div>
        {verfahrenListe.length === 0 ? (
          <Card className="text-center text-muted">Kein Verfahren in diesem Zeitraum.</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {verfahrenListe.map(({ verfahren, fortschritt, naechster }) => (
              <Link
                key={verfahren.id}
                href={`/behandlungen/verfahren/${verfahren.id}`}
                className="rounded-xl border border-border bg-card p-5 shadow-md hover:border-accent"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{verfahrenTitel(verfahren.art, verfahren.bezeichnung)}</h3>
                    <p className="text-sm text-muted">
                      {datumAnzeige(verfahren.beginn)}
                      {verfahren.brutwaben !== null && ` · ${verfahren.brutwaben} Brutwaben je Volk`}
                      {verfahren.verbleib && ` · ${VERBLEIB_LABEL[verfahren.verbleib] ?? verfahren.verbleib}`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      fortschritt.abgeschlossen ? "border-border bg-background text-muted" : "border-ok-rand bg-ok-flaeche text-ok"
                    }`}
                  >
                    {fortschritt.abgeschlossen
                      ? "abgeschlossen"
                      : `läuft · Schritt ${Math.min(fortschritt.erledigt + 1, fortschritt.gesamt)} von ${fortschritt.gesamt}`}
                  </span>
                </div>
                {naechster && (
                  <p className="mt-2 text-sm">
                    Als Nächstes: {naechster.text.replace(/^[^:]*: /, "")} · {datumAnzeige(naechster.faelligAm!)}
                  </p>
                )}
                <p className="mt-2 text-sm text-muted">
                  {verfahren.voelker
                    .map((eintrag) => `${eintrag.standNameDamals}/${eintrag.volkNameDamals}`)
                    .sort(natuerlich)
                    .join(" · ")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
