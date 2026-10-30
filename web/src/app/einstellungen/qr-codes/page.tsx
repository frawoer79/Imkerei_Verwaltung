import { Button, Card, Label, Select } from "@/components/ui";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

const ANZAHL_OPTIONEN = [1, 6, 12, 24, 48];

// Erzeugt neue, noch unbenutzte QR-Codes zum Ausdrucken (der eigentliche
// PDF-Bogen entsteht in der Route /einstellungen/qr-codes, siehe dort). Jeder
// Aufruf liefert frische Codes - erst das Anlernen in einer Stockkarte
// verknüpft einen davon mit einem Volk.
export default async function QrCodesPage() {
  await bereichPflicht("scannen");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">QR-Codes erzeugen</h1>
        <p className="text-sm text-muted">
          Einmalige QR-Codes zum Aufkleben auf die Beute, noch keinem Volk zugeordnet. Ein neuer Code
          wirkt erst, wenn du ihn in der Stockkarte des Volks über „QR-Code lernen“ scannst.
        </p>
      </div>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Neuer Bogen</h2>
        <p className="mb-4 text-sm text-muted">
          Jedes Etikett enthält den QR-Code und die ersten Zeichen der Kennung, falls der Aufkleber
          einmal schlecht lesbar wird. Passt auf selbstklebendes A4-Etikettenpapier (4 × 6 Etiketten,
          52,5 × 49,5 mm) oder normales Papier zum Ausschneiden.
        </p>
        <form action="/einstellungen/qr-codes/bogen" target="_blank" className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="anzahl">Anzahl Codes</Label>
            <Select id="anzahl" name="anzahl" defaultValue="12" className="w-auto">
              {ANZAHL_OPTIONEN.map((anzahl) => (
                <option key={anzahl} value={anzahl}>
                  {anzahl}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit">PDF öffnen</Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Das PDF öffnet sich in einem neuen Tab. Dort über den Drucken-Befehl des Browsers (Strg+P bzw.
          Cmd+P) ausdrucken. Dabei lässt sich jeder eingerichtete Drucker wählen, auch ein Netzwerkdrucker.
          Die App selbst kann nicht direkt drucken: Der Server steht extern und hat keinen Zugriff auf
          Geräte in deinem Heimnetz. Den hat nur dein Gerät.
        </p>
      </Card>
    </div>
  );
}
