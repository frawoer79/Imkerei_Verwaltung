import type { Metadata, Viewport } from "next";
import { lubwLage } from "@/lib/bundeslaender";
import { SICHTBARE_MASSNAHMEN } from "@/lib/massnahmen-sichtbar";
import { Archivo, Bricolage_Grotesque, Figtree, Geist, Geist_Mono, IBM_Plex_Mono } from "next/font/google";
import { Sidebar, Topbar } from "@/components/navigation";
import { WabeKopf, WabeSeitenleiste, WabeTabLeiste } from "@/components/navigation-wabe";
import { KlarKopf } from "@/components/navigation-klar";
import { aktuellesDesign } from "@/lib/design";
import { DateiAnsicht } from "@/components/datei-ansicht";
import { OfflineLeiste } from "@/components/offline-leiste";
import { HelferLeiste } from "@/components/helfer-leiste";
import { UpdateLeiste } from "@/components/update-leiste";
import { updateHinweis } from "@/lib/update";
import { RueckgaengigLeiste } from "@/components/rueckgaengig-leiste";
import { SeitenverlaufErfassen } from "@/components/seiten-navigation";
import { prisma } from "@/lib/prisma";
import { massnahmenBuendeln } from "@/lib/massnahmen-buendeln";
import { aktuellesKonto } from "@/lib/konto";
import { neueVelutinaWarnungen } from "@/lib/velutina";
import { abgeschalteteBereiche } from "@/lib/bereiche";
import { menueName } from "@/lib/menue-name";
import "./globals.css";

