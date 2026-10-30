import { notFound } from "next/navigation";
import { aktuellesKonto } from "@/lib/konto";
import { NUTZER_PASSWORT_MINDESTLAENGE } from "@/lib/nutzer";
import { Card } from "@/components/ui";
import { PasswortAendernFormular } from "@/components/helfer-formulare";
import { SeitenNavigation } from "@/components/seiten-navigation";

// Helfer ändern hier ihr Passwort. Mit Startpasswort vom Admin führt proxy.ts
// jeden Aufruf hierher, bis ein eigenes vergeben ist.
export default async function PasswortPage() {
  const konto = await aktuellesKonto();
  if (konto?.art !== "nutzer") notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        {!konto.passwortAendern && <SeitenNavigation className="mb-2" />}
        <h1 className="text-2xl font-semibold tracking-tight">
          {konto.passwortAendern ? `Willkommen, ${konto.name}` : "Passwort ändern"}
        </h1>
        <p className="text-sm text-muted">
          {konto.passwortAendern
            ? "Du hast ein Startpasswort bekommen. Bitte vergib jetzt ein eigenes Passwort, das nur du kennst. Danach geht es los."
            : "Nach dem Ändern bist du auf deinen anderen Geräten abgemeldet."}
        </p>
      </div>
      <Card>
        <PasswortAendernFormular erzwungen={konto.passwortAendern} mindestlaenge={NUTZER_PASSWORT_MINDESTLAENGE} />
      </Card>
    </div>
  );
}
