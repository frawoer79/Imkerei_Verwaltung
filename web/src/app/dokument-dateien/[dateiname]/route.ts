import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadPfad } from "@/lib/uploads";
import { bereichPflicht } from "@/lib/bereiche";

// Liefert ein hochgeladenes Dokument aus. Wie bei den Belegen läuft der
// Zugriff über die Datenbank, damit niemand durch Erraten eines Dateinamens
// an ein Dokument kommt. Ohne "?download=1" zeigt der Browser die Datei an,
// mit dem Zusatz lädt er sie direkt herunter.
export async function GET(
  request: Request,
  context: { params: Promise<{ dateiname: string }> },
) {
  await bereichPflicht("dokumente");
  const { dateiname } = await context.params;

  const dokument = await prisma.dokument.findFirst({ where: { dateiname } });
  if (!dokument) {
    return new NextResponse("Dokument nicht gefunden", { status: 404 });
  }

  const herunterladen = new URL(request.url).searchParams.get("download") === "1";
  const inhalt = await readFile(await uploadPfad(dokument.dateiname));

  return new NextResponse(new Uint8Array(inhalt), {
    headers: {
      "Content-Type": dokument.mimeType,
      "Content-Disposition": `${herunterladen ? "attachment" : "inline"}; filename="${dokument.originalDateiname}"`,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
