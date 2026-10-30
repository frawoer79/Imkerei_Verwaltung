import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { zuchtkartenDruckAntwort } from "@/lib/zuchtkarte-druck";
import { bereichPflicht } from "@/lib/bereiche";

// Die erstellte Zuchtkarte dieser Königin als PDF: ein A4-Blatt quer mit
// dieser einen Karte und Schnittkreuzen. Mehrere Karten gemeinsam drucken
// läuft über /koeniginnen/zuchtkarten.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  await bereichPflicht("koeniginnen");
  const { id } = await context.params;
  const suchParameter = new URL(request.url).searchParams;

  // Noch keine Karte erstellt (etwa über einen alten Link): zum Erstellen
  // schicken, statt eine Fehlerseite zu zeigen. Mit `redirect` (relativer
  // Pfad) statt `NextResponse.redirect(new URL(..., request.url))`: im
  // Betrieb hinter Coolify ist `request.url` die interne Adresse des
  // Containers (0.0.0.0:3000), die Weiterleitung führte dann ins Leere.
  const vorhanden = await prisma.zuchtkarte.findUnique({ where: { koeniginId: id }, select: { id: true } });
  if (!vorhanden) redirect(`/koeniginnen/${id}/zuchtkarte/bearbeiten`);

  return zuchtkartenDruckAntwort([id], suchParameter.get("download") === "1");
}
