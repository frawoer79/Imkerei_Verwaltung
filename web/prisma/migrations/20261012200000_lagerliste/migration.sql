-- Lagerlisten als PDF: eine neue Tabelle, bestehende Daten bleiben unberührt.
CREATE TYPE "LagerlisteArt" AS ENUM ('MATERIAL', 'ERZEUGNISSE');

CREATE TABLE "LagerlisteDatei" (
    "id" TEXT NOT NULL,
    "art" "LagerlisteArt" NOT NULL,
    "dateiname" TEXT NOT NULL,
    "originalDateiname" TEXT NOT NULL,
    "groesse" INTEGER NOT NULL,
    "anzahlPositionen" INTEGER NOT NULL DEFAULT 0,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LagerlisteDatei_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LagerlisteDatei_erstelltAm_idx" ON "LagerlisteDatei"("erstelltAm");
