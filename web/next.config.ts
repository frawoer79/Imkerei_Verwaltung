import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Ohne das bricht schon ein einzelnes normales Handyfoto ab: Next.js
      // begrenzt Server-Aktionen sonst auf 1 MB Anfragegröße. Der Stockkarten-
      // Eintrag darf bis zu 5 Fotos in einer Aktion mitschicken, darum
      // großzügig bemessen.
      bodySizeLimit: "50mb",
    },
    // Zusätzlich zur Grenze oben: weil die App eine eigene proxy.ts hat (für
    // die Anmeldung), puffert Next.js jede Anfrage dort zwischen - unabhängig
    // vom Foto-Feld - standardmäßig auf höchstens 10 MB, alles danach wird
    // abgeschnitten. Ein einzelnes Foto über 10 MB (normales Handyfoto) kam
    // dadurch nur teilweise an ("Unexpected end of form") und schlug fehl,
    // ohne dass die Grenze oben etwas dagegen half. Auf denselben Wert wie
    // oben angehoben, damit beide Grenzen zusammenpassen.
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
