import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_KONTO, SITZUNGS_COOKIE_NAME, sitzungAusWert, testerSitzungGueltig } from "@/lib/anmeldung";
import { basisPrisma } from "@/lib/datenbank";
import { aktivitaetVermerken, DEMO_GESPERRTE_SEITEN, istDemo, istDemoPlatz, platzAbgelaufen } from "@/lib/demo";
import { einrichtungNoetig } from "@/lib/hauptzugang";
import { nutzerIdAusKonto, nutzerSitzungGueltig, PASSWORT_SEITE } from "@/lib/nutzer";

// Ohne gültige Sitzung öffentlich erreichbar: die Login-Seite selbst (sonst
// Endlos-Weiterleitung) sowie die App-Symbol-/Manifest-Dateien fürs
// "Zum Home-Bildschirm" auf dem iPhone/iPad - Safari lädt die beim Anlegen
// der Verknüpfung über einen eigenen Abruf ohne Cookie ab, sonst bliebe das
// Symbol grau (siehe Projektstand.md). Dazu der Kalender-Feed: Kalender-Apps
// können sich nicht anmelden, die Route prüft stattdessen selbst die geheime
// Kennung in der Adresse (web/src/app/kalender/[datei]/route.ts). Und die
// persönlichen Einladungslinks für Testzugänge (/einladung/<token>) - wer sie
// öffnet, hat noch kein Konto. Dazu die Gesundheitsprüfung für Docker und
// "Passwort vergessen" samt Link aus der Mail (/passwort-vergessen/<token>)
// und robots.txt (sagt Suchmaschinen, dass hier nichts zu finden ist).
const OEFFENTLICHE_PFADE = ["/login", "/passwort-vergessen", "/robots.txt", "/icon.png", "/apple-icon.png", "/manifest.webmanifest", "/api/gesund"];
const EINRICHTUNG_PFAD = "/einrichtung";

// Gibt es den Testzugang noch, und ist das Cookie nach dem letzten
// Zurücksetzen des Passworts ausgestellt? Frank kann Tester jederzeit entfernen
// oder ihr Passwort zurücksetzen - ältere Cookies sind dann zwar noch gültig
// signiert, dürfen aber nichts mehr öffnen.
async function testzugangAktiv(testzugangId: string, ausgestelltAm: number): Promise<boolean> {
  const testzugang = await basisPrisma.testzugang.findUnique({
    where: { id: testzugangId },
    select: { eingerichtetAm: true, sitzungenGueltigAb: true },
  });
  return testerSitzungGueltig(testzugang, ausgestelltAm);
}

export async function proxy(request: NextRequest) {
  if (istDemo()) return demoProxy(request);
  const { pathname } = request.nextUrl;

  if (pathname === "/login" && (await einrichtungNoetig())) {
    return NextResponse.redirect(new URL(EINRICHTUNG_PFAD, request.url));
  }

  if (
    OEFFENTLICHE_PFADE.includes(pathname) ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/kalender/") ||
    pathname.startsWith("/einladung/") ||
    pathname.startsWith("/passwort-vergessen/")
  ) {
    return NextResponse.next();
  }

  // Frisch installierte Instanz ohne Hauptzugang: alles führt zum
  // Einrichtungsassistenten. Danach ist er nicht mehr erreichbar.
  if (await einrichtungNoetig()) {
    if (pathname === EINRICHTUNG_PFAD) return NextResponse.next();
    return NextResponse.redirect(new URL(EINRICHTUNG_PFAD, request.url));
  }
  if (pathname === EINRICHTUNG_PFAD) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const sitzung = sitzungAusWert(request.cookies.get(SITZUNGS_COOKIE_NAME)?.value);
  const konto = sitzung?.konto ?? null;
  const nutzerId = konto ? nutzerIdAusKonto(konto) : null;
  const helfer =
    sitzung && nutzerId
      ? await basisPrisma.nutzer.findUnique({
          where: { id: nutzerId },
          select: { aktiv: true, sitzungenGueltigAb: true, passwortAendern: true, stufe: true },
        })
      : null;
  const angemeldet =
    konto === ADMIN_KONTO ||
    (sitzung !== null &&
      (nutzerId
        ? nutzerSitzungGueltig(helfer, sitzung.ausgestelltAm)
        : await testzugangAktiv(sitzung.konto, sitzung.ausgestelltAm)));
  if (!angemeldet) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("weiter", pathname);
    const antwort = NextResponse.redirect(loginUrl);
    if (konto !== null) antwort.cookies.delete(SITZUNGS_COOKIE_NAME);
    return antwort;
  }

  if (helfer) {
    const umleitung = helferUmleitung(pathname, helfer);
    if (umleitung && umleitung !== pathname) return NextResponse.redirect(new URL(umleitung, request.url));
  }

  return NextResponse.next();
}

