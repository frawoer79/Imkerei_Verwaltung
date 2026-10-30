import { prisma } from "@/lib/prisma";
import { dokumentAnlegen } from "@/lib/actions";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { DateiAuswahl } from "@/components/datei-auswahl";
import { DokumentKategorieAuswahl } from "@/components/dokument-kategorie-auswahl";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

// Heutiges Datum als Vorbelegung, in Lokalzeit (nicht toISOString - das würde
// bei Zeiten kurz nach Mitternacht in UTC-westlichen Zeitzonen den Vortag
// zeigen, hier ohne Belang, aber konsistent zum Rest der App).
function heute(): string {
  const jetzt = new Date();
  const zweistellig = (zahl: number) => zahl.toString().padStart(2, "0");
  return `${jetzt.getFullYear()}-${zweistellig(jetzt.getMonth() + 1)}-${zweistellig(jetzt.getDate())}`;
}

export default async function DokumentNeuPage({
  searchParams,
}: {
  searchParams: Promise<{ standId?: string; volkId?: string; koeniginId?: string }>;
}) {
  await bereichPflicht("dokumente");
  const { standId, volkId, koeniginId } = await searchParams;

  const [kategorien, staendeRoh, koeniginnen] = await Promise.all([
    prisma.dokumentkategorie.findMany({
      orderBy: [{ vorgegeben: "desc" }, { reihenfolge: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.bienenstand.findMany({
      where: { OR: [{ archiviert: false }, { id: standId }] },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        voelker: {
          where: { OR: [{ archiviert: false }, { id: volkId }] },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        },
      },
    }),
    prisma.koenigin.findMany({
      orderBy: [{ jahrgang: "desc" }, { kennung: "asc" }],
      select: { id: true, kennung: true, jahrgang: true, stern: true },
    }),
  ]);

  // Ziel nach dem Speichern: zurück dorthin, von wo aus hochgeladen wurde -
  // sonst zur zentralen Dokumentenliste.
  const zurueck = standId
    ? `/bienenstaende/${standId}`
    : volkId
      ? `/voelker/${volkId}`
      : koeniginId
        ? `/koeniginnen/${koeniginId}`
        : "/dokumente";

  const staendeMitVoelkern = staendeRoh.filter((stand) => stand.voelker.length > 0);

  // Pfad über der Überschrift: der Menüpunkt (Dokumente) und, falls von dort
  // aus hochgeladen wird, Stand, Volk oder Königin.
  const herkunftsStand = staendeRoh.find((stand) =>
    standId ? stand.id === standId : volkId ? stand.voelker.some((volk) => volk.id === volkId) : false,
  );
  const herkunftsVolk = volkId ? herkunftsStand?.voelker.find((volk) => volk.id === volkId) : undefined;
  const herkunftsKoenigin = koeniginId ? koeniginnen.find((koenigin) => koenigin.id === koeniginId) : undefined;
  const herkunft = [
    ...(herkunftsStand ? [{ href: `/bienenstaende/${herkunftsStand.id}`, label: herkunftsStand.name }] : []),
    ...(herkunftsVolk ? [{ href: `/voelker/${herkunftsVolk.id}`, label: herkunftsVolk.name }] : []),
    ...(herkunftsKoenigin ? [{ href: `/koeniginnen/${herkunftsKoenigin.id}`, label: herkunftsKoenigin.kennung }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation
          pfad={herkunft}
          menuepunkt={herkunftsStand ? "/bienenstaende" : herkunftsKoenigin ? "/koeniginnen" : undefined}
          className="mb-2"
        />
        <h1 className="text-2xl font-semibold tracking-tight">Dokument hochladen</h1>
        <p className="text-sm text-muted">
          Als Foto oder PDF, mit Kategorie und optionaler Verknüpfung zu Stand, Völkern oder
          Königin.
        </p>
      </div>

      <Card>
        <form action={dokumentAnlegen} className="flex flex-col gap-4">
          <input type="hidden" name="zurueck" value={zurueck} />

          <div>
            <Label htmlFor="kategorieId">Kategorie</Label>
            <DokumentKategorieAuswahl kategorien={kategorien} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="datum">Datum</Label>
              <Input id="datum" name="datum" type="date" defaultValue={heute()} required />
            </div>
            <div>
              <Label htmlFor="titel">Titel (optional)</Label>
              <Input id="titel" name="titel" placeholder="z.B. Rechnung Beutenkauf" />
            </div>
          </div>

          <div>
            <Label htmlFor="datei">Datei</Label>
            <DateiAuswahl id="datei" name="datei" accept="image/*,application/pdf" required />
          </div>

          <div>
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea id="notizen" name="notizen" rows={2} />
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="mb-1 text-sm font-semibold">Verknüpfung</h2>
            <p className="mb-3 text-xs text-muted">
              Optional. Ein verknüpftes Dokument erscheint zusätzlich auf der jeweiligen Seite.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="bienenstandId">Bienenstand</Label>
                <Select id="bienenstandId" name="bienenstandId" defaultValue={standId ?? ""}>
                  <option value="">Kein Bienenstand</option>
                  {staendeRoh.map((stand) => (
                    <option key={stand.id} value={stand.id}>
                      {stand.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="koeniginId">Königin</Label>
                <Select id="koeniginId" name="koeniginId" defaultValue={koeniginId ?? ""}>
                  <option value="">Keine Königin</option>
                  {koeniginnen.map((koenigin) => (
                    <option key={koenigin.id} value={koenigin.id}>
                      {koenigin.kennung}
                      {koenigin.stern ? " ★" : ""}
                      {koenigin.jahrgang ? ` (${koenigin.jahrgang})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {staendeMitVoelkern.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-sm font-medium text-muted">Völker</p>
                <div className="max-h-56 overflow-y-auto rounded-md border border-border p-2.5">
                  {staendeMitVoelkern.map((stand) => (
                    <div key={stand.id} className="mb-2 last:mb-0">
                      <p className="mb-1 text-xs font-medium text-muted">{stand.name}</p>
                      <div className="flex flex-col gap-1">
                        {stand.voelker.map((volk) => (
                          <label key={volk.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="volkIds"
                              value={volk.id}
                              defaultChecked={volk.id === volkId}
                              className="h-4 w-4 rounded border-border"
                            />
                            {volk.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <Button type="submit">Speichern</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
