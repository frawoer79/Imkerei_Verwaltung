import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { standAnzeige } from "@/lib/zuchtkarte-daten";
import { MAX_KARTEN_PRO_BLATT, inhaltBereinigen } from "@/lib/zuchtkarte-inhalt";
import { zuchtkartenBlattErzeugen } from "@/lib/zuchtkarte-pdf";

// Erzeugt das PDF-Blatt mit den Karten der gewählten Königinnen - gemeinsam
// genutzt vom Drucken (Antwort unten) und vom Versand per E-Mail. Bei einem
// Problem kommt statt des PDFs eine Meldung samt passendem HTTP-Status zurück.
export async function zuchtkartenPdfErzeugen(
  koeniginIds: string[],
): Promise<{ pdf: Buffer; dateiname: string } | { fehler: string; status: number }> {
  const ids = [...new Set(koeniginIds.filter(Boolean))];
  if (ids.length === 0) {
    return { fehler: "Keine Zuchtkarte gewählt.", status: 400 };
  }
  if (ids.length > MAX_KARTEN_PRO_BLATT) {
    return { fehler: `Auf ein Blatt passen höchstens ${MAX_KARTEN_PRO_BLATT} Karten.`, status: 400 };
  }

  const gespeichert = await prisma.zuchtkarte.findMany({
    where: { koeniginId: { in: ids } },
    include: { koenigin: { select: { kennung: true } } },
  });
  // In der Reihenfolge der Auswahl, nicht in der der Datenbank: die erste
  // gewählte Karte steht links.
  const karten = ids.flatMap((id) => {
    const karte = gespeichert.find((eintrag) => eintrag.koeniginId === id);
    return karte ? [karte] : [];
  });
  if (karten.length !== ids.length) {
    return { fehler: "Für mindestens eine dieser Königinnen wurde noch keine Zuchtkarte erstellt.", status: 404 };
  }

  const einzeln = karten.length === 1;
  const pdf = await zuchtkartenBlattErzeugen(
    karten.map((karte) => ({ inhalt: inhaltBereinigen(karte.inhalt), stand: standAnzeige(karte.updatedAt) })),
    einzeln ? `Zuchtkarte ${karten[0].koenigin.kennung}` : "Zuchtkarten"
  );

  // Dateiname ohne Umlaute und Sonderzeichen, damit er auf jedem Gerät und in
  // jedem Mailprogramm ankommt.
  const sauber = (text: string) => text.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const dateiname = einzeln
    ? `Zuchtkarte-${sauber(karten[0].koenigin.kennung) || "koenigin"}.pdf`
    : `Zuchtkarten-${karten.length}-Stueck.pdf`;

  return { pdf, dateiname };
}

// Die Antwort für alle Wege zum Drucken: eine einzelne Karte von der Seite
// der Königin und die Auswahl mehrerer Karten haben dasselbe Ergebnis - ein
// A4-Blatt quer, hier mit einer oder mehreren Karten.
export async function zuchtkartenDruckAntwort(koeniginIds: string[], herunterladen: boolean) {
  const ergebnis = await zuchtkartenPdfErzeugen(koeniginIds);
  if ("fehler" in ergebnis) {
    return new NextResponse(ergebnis.fehler, { status: ergebnis.status });
  }

  return new NextResponse(new Uint8Array(ergebnis.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${herunterladen ? "attachment" : "inline"}; filename="${ergebnis.dateiname}"`,
      "Cache-Control": "no-store",
    },
  });
}
