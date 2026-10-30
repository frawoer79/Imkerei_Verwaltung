import { notFound } from "next/navigation";
import { lubwLage } from "@/lib/bundeslaender";
import { prisma } from "@/lib/prisma";
import { VelutinaReiter } from "@/components/velutina-reiter";
import { NestsucheArbeitsplatz } from "@/components/nestsuche-arbeitsplatz";
import { meldungenLaden, standPunkteLaden } from "@/lib/velutina";
import type { NestsucheLocktopf } from "@/lib/nestsuche";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

const DATUM = { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" } as const;

export default async function NestsucheDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await bereichPflicht("velutina");
  const { id } = await params;
  const suche = await prisma.velutinaNestsuche.findUnique({
    where: { id },
    include: {
      locktoepfe: {
        orderBy: { angelegtAm: "asc" },
        include: { beobachtungen: { orderBy: { angelegtAm: "asc" } } },
      },
    },
  });
  if (!suche) notFound();

  // Zur Orientierung: eigene Stände und die LUBW-Nestmeldungen der Saison -
  // bei einer archivierten Suche die Saison, in der gesucht wurde.
  const jahr = (suche.archiviertAm ? suche.angelegtAm : new Date()).getFullYear();
  const jahresBeginn = new Date(Date.UTC(jahr, 0, 1));
  const jahresEnde = suche.archiviertAm ? new Date(Date.UTC(jahr + 1, 0, 1)) : null;
  // Außerhalb Baden-Württembergs gibt es keine LUBW-Meldungen, also keine Punkte.
  const [staende, meldungen] = await Promise.all([
    standPunkteLaden(),
    lubwLage().then((lage) => (lage === "anderes" ? [] : meldungenLaden(jahresBeginn, jahresEnde, null))),
  ]);

  const locktoepfe: NestsucheLocktopf[] = suche.locktoepfe.map((topf) => ({
    id: topf.id,
    name: topf.name,
    lat: topf.breitengrad,
    lng: topf.laengengrad,
    beobachtungen: topf.beobachtungen.map((b) => ({
      id: b.id,
      locktopfId: b.locktopfId,
      markierung: b.markierung,
      farbe: b.farbe,
      richtungGrad: b.richtungGrad,
      richtungQuelle: b.richtungQuelle,
      toleranzGrad: b.toleranzGrad,
      rundzeitenSek: b.rundzeitenSek,
      abflugAmMs: b.abflugAm ? b.abflugAm.getTime() : null,
      notiz: b.notiz,
    })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation pfad={[{ href: "/velutina/nestsuche", label: "Nestsuche" }]} className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">{suche.name}</h1>
        {suche.archiviertAm && (
          <p className="text-sm text-muted">
            Archiviert am {suche.archiviertAm.toLocaleDateString("de-DE", DATUM)} · gesucht{" "}
            {suche.angelegtAm.toLocaleDateString("de-DE", DATUM)} bis{" "}
            {suche.abgeschlossenAm?.toLocaleDateString("de-DE", DATUM)}
          </p>
        )}
      </div>

      <VelutinaReiter aktiv="nestsuche" />

      <NestsucheArbeitsplatz
        suche={{
          id: suche.id,
          name: suche.name,
          abgeschlossen: suche.abgeschlossenAm !== null,
          archiviert: suche.archiviertAm !== null,
          nest:
            suche.nestBreitengrad !== null && suche.nestLaengengrad !== null
              ? { lat: suche.nestBreitengrad, lng: suche.nestLaengengrad }
              : null,
        }}
        locktoepfe={locktoepfe}
        staende={staende}
        lubwNester={meldungen
          .filter((meldung) => meldung.art === "NEST")
          .map((meldung) => ({ id: meldung.id, lat: meldung.lat, lng: meldung.lng }))}
      />
    </div>
  );
}
