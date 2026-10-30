import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadPfad } from "@/lib/uploads";
import { bereichPflicht } from "@/lib/bereiche";

// Liefert eine erzeugte Lagerliste aus - wie /nachweise/[dateiname]: ohne
// "?download=1" zeigt der Browser das PDF an, mit dem Zusatz lädt er es
// herunter.
export async function GET(
  request: Request,
  context: { params: Promise<{ dateiname: string }> },
) {
  await bereichPflicht("lager");
  const { dateiname } = await context.params;

  const lagerliste = await prisma.lagerlisteDatei.findFirst({ where: { dateiname } });
  if (!lagerliste) {
    return new NextResponse("Lagerliste nicht gefunden", { status: 404 });
  }

  const herunterladen = new URL(request.url).searchParams.get("download") === "1";
  const inhalt = await readFile(await uploadPfad(lagerliste.dateiname));

  return new NextResponse(new Uint8Array(inhalt), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${herunterladen ? "attachment" : "inline"}; filename="${lagerliste.originalDateiname}"`,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
