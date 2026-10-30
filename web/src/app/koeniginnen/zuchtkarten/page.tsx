import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { ZuchtkartenAuswahl } from "@/components/zuchtkarten-auswahl";
import { MAX_KARTEN_PRO_BLATT } from "@/lib/zuchtkarte-inhalt";
import { standAnzeige } from "@/lib/zuchtkarte-daten";
import { KoeniginStern } from "@/components/koenigin-stern";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

// Mehrere Zuchtkarten auf einmal drucken: bis zu fünf auswählen, sie landen
// nebeneinander auf einem A4-Blatt quer, mit Schnittkreuzen zum Ausschneiden.
export default async function ZuchtkartenDruckenPage({
  searchParams,
}: {
  searchParams: Promise<{ auswahl?: string }>;
}) {
  await bereichPflicht("koeniginnen");
  const { auswahl } = await searchParams;

  const [mitKarte, ohneKarte] = await Promise.all([
    prisma.zuchtkarte.findMany({
      include: {
        koenigin: { select: { id: true, kennung: true, rasse: true, jahrgang: true, zeichenFarbe: true, stern: true } },
      },
    }),
    prisma.koenigin.findMany({
      where: { zuchtkarte: null },
      orderBy: [{ jahrgang: "desc" }, { kennung: "asc" }],
      select: { id: true, kennung: true, jahrgang: true, stern: true },
    }),
  ]);

  const karten = mitKarte
    .map((eintrag) => ({
      koeniginId: eintrag.koenigin.id,
      kennung: eintrag.koenigin.kennung,
      stern: eintrag.koenigin.stern,
      rasse: eintrag.koenigin.rasse,
      jahrgang: eintrag.koenigin.jahrgang,
      zeichenFarbe: eintrag.koenigin.zeichenFarbe,
      stand: standAnzeige(eintrag.updatedAt),
    }))
    .sort(
      (a, b) =>
        (b.jahrgang ?? 0) - (a.jahrgang ?? 0) || a.kennung.localeCompare(b.kennung, "de", { numeric: true })
    );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Zuchtkarten drucken</h1>
        <p className="mt-1 text-sm text-muted">
          Wähle bis zu {MAX_KARTEN_PRO_BLATT} Karten. Sie werden nebeneinander auf ein A4-Blatt im Querformat
          gedruckt, mit kleinen Kreuzen zum Ausschneiden. Beim Drucken „Tatsächliche Größe“ (100 %) wählen,
          nicht „An Seite anpassen“. Sonst stimmt das Maß von 52,5 × 148 mm nicht.
        </p>
      </div>

      <Card>
        {karten.length === 0 ? (
          <p className="text-sm text-muted">
            Noch keine Zuchtkarte erstellt. Das geht auf der Seite einer Königin mit „Zuchtkarte erstellen“.
          </p>
        ) : (
          <ZuchtkartenAuswahl karten={karten} vorauswahl={auswahl ?? null} />
        )}
      </Card>

      {ohneKarte.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted hover:text-foreground">
            Noch ohne Zuchtkarte ({ohneKarte.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {ohneKarte.map((koenigin) => (
              <li key={koenigin.id}>
                <Link href={`/koeniginnen/${koenigin.id}`} className="text-accent hover:underline">
                  {koenigin.kennung}
                </Link>
                {koenigin.stern && <KoeniginStern className="ml-1 h-7 w-7" />}
                {koenigin.jahrgang && <span className="text-muted"> · Jahrgang {koenigin.jahrgang}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
