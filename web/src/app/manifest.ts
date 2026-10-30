import type { MetadataRoute } from "next";

// Macht die App "installierbar" (Android/Desktop-Chrome "App installieren"
// bzw. "Verknüpfung erstellen", iOS "Zum Home-Bildschirm"): liefert Name und
// Symbol, die dabei statt eines Browser-Tabs verwendet werden. Die
// referenzierten Symbole liegen unter public/icons/ - dieselbe Zeichnung wie
// IconLogo (web/src/components/icons.tsx), einmal als PNG mit dunklem
// Hintergrund gerendert, siehe Projektstand.md für die Erzeugung.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Imkereiverwaltung",
    short_name: "Imkerei",
    description: "Bienenstände, Völker und Stockkarten verwalten",
    start_url: "/",
    // "standalone": Die Verknüpfung vom Home-Bildschirm öffnet die App als
    // eigenes Fenster ohne Adressleiste. Die Anmeldung läuft über die eigene
    // Passwortseite (Sitzungs-Cookie), nicht mehr über eine Browser-
    // Passwortabfrage - dadurch gibt es keinen Grund mehr für den
    // Browser-Modus.
    display: "standalone",
    background_color: "#14181a",
    theme_color: "#14181a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // "maskable" liefert Android das Symbol mit Sicherheitsabstand für
      // eigene Formmasken (rund, abgerundetes Quadrat, ...) statt es hart
      // zuzuschneiden.
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
