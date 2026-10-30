import { cookies } from "next/headers";
import { istDesign, type Design } from "@/lib/design-namen";

export const DESIGN_COOKIE = "design";

// Gewähltes Design dieses Browsers, für jedes Konto (auch Tester).
export async function aktuellesDesign(): Promise<Design> {
  const wert = (await cookies()).get(DESIGN_COOKIE)?.value;
  return istDesign(wert) ? wert : "aktuell";
}
