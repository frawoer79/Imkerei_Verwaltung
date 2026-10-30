import { prisma } from "@/lib/prisma";
import { medikamentArchivieren, medikamentReaktivieren } from "@/lib/actions";
import { Button, Card, LinkKnopf } from "@/components/ui";
import { IconBehandlung, IconHaken, IconWarnung } from "@/components/icons";
import { Aufklappbar } from "@/components/aufklappbar";
import { MEDIKAMENT_VORLAGEN } from "@/lib/medikament-vorlagen";
import { datumAnzeige, fehlendeMedikamentAngaben } from "@/lib/behandlung";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

function MedikamentKarte({
  medikament,
  heute,
}: {
  heute: Date;
  medikament: {
    id: string;
    name: string;
    wirkstoff: string | null;
    zulassungsnummer: string | null;
    einheit: string;
    wartezeitTage: number;
    lieferant: string | null;
    kaufdatum: Date | null;
    belegnummer: string | null;
    chargennummer: string | null;
    verfallsdatum: Date | null;
    archiviert: boolean;
    _count: { belege: number; behandlungen: number };
  };
}) {
  const abgelaufen =
    medikament.verfallsdatum !== null && medikament.verfallsdatum < heute;
  const fehlt = fehlendeMedikamentAngaben({
    lieferant: medikament.lieferant,
    belegnummer: medikament.belegnummer,
    anzahlBelege: medikament._count.belege,
  });

  return (
    <Card className={medikament.archiviert ? "opacity-70" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{medikament.name}</h3>
          <p className="text-sm text-muted">
            {[
              medikament.wirkstoff,
              medikament.zulassungsnummer && `Zul.-Nr. ${medikament.zulassungsnummer}`,
              `Wartezeit ${medikament.wartezeitTage} Tage`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {medikament.archiviert && (
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">
              archiviert
            </span>
          )}
          {abgelaufen && !medikament.archiviert && (
            <span className="rounded-full bg-gefahr-flaeche px-2 py-0.5 text-xs text-gefahr">
              abgelaufen
            </span>
          )}
        </div>
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        {medikament.chargennummer && (
          <div className="flex gap-2">
            <dt className="text-muted">Charge</dt>
            <dd>{medikament.chargennummer}</dd>
          </div>
        )}
        {medikament.kaufdatum && (
          <div className="flex gap-2">
            <dt className="text-muted">Gekauft</dt>
            <dd>{datumAnzeige(medikament.kaufdatum)}</dd>
          </div>
        )}
        {medikament.verfallsdatum && (
          <div className="flex gap-2">
            <dt className="text-muted">Verfällt</dt>
            <dd>{datumAnzeige(medikament.verfallsdatum)}</dd>
          </div>
        )}
        {medikament.belegnummer && (
          <div className="flex gap-2">
            <dt className="text-muted">Beleg-Nr.</dt>
            <dd>{medikament.belegnummer}</dd>
          </div>
        )}
        {medikament.lieferant && (
          <div className="flex gap-2 sm:col-span-2">
            <dt className="shrink-0 text-muted">Lieferant</dt>
            <dd>{medikament.lieferant}</dd>
          </div>
        )}
      </dl>

      {fehlt.length === 0 ? (
        <p className="mt-3 text-sm text-ok">
          <IconHaken className="mr-1 inline-block h-[1em] w-[1em] align-[-0.125em]" />
          Angaben vollständig
        </p>
      ) : (
        <p className="mt-3 text-sm text-warnung">
          <IconWarnung className="mr-1 inline-block h-[1em] w-[1em] align-[-0.125em]" />
          Unvollständig. Es fehlen: {fehlt.join(", ")}.{" "}
          <a href={`/medikamente/${medikament.id}/bearbeiten`} className="underline">
            Jetzt ergänzen
          </a>
        </p>
      )}

      <p className="mt-1 text-xs text-muted">
        {medikament._count.belege} {medikament._count.belege === 1 ? "Beleg" : "Belege"} hinterlegt
        {" · "}
        {medikament._count.behandlungen}{" "}
        {medikament._count.behandlungen === 1 ? "Behandlung" : "Behandlungen"} dokumentiert
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <LinkKnopf href={`/medikamente/${medikament.id}/bearbeiten`} variant="secondary">Bearbeiten</LinkKnopf>
        <form action={medikament.archiviert ? medikamentReaktivieren.bind(null, medikament.id) : medikamentArchivieren.bind(null, medikament.id)}>
          <Button type="submit" variant="secondary">
            {medikament.archiviert ? "Wieder verwenden" : "Aufgebraucht"}
          </Button>
        </form>
      </div>
    </Card>
  );
}

// Gängige Varroa-Mittel zum Aktivieren: "Aktivieren" öffnet das Anlegen mit
// vorbefüllten Stammdaten, die Angaben zur eigenen Packung trägt man dort ein.
function VorlagenListe({ angelegteNamen, startOffen }: { angelegteNamen: Set<string>; startOffen: boolean }) {
  return (
    <Aufklappbar
      titel={`Gängige Mittel als Vorlage (${MEDIKAMENT_VORLAGEN.length})`}
      symbol={<IconBehandlung className="h-5 w-5" />}
      hinweis="Wirkstoff, Einheit und Wartezeit sind vorbefüllt. Beim Aktivieren trägst du Lieferant, Rechnungsnummer, Kaufdatum und Charge deiner Packung ein."
      startOffen={startOffen}
    >
      <ul className="flex flex-col divide-y divide-border">
        {MEDIKAMENT_VORLAGEN.map((vorlage) => (
          <li key={vorlage.schluessel} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="font-medium">
                {vorlage.name}
                {angelegteNamen.has(vorlage.name) && (
                  <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs font-normal text-muted">
                    angelegt
                  </span>
                )}
              </p>
              <p className="text-sm text-muted">
                {vorlage.wirkstoff} · {vorlage.art}
              </p>
            </div>
            <LinkKnopf
              href={`/medikamente/neu?vorlage=${vorlage.schluessel}`}
              variant="secondary"
              groesse="mittel"
              className="shrink-0"
            >
              Aktivieren
            </LinkKnopf>
          </li>
        ))}
      </ul>
    </Aufklappbar>
  );
}

export default async function MedikamentePage() {
  await bereichPflicht("behandlungen");
  const medikamente = await prisma.medikament.findMany({
    orderBy: [{ archiviert: "asc" }, { name: "asc" }],
    include: { _count: { select: { belege: true, behandlungen: true } } },
  });

  const heute = new Date();
  const aktive = medikamente.filter((medikament) => !medikament.archiviert);
  const archivierte = medikamente.filter((medikament) => medikament.archiviert);

  return (
    <div className="flex flex-col gap-6">
      <SeitenNavigation className="-mb-3" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Medikamente</h1>
          <p className="text-sm text-muted">
            Jede gekaufte Packung einmal anlegen. Bei der Behandlung wählst du sie dann nur
            noch aus.
          </p>
        </div>
        <LinkKnopf href="/medikamente/neu">+ Medikament anlegen</LinkKnopf>
      </div>

      <VorlagenListe
        angelegteNamen={new Set(aktive.map((medikament) => medikament.name))}
        startOffen={medikamente.length === 0}
      />

      {aktive.length === 0 ? (
        <Card className="text-center text-muted">
          Noch keine Medikamente angelegt.
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {aktive.map((medikament) => (
            <MedikamentKarte key={medikament.id} medikament={medikament} heute={heute} />
          ))}
        </div>
      )}

      {archivierte.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Aufgebraucht ({archivierte.length})</h2>
          <p className="text-sm text-muted">
            Bleiben erhalten, weil die zugehörigen Nachweise fünf Jahre aufzubewahren sind.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {archivierte.map((medikament) => (
              <MedikamentKarte key={medikament.id} medikament={medikament} heute={heute} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
