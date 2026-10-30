-- Helfer-Zugänge (Einstellungen -> Helfer). Nur neue Tabelle und neuer Typ:
-- vorhandene Daten bleiben unverändert.
CREATE TYPE "NutzerStufe" AS ENUM ('SCHREIBEN', 'LESEN');

CREATE TABLE "Nutzer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKlein" TEXT NOT NULL,
    "passwortHash" TEXT NOT NULL,
    "stufe" "NutzerStufe" NOT NULL DEFAULT 'SCHREIBEN',
    "passwortAendern" BOOLEAN NOT NULL DEFAULT true,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "sitzungenGueltigAb" TIMESTAMP(3),
    "letzteAnmeldung" TIMESTAMP(3),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nutzer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Nutzer_nameKlein_key" ON "Nutzer"("nameKlein");
