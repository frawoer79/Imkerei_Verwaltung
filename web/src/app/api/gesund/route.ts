import { basisPrisma } from "@/lib/datenbank";

// Gesundheitsprüfung für docker-compose und das spätere Update-Skript: Läuft
// der Server, und erreicht er die Datenbank? Ohne Anmeldung erreichbar
// (siehe proxy.ts), verrät aber nichts außer "ok".
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await basisPrisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
