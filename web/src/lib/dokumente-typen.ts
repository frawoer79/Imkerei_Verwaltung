// Typen und reine Hilfsfunktionen rund um die zentrale Dokumentenliste - ohne
// Prisma-Import, damit die client-seitige Suchkomponente (dokumente-liste.tsx)
// diese Datei importieren kann, ohne den Datenbanktreiber ins Browser-Bundle
// zu ziehen (siehe lib/dokumente.ts für das eigentliche Laden der Daten).

// "DOKUMENT" sind die frei hochgeladenen Dokumente mit Kategorie (siehe
// `kategorie` unten) - die anderen sind die schon vorher vorhandenen,
// jeweils an eine eigene fachliche Stelle gebundenen Dokumentarten.
export type DokumentTyp = "DOKUMENT" | "BEHANDLUNGSNACHWEIS" | "MEDIKAMENTENBELEG" | "ZUCHTKARTE" | "LAGERLISTE";

export const DOKUMENT_TYP_LABEL: Record<DokumentTyp, string> = {
  DOKUMENT: "Dokument",
  BEHANDLUNGSNACHWEIS: "Behandlungsnachweis",
  MEDIKAMENTENBELEG: "Medikamenten-Beleg",
  ZUCHTKARTE: "Zuchtkarte",
  LAGERLISTE: "Lagerliste",
};

export type DokumentEintrag = {
  id: string;
  typ: DokumentTyp;
  /// Nur bei typ "DOKUMENT" gesetzt - der Name der Kategorie, dient dort als
  /// Filter/Abzeichen anstelle des generischen Typ-Labels.
  kategorie?: string;
  titel: string;
  kontext: string;
  /// Für die chronologische Sortierung und Anzeige.
  datum: Date;
  /// Wo das Dokument verwaltet bzw. erstellt wird - Ziel beim Antippen des
  /// Titels (z.B. die Bienenstand-Seite bei einem verknüpften Dokument).
  ortHref: string;
  /// Die Datei selbst - zum Ansehen (inline) bzw. mit "?download=1" zum
  /// Herunterladen.
  dateiHref: string;
  /// Nur bei hochgeladenen Dateien gesetzt - steuert das Icon.
  mimeType?: string;
  groesse?: number;
};

export function dateigroesseAnzeige(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
