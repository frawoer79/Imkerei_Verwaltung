import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, knopfKlassen } from "@/components/ui";
import { FAELLIGKEIT_TEXT, faelligkeitBestimmen, faelligkeitText } from "@/lib/faelligkeit";
import { kurzesDatum } from "@/lib/koeniginnen";
import { zuchtSchrittFinden } from "@/lib/zucht";
import { KoeniginStern } from "@/components/koenigin-stern";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

export default async function ZuchtplanungPage() {
  await bereichPflicht("koeniginnen");
  const serien = await prisma.zuchtserie.findMany({
    orderBy: [{ abgeschlossen: "asc" }, { umlarvDatum: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    include: {
      zuchtVolk: { select: { name: true, bienenstand: { select: { name: true } } } },
      mutterKoenigin: { select: { kennung: true, stern: true } },
      massnahmen: {
        where: { erledigt: false },
        orderBy: { faelligAm: "asc" },
        take: 1,
        select: { zuchtSchritt: true, faelligAm: true },
      },
      _count: { select: { koeniginnen: true } },
    },
  });

  const heute = new Date();
  const laufende = serien.filter((serie) => !serie.abgeschlossen);
  const abgeschlossene = serien.filter((serie) => serie.abgeschlossen);

  const kachel = (serie: (typeof serien)[number]) => {
    const naechster = serie.massnahmen[0];
    const schritt =
      naechster?.zuchtSchritt && zuchtSchrittFinden(naechster.zuchtSchritt, serie.pflegeart, serie.brutschrank);
    const faelligkeit = naechster?.faelligAm ? faelligkeitBestimmen(naechster.faelligAm, heute) : "ohne";
    return (
      <Link key={serie.id} href={`/koeniginnen/zucht/${serie.id}`} className="block">
        <Card
          className={`flex flex-col gap-1 transition-shadow hover:shadow-md ${serie.abgeschlossen ? "opacity-70 hover:opacity-100" : ""}`}
        >
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{serie.bezeichnung}</span>
            <span className="text-sm text-muted">
              {serie.mutterKoenigin ? `Mutter ${serie.mutterKoenigin.kennung}` : "ohne Zuchtmutter"}
              {serie.mutterKoenigin?.stern && <KoeniginStern className="ml-1 h-7 w-7" />}
              {serie.zuchtVolk && ` · ${serie.zuchtVolk.name} (${serie.zuchtVolk.bienenstand.name})`}
            </span>
          </p>
          <p className="text-xs text-muted">
            {[
              serie.umlarvDatum ? `Umlarven ${kurzesDatum(serie.umlarvDatum)}` : "Umlarvtermin offen",
              serie.anzahlUmgelarvt !== null && `${serie.anzahlUmgelarvt} umgelarvt`,
              serie.anzahlAngenommen !== null && `${serie.anzahlAngenommen} angenommen`,
              serie._count.koeniginnen > 0 &&
                `${serie._count.koeniginnen} ${serie._count.koeniginnen === 1 ? "Königin" : "Königinnen"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {schritt && naechster.faelligAm && (
            <p className={`text-sm ${FAELLIGKEIT_TEXT[faelligkeit]}`}>
              Nächster Schritt: {schritt.titel} ({faelligkeitText(faelligkeit, kurzesDatum(naechster.faelligAm))})
            </p>
          )}
        </Card>
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <SeitenNavigation className="mb-2" />
          <h1 className="text-2xl font-semibold tracking-tight">Zuchtplanung</h1>
          <p className="text-sm text-muted">
            Von welchem Volk nachgezogen wird, wann umgelarvt wird und was danach wann ansteht.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/koeniginnen/stammbaum"
            className={knopfKlassen("secondary", "klein")}
          >
            Stammbaum
          </Link>
          <Link
            href="/koeniginnen/zucht/neu"
            className={knopfKlassen("primary", "klein")}
          >
            + Neue Zuchtserie
          </Link>
        </div>
      </div>

      {serien.length === 0 ? (
        <Card className="text-center text-muted">
          Noch keine Zuchtserie. Leg mit &bdquo;Neue Zuchtserie&ldquo; das Zuchtvolk fest und trag den
          Umlarvtermin ein, sobald er feststeht.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">{laufende.map(kachel)}</div>
      )}

      {abgeschlossene.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">Abgeschlossen</h2>
          <div className="flex flex-col gap-3">{abgeschlossene.map(kachel)}</div>
        </div>
      )}
    </div>
  );
}
