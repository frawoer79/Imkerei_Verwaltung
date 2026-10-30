import { prisma } from "@/lib/prisma";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import {
  belegstelleJahrLoeschen,
  belegstelleJahrSpeichern,
  belegstelleLoeschen,
  belegstelleSpeichern,
} from "@/lib/actions";
import { LoeschenButton } from "@/components/loeschen-button";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";
import { belegjahr } from "@/lib/koeniginnen";

// Belegstellen als Stammdaten: einmal anlegen, danach bei jeder Königin
// auswählbar - wie die Beutensysteme. Verhindert, dass derselbe Ort in zehn
// Schreibweisen in der Datenbank landet. Die Drohnenvölker wechseln jährlich
// und stehen deshalb je Jahr darunter, als Historie für die Vaterseite der
// Königinnen.
export default async function BelegstellenPage() {
  await bereichPflicht("koeniginnen");
  const belegstellen = await prisma.belegstelle.findMany({
    orderBy: { name: "asc" },
    include: {
      jahre: { orderBy: { jahr: "desc" } },
      koeniginnen: { select: { begattungVon: true, jahrgang: true } },
    },
  });
  const aktuellesJahr = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Belegstellen</h1>
        <p className="text-sm text-muted">
          Orte mit definierten Drohnenvölkern, an denen Königinnen angepaart werden. Die Drohnenvölker
          trägst du je Jahr ein. Eine Königin zeigt dann die Drohnenvölker aus ihrem Belegjahr.
        </p>
      </div>

      {belegstellen.length > 0 && (
        <div className="flex flex-col gap-3">
          {belegstellen.map((stelle) => {
            // Königinnen je Belegjahr, damit man sieht, an welchem Jahr
            // Abstammungen hängen.
            const jeJahr = new Map<number, number>();
            for (const koenigin of stelle.koeniginnen) {
              const jahr = belegjahr(koenigin);
              if (jahr !== null) jeJahr.set(jahr, (jeJahr.get(jahr) ?? 0) + 1);
            }
            const vorschlagJahr = stelle.jahre.some((eintrag) => eintrag.jahr === aktuellesJahr)
              ? Math.max(...stelle.jahre.map((eintrag) => eintrag.jahr)) + 1
              : aktuellesJahr;
            return (
              <Card key={stelle.id}>
                <form action={belegstelleSpeichern} className="flex flex-col gap-3">
                  <input type="hidden" name="belegstelleId" value={stelle.id} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label htmlFor={`name-${stelle.id}`}>Name</Label>
                      <Input id={`name-${stelle.id}`} name="name" defaultValue={stelle.name} required />
                    </div>
                    <div>
                      <Label htmlFor={`ort-${stelle.id}`}>Ort</Label>
                      <Input id={`ort-${stelle.id}`} name="ort" defaultValue={stelle.ort ?? ""} />
                    </div>
                    <div>
                      <Label htmlFor={`rasse-${stelle.id}`}>Rasse</Label>
                      <Input id={`rasse-${stelle.id}`} name="rasse" defaultValue={stelle.rasse ?? ""} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`notizen-${stelle.id}`}>Notizen</Label>
                    <Textarea
                      id={`notizen-${stelle.id}`}
                      name="notizen"
                      rows={2}
                      defaultValue={stelle.notizen ?? ""}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Button type="submit" variant="secondary">
                      Übernehmen
                    </Button>
                    <span className="text-xs text-muted">
                      {stelle.koeniginnen.length === 0
                        ? "noch keiner Königin zugeordnet"
                        : `${stelle.koeniginnen.length} ${stelle.koeniginnen.length === 1 ? "Königin" : "Königinnen"}`}
                    </span>
                  </div>
                </form>

                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                    Drohnenvölker je Jahr
                  </p>
                  {stelle.jahre.length === 0 ? (
                    <p className="mb-3 text-sm text-muted">Noch kein Jahr eingetragen.</p>
                  ) : (
                    <ul className="mb-3 divide-y divide-border rounded-lg border border-border">
                      {stelle.jahre.map((eintrag) => {
                        const anzahl = jeJahr.get(eintrag.jahr) ?? 0;
                        return (
                          <li key={eintrag.id}>
                            <details className="group">
                              <summary className="flex cursor-pointer list-none items-start gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                                <span className="w-12 shrink-0 font-semibold tabular-nums">{eintrag.jahr}</span>
                                <span className="min-w-0 flex-1 whitespace-pre-wrap text-sm">
                                  {eintrag.drohnenvoelker}
                                  {anzahl > 0 && (
                                    <span className="block text-xs text-muted">
                                      {anzahl} {anzahl === 1 ? "Königin" : "Königinnen"} aus diesem Jahr
                                    </span>
                                  )}
                                </span>
                                <span className="shrink-0 text-muted transition-transform group-open:rotate-180">▾</span>
                              </summary>
                              <div className="flex flex-col gap-3 border-t border-border p-3">
                                <form action={belegstelleJahrSpeichern} className="flex flex-col gap-3">
                                  <input type="hidden" name="belegstelleId" value={stelle.id} />
                                  <input type="hidden" name="jahr" value={eintrag.jahr} />
                                  <div>
                                    <Label htmlFor={`drohnen-${eintrag.id}`}>Drohnenvölker {eintrag.jahr}</Label>
                                    <Textarea
                                      id={`drohnen-${eintrag.id}`}
                                      name="drohnenvoelker"
                                      rows={2}
                                      defaultValue={eintrag.drohnenvoelker}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <Button type="submit" variant="secondary" groesse="mittel">
                                      Übernehmen
                                    </Button>
                                  </div>
                                </form>
                                <LoeschenButton
                                  action={belegstelleJahrLoeschen.bind(null, eintrag.id)}
                                  bestaetigung={
                                    anzahl > 0
                                      ? `Jahr ${eintrag.jahr} entfernen? ${anzahl} ${anzahl === 1 ? "Königin verliert" : "Königinnen verlieren"} damit die Angabe ihrer Drohnenvölker.`
                                      : `Jahr ${eintrag.jahr} entfernen?`
                                  }
                                  variant="leiseGefahr"
                                  groesse="mittel"
                                >
                                  Jahr entfernen
                                </LoeschenButton>
                              </div>
                            </details>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <form action={belegstelleJahrSpeichern} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <input type="hidden" name="belegstelleId" value={stelle.id} />
                    <div className="sm:w-28">
                      <Label htmlFor={`jahr-neu-${stelle.id}`}>Jahr</Label>
                      <Input
                        id={`jahr-neu-${stelle.id}`}
                        name="jahr"
                        type="number"
                        inputMode="numeric"
                        min={1900}
                        max={2200}
                        defaultValue={vorschlagJahr}
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`drohnen-neu-${stelle.id}`}>Drohnenvölker</Label>
                      <Input
                        id={`drohnen-neu-${stelle.id}`}
                        name="drohnenvoelker"
                        placeholder="z.B. Linie, Zuchtbuchnr., Anzahl Völker"
                        required
                      />
                    </div>
                    <div>
                      <Button type="submit" variant="secondary">
                        Jahr eintragen
                      </Button>
                    </div>
                  </form>
                </div>

                {stelle.koeniginnen.length === 0 && (
                  <form action={belegstelleLoeschen.bind(null, stelle.id)} className="mt-3">
                    <button type="submit" className="text-xs text-muted hover:text-gefahr">
                      Belegstelle löschen
                    </button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Neue Belegstelle</h2>
        <form action={belegstelleSpeichern} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="neu-name">Name</Label>
              <Input id="neu-name" name="name" placeholder="z.B. Vogelsberg" required />
            </div>
            <div>
              <Label htmlFor="neu-ort">Ort</Label>
              <Input id="neu-ort" name="ort" />
            </div>
            <div>
              <Label htmlFor="neu-rasse">Rasse</Label>
              <Input id="neu-rasse" name="rasse" placeholder="z.B. Carnica" />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="sm:w-28">
              <Label htmlFor="neu-jahr">Jahr</Label>
              <Input
                id="neu-jahr"
                name="jahr"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2200}
                defaultValue={aktuellesJahr}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="neu-drohnenvoelker">Drohnenvölker</Label>
              <Input
                id="neu-drohnenvoelker"
                name="drohnenvoelker"
                placeholder="z.B. Linie, Zuchtbuchnr., Anzahl Völker"
              />
            </div>
          </div>
          <div>
            <Button type="submit">Anlegen</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
