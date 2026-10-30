import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button, Card, Input } from "@/components/ui";
import { VelutinaReiter } from "@/components/velutina-reiter";
import { nestsucheAnlegen } from "@/lib/nestsuche-actions";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

function datum(wert: Date): string {
  return wert.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
}

export default async function NestsuchePage() {
  await bereichPflicht("velutina");
  const suchen = await prisma.velutinaNestsuche.findMany({
    orderBy: { angelegtAm: "desc" },
    include: { locktoepfe: { select: { _count: { select: { beobachtungen: true } } } } },
  });
  const laufend = suchen.filter((suche) => !suche.abgeschlossenAm);
  const beendet = suchen.filter((suche) => suche.abgeschlossenAm && !suche.archiviertAm);
  const archiv = suchen.filter((suche) => suche.archiviertAm);
  // Archiv nach Jahr der Suche gruppiert, neueste zuerst.
  const archivJahre = [...new Set(archiv.map((suche) => suche.angelegtAm.getFullYear()))].sort((a, b) => b - a);

  return (
    <div className="flex flex-col gap-6">
      <SeitenNavigation hauptseite className="-mb-3" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Velutina</h1>
        <p className="text-sm text-muted">
          Nest per Locktopf eingrenzen: Hornissen markieren, Abflugrichtung peilen, Rundzeit stoppen. Aus mehreren
          Peilungen ergibt sich der Bereich, in dem das Nest liegen muss.
        </p>
      </div>

      <VelutinaReiter aktiv="nestsuche" anzahlSuchen={laufend.length} />

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Neue Nestsuche</h2>
        <form action={nestsucheAnlegen} className="flex flex-col gap-2 sm:flex-row">
          <Input name="name" placeholder="z.B. Dachtel Oktober" aria-label="Name der Nestsuche" className="sm:max-w-sm" />
          <Button type="submit">Anlegen</Button>
        </form>
      </Card>

      <SuchenListe titel="Laufende Suchen" suchen={laufend} leer="Keine laufende Suche." />
      {beendet.length > 0 && <SuchenListe titel="Abgeschlossen" suchen={beendet} leer="" />}

      {archiv.length > 0 && (
        <Card className="flex flex-col gap-3">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-baseline gap-2">
              <span className="text-muted transition-transform group-open:rotate-90">›</span>
              <h2 className="text-lg font-semibold">Archiv</h2>
              <span className="text-sm text-muted">
                {archiv.length} {archiv.length === 1 ? "Suche" : "Suchen"} ·{" "}
                {archiv.filter((suche) => suche.nestBreitengrad !== null).length} mit Nestfund
              </span>
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {archivJahre.map((jahr) => (
                <SuchenListe
                  key={jahr}
                  titel={String(jahr)}
                  suchen={archiv.filter((suche) => suche.angelegtAm.getFullYear() === jahr)}
                  leer=""
                  eingebettet
                />
              ))}
            </div>
          </details>
        </Card>
      )}

      <Card className="flex flex-col gap-2 text-sm">
        <h2 className="text-base font-semibold">So geht&apos;s</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Locktopf mit flüssigem Köder aufstellen (Sirup, Bier, Wein), 50–70 cm hoch, freie Sicht.</li>
          <li>Fressende Hornisse markieren. Nur Tiere, die regelmäßig wiederkommen, fliegen zum Nest.</li>
          <li>Abflugrichtung auf der Karte einzeichnen oder das Handy in Flugrichtung halten.</li>
          <li>Mehrere Runden stoppen (3–5), die kürzeste zählt.</li>
          <li>Zweiten Locktopf etwa 200 m seitlich versetzt aufstellen, bis sich die Bereiche schneiden.</li>
        </ol>
        <p className="text-xs text-muted">
          Ein gefundenes Nest nicht selbst entfernen, sondern melden (in Baden-Württemberg über die
          LUBW-Meldeplattform).
        </p>
      </Card>
    </div>
  );
}

function SuchenListe({
  titel,
  suchen,
  leer,
  eingebettet = false,
}: {
  titel: string;
  eingebettet?: boolean;
  suchen: {
    id: string;
    name: string;
    angelegtAm: Date;
    abgeschlossenAm: Date | null;
    nestBreitengrad: number | null;
    locktoepfe: { _count: { beobachtungen: number } }[];
  }[];
  leer: string;
}) {
  const Rahmen = eingebettet ? "section" : Card;
  return (
    <Rahmen className={`flex flex-col ${eingebettet ? "gap-2" : "gap-3"}`}>
      {eingebettet ? (
        <h3 className="text-sm font-semibold text-muted">{titel}</h3>
      ) : (
        <h2 className="text-lg font-semibold">{titel}</h2>
      )}
      {suchen.length === 0 ? (
        <p className="text-sm text-muted">{leer}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {suchen.map((suche) => {
            const hornissen = suche.locktoepfe.reduce((summe, topf) => summe + topf._count.beobachtungen, 0);
            return (
              <li key={suche.id}>
                <Link
                  href={`/velutina/nestsuche/${suche.id}`}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2.5 text-sm hover:bg-background"
                >
                  <span className="font-semibold text-accent">{suche.name}</span>
                  <span className="text-muted">seit {datum(suche.angelegtAm)}</span>
                  <span className="text-muted">
                    {suche.locktoepfe.length} {suche.locktoepfe.length === 1 ? "Locktopf" : "Locktöpfe"} · {hornissen}{" "}
                    {hornissen === 1 ? "Hornisse" : "Hornissen"}
                  </span>
                  {suche.abgeschlossenAm && (
                    <span className="text-xs font-medium">
                      {suche.nestBreitengrad !== null ? "Nest gefunden" : "ohne Fund beendet"} am {datum(suche.abgeschlossenAm)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Rahmen>
  );
}
