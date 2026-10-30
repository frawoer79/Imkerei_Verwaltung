import { istAdmin } from "@/lib/konto";
import { eigeneVersion } from "@/lib/update";
import { updateStatusLesen } from "@/lib/update-steuerung";

// Stand eines laufenden Updates für den Knopf unter Einstellungen -> System
// (components/update-knopf.tsx). Eine feste Adresse statt einer
// Server-Aktion, weil die App während des Updates neu startet und Aktionen
// danach eine neue Kennung haben. Nur für den Hauptzugang.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await istAdmin())) return Response.json({ fehler: "Nicht erlaubt." }, { status: 403 });
  return Response.json({ version: eigeneVersion(), status: await updateStatusLesen() });
}