// --- Öffentliche Demo (lib/demo.ts) ---------------------------------------
//
// Kein Login, keine Einrichtung: wer keinen gültigen Demo-Platz hat, landet
// auf der Startseite der Demo und holt sich dort einen. Ein Platz gilt nur,
// solange er belegt und nicht abgelaufen ist (Ruhezeit, Datumswechsel).
const DEMO_OEFFENTLICH = [
  "/demo",
  "/impressum",
  "/datenschutz",
  "/robots.txt",
  "/icon.png",
  "/apple-icon.png",
  "/manifest.webmanifest",
  "/api/gesund",
];

async function demoProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (DEMO_OEFFENTLICH.includes(pathname) || pathname.startsWith("/icons/")) {
    return NextResponse.next();
  }
  // Kalender-Abos bräuchten eine dauerhafte Adresse, die gibt es hier nicht.
  if (pathname.startsWith("/kalender/")) return new NextResponse(null, { status: 404 });

  const sitzung = sitzungAusWert(request.cookies.get(SITZUNGS_COOKIE_NAME)?.value);
  const platzId = sitzung && istDemoPlatz(sitzung.konto) ? sitzung.konto : null;
  const platz = platzId
    ? await basisPrisma.testzugang.findUnique({
        where: { id: platzId },
        select: { eingerichtetAm: true, sitzungenGueltigAb: true, letzteAnmeldung: true },
      })
    : null;
  if (!sitzung || !platzId || !platz || !testerSitzungGueltig(platz, sitzung.ausgestelltAm) || platzAbgelaufen(platz)) {
    const ziel = new URL("/demo", request.url);
    if (sitzung) ziel.searchParams.set("hinweis", "abgelaufen");
    const antwort = NextResponse.redirect(ziel);
    if (sitzung) antwort.cookies.delete(SITZUNGS_COOKIE_NAME);
    return antwort;
  }

  if (
    pathname === "/login" ||
    pathname === EINRICHTUNG_PFAD ||
    pathname.startsWith("/passwort-vergessen") ||
    pathname.startsWith("/einladung/")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (DEMO_GESPERRTE_SEITEN.some((pfad) => pathname.startsWith(pfad))) {
    return NextResponse.redirect(new URL("/einstellungen", request.url));
  }

  await aktivitaetVermerken(platzId, platz.letzteAnmeldung);
  return NextResponse.next();
}

// Wohin ein Helfer statt der aufgerufenen Seite muss, sonst null.
// - Mit Startpasswort: nur die Passwortseite, bis ein eigenes vergeben ist.
// - Einstellungen: nur Design und Passwort, der Rest gehört dem Admin.
// - "Nur lesen": keine Formulare zum Anlegen, Bearbeiten oder Löschen. Die
//   Knöpfe dorthin sind ausgeblendet (globals.css), das hier fängt
//   Lesezeichen und eingetippte Adressen ab. Die eigentliche Sperre sitzt im
//   Datenbankzugriff (lib/prisma.ts).
function helferUmleitung(pathname: string, helfer: { passwortAendern: boolean; stufe: string }): string | null {
  if (helfer.passwortAendern) return PASSWORT_SEITE;
  if (pathname === "/einstellungen") return "/einstellungen/design";
  if (pathname.startsWith("/einstellungen/") && !HELFER_EINSTELLUNGEN.some((pfad) => pathname.startsWith(pfad))) {
    return "/einstellungen/design";
  }
  if (helfer.stufe === "LESEN" && /\/(neu|bearbeiten|loeschen)(\/|$)/.test(pathname)) return "/";
  return null;
}

const HELFER_EINSTELLUNGEN = ["/einstellungen/design", PASSWORT_SEITE];

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
