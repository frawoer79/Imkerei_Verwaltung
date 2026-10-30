-- Erzeugte Behandlungsnachweise werden als PDF-Datei auf dem Volume abgelegt
-- und hier verzeichnet. Sie bleiben liegen, bis sie ausdrücklich gelöscht
-- werden - der Nachweis muss ohnehin fünf Jahre vorgehalten werden.

-- CreateEnum
CREATE TYPE "NachweisUmfang" AS ENUM ('ALLE', 'STAND', 'VOLK');

-- CreateTable
CREATE TABLE "NachweisDatei" (
    "id" TEXT NOT NULL,
    "jahr" INTEGER NOT NULL,
    "umfang" "NachweisUmfang" NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "originalDateiname" TEXT NOT NULL,
    "groesse" INTEGER NOT NULL,
    "anzahlBehandlungen" INTEGER NOT NULL DEFAULT 0,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NachweisDatei_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NachweisDatei_jahr_idx" ON "NachweisDatei"("jahr");
