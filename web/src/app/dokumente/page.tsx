import Link from "next/link";
import { belegLoeschen, dokumentLoeschen, lagerlisteLoeschen, nachweisLoeschen } from "@/lib/actions";
import { Card, LinkKnopf, knopfKlassen } from "@/components/ui";
import { DokumenteListe, type DokumentListenEintrag } from "@/components/dokumente-liste";
import { dokumenteListeLaden } from "@/lib/dokumente";
import { letzteEmpfaengerLaden, mailBereit, maxAnhangBytes } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { abgeschalteteBereiche, bereichPflicht } from "@/lib/bereiche";

// Zentrale Ablage für alles, was in der Imkerei als Dokument anfällt: frei
// hochgeladene Dokumente mit eigener Kategorie (Gesundheitszeugnisse,
// Rechnungen, ...), dazu die von der App selbst erzeugten
// Behandlungsnachweise, Medikamenten-Belege und Zuchtkarten - chronologisch
// an einer Stelle, mit Suche und Filter nach Art.
export default async function DokumentePage() {
  await bereichPflicht("dokumente");
  const [roh, letzteEmpfaenger, betrieb, versandBereit] = await Promise.all([
    dokumenteListeLaden(),
    letzteEmpfaengerLaden(),
    prisma.betrieb.findUnique({ where: { id: "standard" }, select: { email: true, halterName: true } }),
    mailBereit(),
  ]);

  // Dokumente aus ausgeschalteten Bereichen bleiben gespeichert, werden hier aber nicht gezeigt.
  const aus = await abgeschalteteBereiche();
  const verborgen: string[] = [
    ...(aus.includes("koeniginnen") ? ["ZUCHTKARTE"] : []),
    ...(aus.includes("behandlungen") ? ["BEHANDLUNGSNACHWEIS", "MEDIKAMENTENBELEG"] : []),
    ...(aus.includes("lager") ? ["LAGERLISTE"] : []),
  ];

  const dokumente: DokumentListenEintrag[] = roh.filter((dokument) => !verborgen.includes(dokument.typ)).map((dokument) => {
    switch (dokument.typ) {
      case "DOKUMENT":
        return { ...dokument, loeschenAction: dokumentLoeschen.bind(null, dokument.id) };
      case "BEHANDLUNGSNACHWEIS":
        return { ...dokument, loeschenAction: nachweisLoeschen.bind(null, dokument.id) };
      case "LAGERLISTE":
        return { ...dokument, loeschenAction: lagerlisteLoeschen.bind(null, dokument.id) };
      case "MEDIKAMENTENBELEG":
        return { ...dokument, loeschenAction: belegLoeschen.bind(null, dokument.id) };
      case "ZUCHTKARTE":
      default:
        return dokument;
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <SeitenNavigation className="-mb-3" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dokumente</h1>
          <p className="text-sm text-muted">
            Hochgeladene Dokumente nach Kategorie, dazu Behandlungsnachweise,
            Medikamenten-Belege, Zuchtkarten und Lagerlisten an einer Stelle.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!aus.includes("koeniginnen") && (
          <Link
            href="/koeniginnen/zuchtkarten"
            className={knopfKlassen("secondary", "klein")}
          >
            Zuchtkarten drucken
          </Link>
          )}
          <LinkKnopf href="/dokumente/neu">+ Upload</LinkKnopf>
        </div>
      </div>

      <Card>
        <DokumenteListe
          dokumente={dokumente}
          // Ohne eingerichteten Versand (Einstellungen → E-Mail-Versand) gibt es
          // weder Kästchen noch Knopf.
          mail={
            versandBereit
              ? {
                  maxBytes: maxAnhangBytes(),
                  letzteEmpfaenger,
                  eigeneAdresse: betrieb?.email?.trim() || null,
                  absenderName: betrieb?.halterName?.trim() || null,
                }
              : null
          }
        />
      </Card>
    </div>
  );
}
