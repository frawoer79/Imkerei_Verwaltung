import { redirect } from "next/navigation";
import { BUNDESLAENDER } from "@/lib/bundeslaender";
import { einrichtungNoetig, einrichtungscode } from "@/lib/hauptzugang";
import { PASSWORT_MINDESTLAENGE } from "@/lib/testzugang";
import { EinrichtungFormular } from "@/components/einrichtung-formular";
import { pruefungMoeglich } from "@/lib/update";

// Einrichtungsassistent beim ersten Start einer selbst installierten Instanz.
// Ohne Anmeldung erreichbar, aber nur solange es noch keinen Hauptzugang gibt
// (siehe proxy.ts und lib/hauptzugang.ts).
export const dynamic = "force-dynamic";

export default async function EinrichtungPage() {
  if (!(await einrichtungNoetig())) redirect("/login");
  // Würfelt den Code, falls keiner in der .env steht, und schreibt ihn ins
  // Protokoll - sonst stünde er erst nach dem ersten Absenden dort.
  einrichtungscode();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-8">
      <EinrichtungFormular
        bundeslaender={BUNDESLAENDER.map((land) => ({ kuerzel: land.kuerzel, name: land.name }))}
        passwortMindestlaenge={PASSWORT_MINDESTLAENGE}
        updatePruefung={pruefungMoeglich()}
      />
    </div>
  );
}
