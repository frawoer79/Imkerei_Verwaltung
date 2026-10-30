import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bereichPflicht } from "@/lib/bereiche";
import { Card } from "@/components/ui";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { VerfahrenFormular } from "@/components/verfahren-formular";
import { bioVerfahrenAendern } from "@/lib/bio-verfahren-actions";

export default async function VerfahrenBearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  await bereichPflicht("behandlungen");
  const { id } = await params;
  const verfahren = await prisma.bioVerfahren.findUnique({ where: { id } });
  if (!verfahren) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Verfahren bearbeiten</h1>
        <p className="text-sm text-muted">Verschiebst du den Beginn, wandern alle offenen Schritte mit.</p>
      </div>
      <Card>
        <VerfahrenFormular
          action={bioVerfahrenAendern.bind(null, verfahren.id)}
          werte={{
            art: verfahren.art,
            beginn: verfahren.beginn.toISOString().slice(0, 10),
            bezeichnung: verfahren.bezeichnung,
            anwender: verfahren.anwender,
            bemerkung: verfahren.bemerkung,
            brutwaben: verfahren.brutwaben,
            verbleib: verfahren.verbleib,
            fangwabe: verfahren.fangwabe,
            kaefig: verfahren.kaefig,
            bannwabeVariante: verfahren.bannwabeVariante,
            inMassnahmen: verfahren.inMassnahmen,
          }}
        />
      </Card>
    </div>
  );
}
