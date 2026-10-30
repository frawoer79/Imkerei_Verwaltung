import { prisma } from "@/lib/prisma";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import {
  eimerEinzelnSetzen,
  gebindeAnlegen,
  gebindeLoeschen,
  lagerortLoeschen,
  lagerortSpeichern,
  sorteAnlegen,
  sorteLoeschen,
  warenwertPreiseSpeichern,
  warenwertSetzen,
} from "@/lib/actions";
import { warenwertAn } from "@/lib/lager";
import { ErzeugnisStammdaten } from "@/components/erzeugnis-stammdaten";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

// Einstellungen fürs Lager: je Erzeugnis Sorten, Gebinde, "Eimer einzeln
// wiegen" und (wenn eingeschaltet) Preise für den Warenwert, dazu die
// Lagerorte. Gebucht (einlagern, auslagern, abfüllen) wird
// im Lager selbst. Lagerorte sind komplett optional: einmal anlegen, danach
// bei Material und Erzeugnis-Buchungen auswählbar.
export default async function LagerEinstellungenPage() {
  await bereichPflicht("lager");
  const [typen, gebindeBestand, sortenBestand, lagerorte, warenwert] = await Promise.all([
    prisma.erzeugnistyp.findMany({
      orderBy: [{ reihenfolge: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        einheit: true,
        eimerEinzeln: true,
        preis: true,
        gebinde: { orderBy: { inhalt: "desc" }, select: { id: true, name: true, inhalt: true, preis: true } },
        sorten: {
          orderBy: [{ reihenfolge: "asc" }, { name: "asc" }],
          select: { id: true, name: true, preis: true, gebindePreise: { select: { gebindeId: true, preis: true } } },
        },
      },
    }),
    // Was je Gebinde (Stück) und je Sorte (Menge) auf Lager liegt - für die
    // Rückfrage beim Löschen.
    prisma.erzeugnisBuchung.groupBy({ by: ["gebindeId"], where: { gebindeId: { not: null } }, _sum: { anzahl: true } }),
    prisma.erzeugnisBuchung.groupBy({ by: ["sorteId"], where: { sorteId: { not: null } }, _sum: { menge: true } }),
    prisma.lagerort.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { materialartikel: true, erzeugnisBuchungen: true } },
      },
    }),
    warenwertAn(),
  ]);

  const stueck = new Map(gebindeBestand.map((zeile) => [zeile.gebindeId, Math.max(zeile._sum.anzahl ?? 0, 0)]));
  const menge = new Map(sortenBestand.map((zeile) => [zeile.sorteId, Math.max(Math.round((zeile._sum.menge ?? 0) * 1000) / 1000, 0)]));
  const erzeugnisse = typen.map((typ) => ({
    ...typ,
    gebinde: typ.gebinde.map((gebinde) => ({ ...gebinde, aufLager: stueck.get(gebinde.id) ?? 0 })),
    sorten: typ.sorten.map((sorte) => ({ ...sorte, aufLager: menge.get(sorte.id) ?? 0 })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Lager</h1>
        <p className="text-sm text-muted">
          Sorten, Gebinde, Warenwert und Lagerorte. Einlagern, Auslagern und Abfüllen machst du im Lager.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Erzeugnisse</h2>
        <ErzeugnisStammdaten
          erzeugnisse={erzeugnisse}
          gebindeAnlegen={gebindeAnlegen}
          gebindeLoeschen={gebindeLoeschen}
          sorteAnlegen={sorteAnlegen}
          sorteLoeschen={sorteLoeschen}
          eimerEinzelnSetzen={eimerEinzelnSetzen}
          warenwert={warenwert}
          warenwertSetzen={warenwertSetzen}
          preiseSpeichern={warenwertPreiseSpeichern}
        />
      </Card>

      <section id="lagerorte" className="flex scroll-mt-24 flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Lagerorte</h2>
          <p className="text-sm text-muted">
            Wo Material und Erzeugnisse lagern. Nur nötig, wenn du an mehreren Stellen lagerst. Ohne
            Angabe bleibt offen, wo etwas steht.
          </p>
        </div>

      {lagerorte.length > 0 && (
        <div className="flex flex-col gap-3">
          {lagerorte.map((ort) => {
            const inVerwendung = ort._count.materialartikel + ort._count.erzeugnisBuchungen;
            return (
              <Card key={ort.id}>
                <form action={lagerortSpeichern} className="flex flex-col gap-3">
                  <input type="hidden" name="lagerortId" value={ort.id} />
                  <div>
                    <Label htmlFor={`name-${ort.id}`}>Name</Label>
                    <Input id={`name-${ort.id}`} name="name" defaultValue={ort.name} required />
                  </div>
                  <div>
                    <Label htmlFor={`notizen-${ort.id}`}>Notizen</Label>
                    <Textarea
                      id={`notizen-${ort.id}`}
                      name="notizen"
                      rows={2}
                      defaultValue={ort.notizen ?? ""}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Button type="submit" variant="secondary">
                      Übernehmen
                    </Button>
                    <span className="text-xs text-muted">
                      {inVerwendung === 0 ? "noch nichts zugeordnet" : `${inVerwendung} × zugeordnet`}
                    </span>
                  </div>
                </form>
                {inVerwendung === 0 && (
                  <form action={lagerortLoeschen.bind(null, ort.id)} className="mt-2">
                    <button
                      type="submit"
                      className="text-xs text-muted hover:text-gefahr"
                    >
                      Lagerort löschen
                    </button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Neuer Lagerort</h2>
        <form action={lagerortSpeichern} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="neu-name">Name</Label>
            <Input id="neu-name" name="name" placeholder="z.B. Lager 1, Kühlraum" required />
          </div>
          <div>
            <Label htmlFor="neu-notizen">Notizen</Label>
            <Textarea id="neu-notizen" name="notizen" rows={2} />
          </div>
          <div>
            <Button type="submit">Anlegen</Button>
          </div>
        </form>
      </Card>
      </section>
    </div>
  );
}
