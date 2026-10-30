import { zuchtkartenDruckAntwort } from "@/lib/zuchtkarte-druck";
import { bereichPflicht } from "@/lib/bereiche";

// Mehrere Zuchtkarten (bis zu fünf, `?ids=a,b,c` in der Reihenfolge von links
// nach rechts) auf einem A4-Blatt quer - die Auswahl dazu steht unter
// /koeniginnen/zuchtkarten.
export async function GET(request: Request) {
  await bereichPflicht("koeniginnen");
  const suchParameter = new URL(request.url).searchParams;
  const ids = (suchParameter.get("ids") ?? "").split(",").map((id) => id.trim());
  return zuchtkartenDruckAntwort(ids, suchParameter.get("download") === "1");
}
