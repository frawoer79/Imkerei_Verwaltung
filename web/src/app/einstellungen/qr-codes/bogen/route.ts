import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { neueQrKennung } from "@/lib/qr-bild";
import { qrEtikettenBogenErzeugen } from "@/lib/qr-pdf";
import { bereichPflicht } from "@/lib/bereiche";

const MAX_ANZAHL = 48;

// Erzeugt frisch bei jedem Aufruf `anzahl` neue, noch unbenutzte QR-Codes als
// PDF-Bogen zum Ausdrucken (siehe /einstellungen/qr-codes) - nichts davon
// wird in der Datenbank vorgemerkt, ein Code entsteht dort erst, wenn er
// später in einer Stockkarte angelernt wird.
export async function GET(request: Request) {
  await bereichPflicht("scannen");
  const anzahlParam = Number(new URL(request.url).searchParams.get("anzahl"));
  const anzahl = Number.isFinite(anzahlParam) ? Math.min(Math.max(Math.trunc(anzahlParam), 1), MAX_ANZAHL) : 1;

  const kennungen = Array.from({ length: anzahl }, () => neueQrKennung());

  // Öffentliche Adresse aus den Request-Headern - hinter dem Reverse-Proxy
  // von Coolify steht das tatsächliche Protokoll in "x-forwarded-proto",
  // siehe /einstellungen für dasselbe Vorgehen beim Kalender-Abo.
  const kopfzeilen = await headers();
  const gastgeber = kopfzeilen.get("host") ?? "";
  const protokoll = kopfzeilen.get("x-forwarded-proto") ?? "https";
  const basisAdresse = `${protokoll}://${gastgeber}`;

  const betrieb = await prisma.betrieb.findUnique({ where: { id: "standard" } });

  const inhalt = await qrEtikettenBogenErzeugen(kennungen, basisAdresse, betrieb?.halterName ?? null);

  return new NextResponse(new Uint8Array(inhalt), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="QR-Codes-${anzahl}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
