import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { istAdmin } from "@/lib/konto";
import { AKTION_TEXT, felder, kurzbeschreibung, modellName } from "@/lib/historie-anzeige";
import { Button, Card, Input, Label, LinkKnopf, Select } from "@/components/ui";
import { SeitenNavigation } from "@/components/seiten-navigation";

const SEITE = 100;

const datumZeit = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

type Suche = { person?: string; bereich?: string; von?: string; bis?: string; vor?: string; volk?: string };

// Wer hat wann was angelegt, geändert oder gelöscht (lib/historie.ts) - nur
// für den Admin. Neueste zuerst, je Seite SEITE Einträge.
export default async function HistoriePage({ searchParams }: { searchParams: Promise<Suche> }) {
  if (!(await istAdmin())) notFound();
  const suche = await searchParams;

  const zeitpunkt: Prisma.DateTimeFilter = {};
  if (suche.von) zeitpunkt.gte = new Date(`${suche.von}T00:00:00`);
  if (suche.bis) zeitpunkt.lte = new Date(`${suche.bis}T23:59:59`);
  if (suche.vor && !Number.isNaN(new Date(suche.vor).getTime())) zeitpunkt.lt = new Date(suche.vor);
  const where: Prisma.HistorieWhereInput = {
    ...(suche.person ? { nutzerName: suche.person } : {}),
    ...(suche.bereich ? { modell: suche.bereich } : {}),
    ...(suche.volk ? { volkId: suche.volk } : {}),
    ...(Object.keys(zeitpunkt).length ? { zeitpunkt } : {}),
  };

  const [eintraege, personen, bereiche] = await Promise.all([
    prisma.historie.findMany({ where, orderBy: { zeitpunkt: "desc" }, take: SEITE + 1 }),
    prisma.historie.findMany({ distinct: ["nutzerName"], select: { nutzerName: true }, orderBy: { nutzerName: "asc" } }),
    prisma.historie.findMany({ distinct: ["modell"], select: { modell: true } }),
  ]);
  const weitere = eintraege.length > SEITE;
  const sichtbar = eintraege.slice(0, SEITE);

  // Namen der Völker für die Links.
  const volkIds = [...new Set(sichtbar.map((eintrag) => eintrag.volkId).filter((id): id is string => !!id))];
  const voelker = new Map(
    (await prisma.volk.findMany({ where: { id: { in: volkIds } }, select: { id: true, name: true } })).map((volk) => [volk.id, volk.name]),
  );

  const aeltere = new URLSearchParams(
    Object.entries({ ...suche, vor: sichtbar.at(-1)?.zeitpunkt.toISOString() ?? "" }).filter(([, wert]) => wert) as [string, string][],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Historie</h1>
        <p className="text-sm text-muted">
          Wer wann was angelegt, geändert oder gelöscht hat. Aufgezeichnet seit Einführung der Helfer,
          ältere Einträge haben keine Historie.
        </p>
      </div>

      <Card>
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="person">Wer</Label>
            <Select id="person" name="person" defaultValue={suche.person ?? ""}>
              <option value="">Alle</option>
              {personen.map(({ nutzerName }) => (
                <option key={nutzerName} value={nutzerName}>
                  {nutzerName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="bereich">Was</Label>
            <Select id="bereich" name="bereich" defaultValue={suche.bereich ?? ""}>
              <option value="">Alles</option>
              {bereiche
                .map(({ modell }) => ({ modell, name: modellName(modell) }))
                .sort((a, b) => a.name.localeCompare(b.name, "de"))
                .map(({ modell, name }) => (
                  <option key={modell} value={modell}>
                    {name}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="von">Von</Label>
            <Input id="von" name="von" type="date" defaultValue={suche.von ?? ""} />
          </div>
          <div>
            <Label htmlFor="bis">Bis</Label>
            <Input id="bis" name="bis" type="date" defaultValue={suche.bis ?? ""} />
          </div>
          {suche.volk && <input type="hidden" name="volk" value={suche.volk} />}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit">Anzeigen</Button>
            <LinkKnopf href="/einstellungen/historie" variant="secondary">
              Zurücksetzen
            </LinkKnopf>
          </div>
        </form>
      </Card>

      <Card>
        {sichtbar.length === 0 ? (
          <p className="text-sm text-muted">Keine Einträge.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {sichtbar.map((eintrag) => {
              const vorher = eintrag.vorher as Record<string, unknown> | null;
              const nachher = eintrag.nachher as Record<string, unknown> | null;
              const beschreibung = kurzbeschreibung(nachher ?? vorher);
              const liste = felder(vorher, nachher);
              const volkName = eintrag.volkId ? voelker.get(eintrag.volkId) : undefined;
              return (
                <li key={eintrag.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-xs text-muted">{datumZeit.format(eintrag.zeitpunkt)}</p>
                  <p className="text-sm">
                    <span className="font-medium">{eintrag.nutzerName}</span> hat {modellName(eintrag.modell)}
                    {beschreibung && <> &bdquo;{beschreibung}&ldquo;</>} {AKTION_TEXT[eintrag.aktion] ?? eintrag.aktion}
                    {volkName && (
                      <>
                        {" · "}
                        <Link href={`/voelker/${eintrag.volkId}`} className="text-accent hover:underline">
                          {volkName}
                        </Link>
                      </>
                    )}
                  </p>
                  {liste.length > 0 && (
                    <details className="mt-1 text-xs">
                      <summary className="cursor-pointer text-muted">
                        {eintrag.aktion === "geaendert" ? `${liste.length} ${liste.length === 1 ? "Feld" : "Felder"} geändert` : "Inhalt"}
                      </summary>
                      <dl className="mt-1 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-0.5">
                        {liste.map(({ feld, alt, neu }) => (
                          <div key={feld} className="contents">
                            <dt className="text-muted">{feld}</dt>
                            <dd className="break-words">
                              {alt !== undefined && neu !== undefined ? (
                                <>
                                  <span className="text-muted line-through">{alt}</span> → {neu}
                                </>
                              ) : (
                                (neu ?? alt)
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {weitere && (
          <div className="mt-4">
            <LinkKnopf href={`/einstellungen/historie?${aeltere.toString()}`} variant="secondary">
              Ältere anzeigen
            </LinkKnopf>
          </div>
        )}
      </Card>
    </div>
  );
}