// Setzt eine zuvor per Umschalter gewählte Hell-/Dunkel-Einstellung, bevor
// die Seite überhaupt zeichnet - sonst würde man beim Laden kurz im falschen
// Modus aufblitzen sehen, weil der Server (anders als der Browser) nichts
// vom gespeicherten localStorage-Wert weiß.
const THEMA_FRUEH_SETZEN_SKRIPT = `
(function () {
  try {
    var gespeichert = localStorage.getItem("theme");
    if (gespeichert === "light" || gespeichert === "dark") {
      document.documentElement.dataset.theme = gespeichert;
    }
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Schriften der neuen Designs (A "Wabe", B "Klar"). Nicht vorab geladen:
// sie gelten nur, wenn Frank eines der Designs gewählt hat.
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], preload: false });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], preload: false });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], preload: false });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "600"], preload: false });

export const metadata: Metadata = {
  title: "Imkereiverwaltung",
  description: "Bienenstände, Völker und Stockkarten verwalten",
  // Kein appleWebApp-Feld nötig: Ob die Verknüpfung vom Home-Bildschirm ohne
  // Adressleiste startet, bestimmt das Web-App-Manifest (app/manifest.ts,
  // display: "standalone"). Das eigene App-Symbol ist apple-icon.png.
};

// Die Anwendung ist von Anfang an für Smartphone, Tablet und Desktop gedacht,
// nicht nur für den großen Bildschirm nachträglich angepasst. Ohne diese
// Angabe würden mobile Browser die Seite standardmäßig wie eine
// Desktop-Seite herunterskalieren (winzige, kaum lesbare Schrift).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Färbt auf dem Handy die Browser-/Statusleiste passend zum dunklen
  // App-Symbol (siehe manifest.ts) statt der Browser-Standardfarbe ein.
  themeColor: "#14181a",
};

// Jede Seite zeigt Live-Daten aus der Datenbank - ohne diese Zeile würde
// Next.js Seiten ohne erkennbare "dynamische" API (wie Cookies) beim
// Bauen des Docker-Images einmalig statisch rendern und danach immer
// denselben veralteten Stand ausliefern, bis zum nächsten Deployment.
export const dynamic = "force-dynamic";

// Zahl der Maßnahmen, die heute oder früher fällig sind - erscheint als
// Abzeichen in der Navigation, damit Überfälliges auffällt, ohne dass man
// erst auf die Maßnahmen-Seite gehen muss.
async function anzahlFaellig(ohneZucht: boolean): Promise<number> {
  const endeHeute = new Date();
  endeHeute.setHours(23, 59, 59, 999);

  try {
    const faellige = await prisma.massnahme.findMany({
      where: {
        ...SICHTBARE_MASSNAHMEN,
        erledigt: false,
        faelligAm: { not: null, lte: endeHeute },
        ...(ohneZucht ? { zuchtserieId: null } : {}),
      },
      select: { zuchtserieId: true, bioVerfahrenId: true, faelligAm: true },
    });
    // Eine Zuchtserie zählt einmal, egal wie viele Schritte fällig sind.
    return massnahmenBuendeln(faellige).length;
  } catch {
    // Kopfzeile darf nie die ganze Seite mitreißen, etwa wenn die Datenbank
    // beim Hochfahren noch nicht erreichbar ist.
    return 0;
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Ohne gültige Sitzung landet man (per proxy.ts) ohnehin nur auf /login -
  // dort passt die normale App-Navigation (Menüpunkte, die sofort wieder
  // hierher zurückwerfen würden) nicht, und die Maßnahmen-Abfrage für das
  // Abzeichen wäre unnötig, bevor überhaupt jemand angemeldet ist.
  // Ein entfernter Testzugang hat noch ein gültig signiertes Cookie, zählt
  // hier aber nicht mehr als angemeldet (siehe konto.ts).
  const konto = await aktuellesKonto();
  const angemeldet = konto !== null;
  const testerName = konto?.art === "tester" ? konto.name : null;
  // Helfer mit "Nur lesen": globals.css blendet damit Knöpfe zum Anlegen,
  // Bearbeiten und Löschen aus (die Sperre selbst sitzt in lib/prisma.ts).
  const nurLesen = konto?.art === "nutzer" && konto.nurLesen;
  // Gewähltes Gesamt-Design dieses Geräts; vor der Anmeldung immer "aktuell".
  const design = angemeldet ? await aktuellesDesign() : "aktuell";
  const aus = angemeldet ? await abgeschalteteBereiche() : [];
  const name = angemeldet ? await menueName() : "";
  // Neue Version verfügbar? Nur der Hauptzugang erfährt davon.
  const update = konto?.art === "admin" ? await updateHinweis() : null;
  const [faellig, velutina] = angemeldet
    ? await Promise.all([
        anzahlFaellig(aus.includes("koeniginnen")),
        aus.includes("velutina") || (await lubwLage()) === "anderes"
          ? 0
          : neueVelutinaWarnungen().then((liste) => liste.length),
      ])
    : [0, 0];

  return (
    <html
      lang="de"
      data-design={design}
      data-nur-lesen={nurLesen ? "" : undefined}
      data-helfer={konto?.art === "nutzer" ? "" : undefined}
      className={`${geistSans.variable} ${geistMono.variable} ${design !== "aktuell" ? `${figtree.variable} ${bricolage.variable} ${archivo.variable} ${plexMono.variable}` : ""} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEMA_FRUEH_SETZEN_SKRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {angemeldet ? (
          <>
            {konto.art === "nutzer" && <HelferLeiste name={konto.name} nurLesen={konto.nurLesen} />}
            {update && <UpdateLeiste hinweis={update} />}
            <OfflineLeiste />
            {/* Seitenleiste und Inhalt als eine Gruppe (16rem + 80rem = 96rem):
                Auf breiten Monitoren (ab "2xl" = 1536px) wird die Gruppe als
                Ganzes zentriert, damit das Menü direkt links am Inhalt sitzt
                statt am Fensterrand. Der Inhalt steht dabei genau dort, wo er
                vorher auch stand - nur das Menü rückt heran. Darunter (iPad,
                kleinere Laptops) füllt die Gruppe ohnehin die ganze Breite.
                Auf breiten Monitoren hebt sich die Gruppe mit Rand und Schatten
                vom dunkleren Umfeld ab (globals.css, "app-rahmen"). */}
            {design === "wabe" ? (
              <div className="app-rahmen flex w-full flex-1 flex-col bg-background sm:flex-row 2xl:mx-auto 2xl:max-w-[96rem] 2xl:border-x 2xl:border-border">
                <WabeSeitenleiste faellig={faellig} velutina={velutina} aus={aus} name={name} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <WabeKopf name={name} />
                  <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-28 sm:px-7 sm:py-8 lg:px-10 print:max-w-none print:px-0 print:py-0">
                    {children}
                  </main>
                </div>
                <WabeTabLeiste faellig={faellig} velutina={velutina} aus={aus} />
              </div>
            ) : design === "klar" ? (
              <div className="app-rahmen flex w-full flex-1 flex-col bg-background">
                <KlarKopf faellig={faellig} velutina={velutina} aus={aus} name={name} />
                <main className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-5 sm:px-6 sm:py-7 2xl:px-8 print:max-w-none print:px-0 print:py-0">
                  {children}
                </main>
              </div>
            ) : (
            <div className="app-rahmen flex w-full flex-1 flex-col bg-background lg:flex-row 2xl:mx-auto 2xl:max-w-[96rem] 2xl:border-x 2xl:border-border 2xl:shadow-[0_0_48px_rgba(0,0,0,0.10)] dark:2xl:shadow-[0_0_48px_rgba(0,0,0,0.6)]">
              <Sidebar faellig={faellig} velutina={velutina} aus={aus} testerName={testerName} name={name} />
              <div className="flex min-w-0 flex-1 flex-col">
                <Topbar faellig={faellig} velutina={velutina} aus={aus} testerName={testerName} name={name} />
                <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 print:max-w-none print:px-0 print:py-0">
                  {children}
                </main>
              </div>
            </div>
            )}
            <DateiAnsicht />
            <RueckgaengigLeiste />
            <SeitenverlaufErfassen />
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
