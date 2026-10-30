import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadPfad } from "@/lib/uploads";
import { bereichPflicht } from "@/lib/bereiche";

// Liefert einen erzeugten Behandlungsnachweis aus. Ohne "?download=1" zeigt
// der Browser die PDF-Datei an (auf dem iPhone lässt sie sich von dort über
// "Teilen" verschicken oder in Dateien sichern), mit dem Zusatz lädt er sie
// direkt herunter.
export async function GET(
  request: Request,
  context: { params: Promise<{ dateiname: string }> },
) {
  await bereichPflicht("behandlungen");
  const { dateiname } = await context.params;

  const nachweis = await prisma.nachweisDatei.findFirst({ where: { dateiname } });
  if (!nachweis) {
    return new NextResponse("Nachweis nicht gefunden", { status: 404 });
  }

  const herunterladen = new URL(request.url).searchParams.get("download") === "1";
  const inhalt = await readFile(await uploadPfad(nachweis.dateiname));

  return new NextResponse(new Uint8Array(inhalt), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${herunterladen ? "attachment" : "inline"}; filename="${nachweis.originalDateiname}"`,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
