import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadPfad } from "@/lib/uploads";
import { bereichPflicht } from "@/lib/bereiche";

// Liefert einen hochgeladenen Beleg (Rechnung, Lieferschein, tierärztliche
// Verschreibung) aus. Wie bei den Fotos läuft der Zugriff über die Datenbank,
// damit niemand durch Erraten eines Dateinamens an eine Datei kommt. Ohne
// "?download=1" zeigt der Browser die Datei an, mit dem Zusatz lädt er sie
// direkt herunter.
export async function GET(
  request: Request,
  context: { params: Promise<{ dateiname: string }> },
) {
  await bereichPflicht("behandlungen");
  const { dateiname } = await context.params;

  const beleg = await prisma.medikamentBeleg.findFirst({ where: { dateiname } });
  if (!beleg) {
    return new NextResponse("Beleg nicht gefunden", { status: 404 });
  }

  const herunterladen = new URL(request.url).searchParams.get("download") === "1";
  const inhalt = await readFile(await uploadPfad(beleg.dateiname));

  return new NextResponse(new Uint8Array(inhalt), {
    headers: {
      "Content-Type": beleg.mimeType,
      "Content-Disposition": `${herunterladen ? "attachment" : "inline"}; filename="${beleg.originalDateiname}"`,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
