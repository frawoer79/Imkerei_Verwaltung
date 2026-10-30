import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bienenstandLoeschen } from "@/lib/actions";
import { Card } from "@/components/ui";
import { EndgueltigLoeschenFormular } from "@/components/endgueltig-loeschen-formular";
import { behandlungenAmStand, sperrtextStand } from "@/lib/bestandsbuch-sperre";
import { SeitenNavigation } from "@/components/seiten-navigation";

export default async function BienenstandEndgueltigLoeschenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const bienenstand = await prisma.bienenstand.findUnique({
    where: { id },
    include: { _count: { select: { voelker: true } } },
  });

  if (!bienenstand) {
    notFound();
  }

  const behandlungen = await behandlungenAmStand(bienenstand.id);
  const loeschen = bienenstandLoeschen.bind(null, bienenstand.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation pfad={[
            { href: `/bienenstaende/${bienenstand.id}`, label: bienenstand.name },
            { href: `/bienenstaende/${bienenstand.id}/bearbeiten`, label: "Bearbeiten" },
          ]} className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight text-gefahr">
          Bienenstand endgültig löschen
        </h1>
      </div>

      <Card className="border-gefahr-rand">
        <p className="mb-3 text-sm">
          Das Löschen lässt sich nicht rückgängig machen, anders als &bdquo;Archivieren&ldquo;.
          Normalerweise reicht Archivieren: Der Bienenstand verschwindet aus den Übersichten, die
          Dokumentation bleibt erhalten.
        </p>
        {behandlungen > 0 ? (
          <p role="alert" className="text-sm">
            <strong>Löschen nicht möglich.</strong>{" "}
            {sperrtextStand(behandlungen).replace("Löschen nicht möglich. ", "")}
          </p>
        ) : (
        <EndgueltigLoeschenFormular
          action={loeschen}
          erwarteterText={bienenstand.name}
          hinweis={
            bienenstand._count.voelker > 0
              ? `Löscht "${bienenstand.name}" mit ${
                  bienenstand._count.voelker === 1 ? "dem 1 Volk" : `den ${bienenstand._count.voelker} Völkern`
                }, deren gesamtem Stockkarten-Verlauf und allen Fotos unwiderruflich.`
              : `Löscht "${bienenstand.name}" unwiderruflich.`
          }
        />
        )}
      </Card>
    </div>
  );
}
