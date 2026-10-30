import { aktuellesDesign } from "@/lib/design";
import { Card } from "@/components/ui";
import { DesignWahl } from "@/components/design-wahl";
import { SeitenNavigation } from "@/components/seiten-navigation";

// Gesamt-Design wählen, für jedes Konto, pro Gerät.
export default async function DesignPage() {
  const design = await aktuellesDesign();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Design</h1>
        <p className="text-sm text-muted">
          Wähle, wie die App aussieht. Die Wahl gilt nur auf diesem Gerät. Hell und dunkel stellst
          du weiter im Menü um.
        </p>
      </div>
      <Card>
        <DesignWahl design={design} />
      </Card>
    </div>
  );
}
