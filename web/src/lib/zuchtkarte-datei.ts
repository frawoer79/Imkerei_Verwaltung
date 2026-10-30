// Welche Dateien als hochgeladene Zuchtkarte einer zugekauften Königin
// durchgehen: Foto, Scan als Bild oder PDF (aus dem Scanner bzw. per E-Mail
// vom Züchter). Bewusst ohne Node-Importe, damit das Formular im Browser
// dieselbe Prüfung macht wie der Server (siehe zuchtkarteAusFormular in
// actions.ts).
//
// Manche Rechner melden für HEIC-Fotos (iPhone-Bilder auf dem Windows-PC)
// und für Scans keinen brauchbaren Dateityp - leer oder "application/octet-
// stream". Früher wurde die Karte dann stillschweigend verworfen; jetzt
// entscheidet in dem Fall die Endung.

const TYP_NACH_ENDUNG: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

const ERLAUBTE_TYPEN = new Set(Object.values(TYP_NACH_ENDUNG));

/// Der Dateityp, unter dem die Zuchtkarte gespeichert wird - oder `null`,
/// wenn die Datei weder ein Foto noch ein PDF ist.
export function zuchtkartenDateityp(datei: { name: string; type: string }): string | null {
  const typ = datei.type.trim().toLowerCase();
  if (typ === "image/jpg" || typ === "image/pjpeg") return "image/jpeg";
  if (ERLAUBTE_TYPEN.has(typ)) return typ;

  if (typ === "" || typ === "application/octet-stream") {
    const punkt = datei.name.lastIndexOf(".");
    if (punkt < 0) return null;
    return TYP_NACH_ENDUNG[datei.name.slice(punkt + 1).toLowerCase()] ?? null;
  }
  return null;
}

export function istPdf(mimeType: string | null | undefined): boolean {
  return mimeType === "application/pdf";
}

export const ZUCHTKARTE_DATEITYP_HINWEIS =
  "Diese Datei kann nicht gespeichert werden. Erlaubt sind Fotos (JPEG, PNG, WebP, HEIC) und PDF.";
