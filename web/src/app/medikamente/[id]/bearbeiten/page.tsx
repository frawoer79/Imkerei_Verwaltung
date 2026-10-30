import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  belegLoeschen,
  belegeHinzufuegen,
  medikamentAktualisieren,
  medikamentLoeschen,
} from "@/lib/actions";
import { Button, Card, Label } from "@/components/ui";
import { FormularFehler, SicheresFormular, SpeichernKnopf } from "@/components/sicheres-formular";
import { MedikamentFelder } from "@/components/medikament-felder";
import { datumAnzeige } from "@/lib/behandlung";
import { IconBild, IconDokument } from "@/components/icons";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

function groesseAnzeige(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export default async function MedikamentBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await bereichPflicht("behandlungen");
  const { id } = await params;

  const medikament = await prisma.medikament.findUnique({
    where: { id },
    include: {
      belege: { orderBy: { erstelltAm: "asc" } },
      _count: { select: { behandlungen: true } },
    },
  });

  if (!medikament) {
    notFound();
  }

  const aktualisieren = medikamentAktualisieren.bind(null, medikament.id);
  const belegeAnhaengen = belegeHinzufuegen.bind(null, medikament.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation pfad={[{ href: "/medikamente", label: "Medikamente" }]} className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">{medikament.name}</h1>
        <p className="text-sm text-muted">
          {medikament._count.behandlungen}{" "}
          {medikament._count.behandlungen === 1 ? "Behandlung" : "Behandlungen"} dokumentiert
        </p>
      </div>

      <Card>
        <SicheresFormular action={aktualisieren} className="flex flex-col gap-4">
          <MedikamentFelder werte={medikament} />
          <FormularFehler />
          <div>
            <SpeichernKnopf>Änderungen speichern</SpeichernKnopf>
          </div>
        </SicheresFormular>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Belege</h2>
        <p className="mb-3 text-sm text-muted">
          Rechnung, Lieferschein oder tierärztliche Verschreibung (fünf Jahre aufzubewahren).
        </p>

        {medikament.belege.length === 0 ? (
          <p className="mb-3 text-sm text-muted">Noch kein Beleg hinterlegt.</p>
        ) : (
          <ul className="mb-3 flex flex-col">
            {medikament.belege.map((beleg) => (
              <li
                key={beleg.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-b-0"
              >
                <a
                  href={`/belege/${beleg.dateiname}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                >
                  {beleg.mimeType === "application/pdf" ? (
                    <IconDokument className="h-4 w-4 shrink-0" />
                  ) : (
                    <IconBild className="h-4 w-4 shrink-0" />
                  )}
                  {beleg.originalDateiname}
                </a>
                <span className="text-xs text-muted">
                  {groesseAnzeige(beleg.groesse)} · {datumAnzeige(beleg.erstelltAm)}
                </span>
                <form action={belegLoeschen.bind(null, beleg.id)}>
                  <Button type="submit" variant="danger">
                    Entfernen
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={belegeAnhaengen} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="belege">Beleg hinzufügen</Label>
            <input
              id="belege"
              name="belege"
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="w-full text-sm"
            />
          </div>
          <div>
            <Button type="submit" variant="secondary">
              Hochladen
            </Button>
          </div>
        </form>
      </Card>

      {medikament._count.behandlungen === 0 && (
        <Card>
          <h2 className="mb-1 text-lg font-semibold">Löschen</h2>
          <p className="mb-3 text-sm text-muted">
            Möglich, solange keine Behandlung darauf verweist. Danach kann das Medikament nur
            noch als aufgebraucht markiert werden.
          </p>
          <form action={medikamentLoeschen.bind(null, medikament.id)}>
            <Button type="submit" variant="danger">
              Medikament löschen
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
