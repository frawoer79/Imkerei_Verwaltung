import { prisma } from "@/lib/prisma";
import { nachNamen } from "@/lib/sortierung";
import { behandlungAnlegen } from "@/lib/actions";
import { Card, LinkKnopf } from "@/components/ui";
import { BehandlungFormular } from "@/components/behandlung-formular";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { fehlendeMedikamentAngaben } from "@/lib/behandlung";
import { bereichPflicht } from "@/lib/bereiche";
import { bioVerfahrenAnlegen } from "@/lib/bio-verfahren-actions";
import { VerfahrenFormular } from "@/components/verfahren-formular";
import { verfahrenSchritte, verfahrenTitel } from "@/lib/bio-verfahren";
import Link from "next/link";

export default async function BehandlungNeuPage({
  searchParams,
}: {
  searchParams: Promise<{ volk?: string; art?: string; verfahren?: string; schritt?: string }>;
}) {
  await bereichPflicht("behandlungen");
  const { volk: vorausgewaehltesVolk, art, verfahren: verfahrenId, schritt } = await searchParams;
  const ohneMedikament = art === "bio" && !verfahrenId;

  const [medikamenteRoh, staendeRoh, betrieb] = await Promise.all([
    prisma.medikament.findMany({
      where: { archiviert: false },
      orderBy: { name: "asc" },
      include: { _count: { select: { belege: true } } },
    }),
    prisma.bienenstand.findMany({
      where: { archiviert: false },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        voelker: {
          where: { archiviert: false },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        },
      },
    }),
    prisma.betrieb.findUnique({ where: { id: "standard" } }),
  ]);

  // Medikamenten-Schritt eines Verfahrens: Völker mit offenem Schritt vorwählen
  // (vom Volk aus nur dieses), Oxalsäure als Mittel vorschlagen.
  const verfahren = verfahrenId
    ? await prisma.bioVerfahren.findUnique({
        where: { id: verfahrenId },
        include: { massnahmen: { where: { bioSchritt: schritt ?? "", erledigt: false }, select: { volkId: true } } },
      })
    : null;
  const verfahrenSchritt = verfahren ? verfahrenSchritte(verfahren.art, verfahren).find((eintrag) => eintrag.schluessel === schritt) : undefined;
  const verfahrenVoelker = verfahren
    ? verfahren.massnahmen
        .map((massnahme) => massnahme.volkId)
        .filter((volkId) => !vorausgewaehltesVolk || volkId === vorausgewaehltesVolk)
    : [];

  const medikamente = medikamenteRoh.map((medikament) => ({
    id: medikament.id,
    name: medikament.name,
    einheit: medikament.einheit,
    wartezeitTage: medikament.wartezeitTage,
    chargennummer: medikament.chargennummer,
    fehlt: fehlendeMedikamentAngaben({
      lieferant: medikament.lieferant,
      belegnummer: medikament.belegnummer,
      anzahlBelege: medikament._count.belege,
    }),
  }));

  const staende = nachNamen(staendeRoh)
    .filter((stand) => stand.voelker.length > 0)
    .map((stand) => ({ ...stand, voelker: nachNamen(stand.voelker) }));

  const umschalterLink = (bio: boolean) => {
    const parameter = new URLSearchParams();
    if (vorausgewaehltesVolk) parameter.set("volk", vorausgewaehltesVolk);
    if (bio) parameter.set("art", "bio");
    const suche = parameter.toString();
    return `/behandlungen/neu${suche ? `?${suche}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Neue Behandlung</h1>
        <p className="text-sm text-muted">
          {verfahren && verfahrenSchritt
            ? `${verfahrenTitel(verfahren.art, verfahren.bezeichnung)}: ${verfahrenSchritt.titel}. Nach dem Speichern ist der Schritt abgehakt.`
            : "Eine Behandlung kann mehrere Völker auf einmal abdecken."}
        </p>
      </div>

      {!verfahren && (
        <nav aria-label="Art der Behandlung" className="grid grid-cols-2 gap-1 rounded-lg bg-border p-1 sm:max-w-md">
          {[
            { bio: false, text: "Mit Medikament" },
            { bio: true, text: "Ohne Medikament" },
          ].map((eintrag) => {
            const aktiv = eintrag.bio === ohneMedikament;
            return (
              <Link
                key={eintrag.text}
                href={umschalterLink(eintrag.bio)}
                replace
                aria-current={aktiv ? "page" : undefined}
                className={`flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium ${
                  aktiv ? "bg-card text-foreground shadow-sm" : "text-muted"
                }`}
              >
                {eintrag.text}
              </Link>
            );
          })}
        </nav>
      )}

      {ohneMedikament ? (
        staende.length === 0 ? (
          <Card className="text-sm">Es gibt noch keine Völker.</Card>
        ) : (
          <Card>
            <VerfahrenFormular
              action={bioVerfahrenAnlegen}
              staende={staende}
              anwenderVorschlag={betrieb?.halterName ?? ""}
              vorausgewaehltesVolk={vorausgewaehltesVolk}
            />
          </Card>
        )
      ) : medikamente.length === 0 ? (
        <Card>
          <p className="text-sm">
            Es ist noch kein Medikament angelegt. Ohne Arzneimittel-Bezeichnung und
            Erwerbsnachweis lässt sich keine Behandlung dokumentieren.
          </p>
          <div className="mt-3">
            <LinkKnopf href="/medikamente/neu">Medikament anlegen</LinkKnopf>
          </div>
        </Card>
      ) : staende.length === 0 ? (
        <Card className="text-sm">
          Es gibt noch keine Völker, die behandelt werden könnten.
        </Card>
      ) : (
        <Card>
          <BehandlungFormular
            action={behandlungAnlegen}
            medikamente={medikamente}
            staende={staende}
            anwenderVorschlag={betrieb?.halterName ?? ""}
            vorausgewaehltesVolk={vorausgewaehltesVolk}
            verfahren={
              verfahren && schritt
                ? {
                    verfahrenId: verfahren.id,
                    schritt,
                    volkIds: verfahrenVoelker,
                    medikamentId: medikamente.find((medikament) => /oxal/i.test(medikament.name))?.id,
                  }
                : undefined
            }
          />
        </Card>
      )}
    </div>
  );
}
