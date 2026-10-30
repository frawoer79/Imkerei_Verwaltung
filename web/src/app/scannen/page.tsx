import { QrScanSeite } from "@/components/qr-scan-seite";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

export default async function ScannenPage() {
  await bereichPflicht("scannen");
  return (
    <div className="flex flex-col gap-6">
      <SeitenNavigation className="-mb-3" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">QR-Code scannen</h1>
        <p className="text-sm text-muted">
          Kamera auf den QR-Code an der Beute halten. Die passende Stockkarte öffnet sich automatisch.
        </p>
      </div>
      <QrScanSeite />
    </div>
  );
}
