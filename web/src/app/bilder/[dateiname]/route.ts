import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadPfad } from "@/lib/uploads";

// Liefert ein hochgeladenes Foto aus. Läuft über die Datenbank statt direkt
// übers Dateisystem, damit niemand durch Erraten eines Dateinamens an ein
// Bild kommt, das nicht in der Datenbank verzeichnet ist.
export async function GET(
  _request: Request,
  context: { params: Promise<{ dateiname: string }> },
) {
  const { dateiname } = await context.params;

  // Der Reihe nach durch alle Stellen, an denen ein Bild hängen kann. Erst
  // die Galerie der Stockkarte, dann die einzeln geführten Fotos.
  const mimeType =
    (await prisma.bild.findFirst({ where: { dateiname } }))?.mimeType ??
    (await prisma.volk.findFirst({ where: { beuteFotoDateiname: dateiname } }))?.beuteFotoMimeType ??
    (await prisma.bienenstand.findFirst({ where: { standortFotoDateiname: dateiname } }))
      ?.standortFotoMimeType ??
    (await prisma.koenigin.findFirst({ where: { fotoDateiname: dateiname } }))?.fotoMimeType ??
    (await prisma.koenigin.findFirst({ where: { zuchtkarteFotoDateiname: dateiname } }))
      ?.zuchtkarteFotoMimeType ??
    (await prisma.koeniginEreignis.findFirst({ where: { fotoDateiname: dateiname } }))?.fotoMimeType;

  if (!mimeType) {
    return new NextResponse("Bild nicht gefunden", { status: 404 });
  }

  // Die Datenbank kennt das Bild, die Datei fehlt aber (z.B. weil das Volume
  // nicht eingehängt ist): ehrlich "nicht gefunden" melden statt eines
  // Serverfehlers - so lässt sich das von einem Bug unterscheiden.
  let inhalt: Buffer;
  try {
    inhalt = await readFile(await uploadPfad(dateiname));
  } catch (fehler) {
    if ((fehler as NodeJS.ErrnoException).code === "ENOENT") {
      return new NextResponse("Datei fehlt auf dem Server", { status: 404 });
    }
    throw fehler;
  }

  return new NextResponse(new Uint8Array(inhalt), {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
