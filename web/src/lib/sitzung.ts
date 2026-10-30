import { cookies } from "next/headers";
import { SITZUNGS_COOKIE_NAME, sitzungswertErzeugen } from "@/lib/anmeldung";

// Bewusst NICHT in einer "use server"-Datei: alles, was dort exportiert wird,
// kann der Browser direkt aufrufen - und eine Sitzung für ein beliebiges
// Konto setzen darf nur der Server selbst nach geprüfter Anmeldung.

const SITZUNGSDAUER_SEKUNDEN = 60 * 60 * 24 * 30; // 30 Tage

// Setzt das Sitzungs-Cookie für ein Konto ("admin" oder Testzugang).
export async function sitzungSetzen(konto: string) {
  const cookieStore = await cookies();
  cookieStore.set(SITZUNGS_COOKIE_NAME, sitzungswertErzeugen(konto), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SITZUNGSDAUER_SEKUNDEN,
  });
}
