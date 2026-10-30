import { prisma } from "@/lib/prisma";
import { FlugradiusKarte } from "@/components/flugradius-karte";
import { SeitenNavigation } from "@/components/seiten-navigation";

export default async function KartePage() {
  const staende = await prisma.bienenstand.findMany({
    where: { breitengrad: { not: null }, laengengrad: { not: null } },
    orderBy: { name: "asc" },
  });

  const punkte = staende.map((stand) => ({
    id: stand.id,
    name: stand.name,
    lat: stand.breitengrad!,
    lng: stand.laengengrad!,
    archiviert: stand.archiviert,
    wanderstand: stand.standtyp === "WANDER",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation menuepunkt="/" className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Kartenübersicht</h1>
        <p className="text-sm text-muted">
          Alle Bienenstände mit hinterlegtem Standort, mit einstellbarem Flugradius der Bienen.
        </p>
      </div>

      {punkte.length === 0 ? (
        <p className="text-muted">
          Noch kein Bienenstand mit Standort auf der Karte hinterlegt.
        </p>
      ) : (
        <FlugradiusKarte staende={punkte} />
      )}
    </div>
  );
}
