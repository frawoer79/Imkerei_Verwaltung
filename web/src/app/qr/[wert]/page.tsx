import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, knopfKlassen } from "@/components/ui";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

// Ziel der Adresse, die ein selbst erzeugter QR-Code trägt (siehe
// /einstellungen/qr-codes) - so öffnet ein Scan auch mit der normalen
// Kamera-App des Handys direkt die richtige Stockkarte, ganz ohne die
// Imkereiverwaltung vorher aufzurufen. Ist der Code noch keinem Volk
// zugeordnet, verweist die Seite auf die Stockkarte, wo er angelernt wird.
export default async function QrWertPage({ params }: { params: Promise<{ wert: string }> }) {
  await bereichPflicht("scannen");
  const { wert } = await params;

  const volk = await prisma.volk.findUnique({
    where: { qrCodeWert: wert },
    select: { id: true },
  });

  if (volk) {
    redirect(`/voelker/${volk.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation menuepunkt="/scannen" className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Unbekannter QR-Code</h1>
      </div>
      <Card className="max-w-md">
        <p className="text-sm">
          Dieser QR-Code ist noch keinem Volk zugeordnet. Öffne die Stockkarte des passenden Volks und
          nutze dort „QR-Code lernen“.
        </p>
        <Link
          href="/"
          className={`${knopfKlassen("primary", "klein")} mt-4`}
        >
          Zur Übersicht
        </Link>
      </Card>
    </div>
  );
}
