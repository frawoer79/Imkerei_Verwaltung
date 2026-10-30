-- Zuchtplanung: Zuchtserien (Umlarven aus einer Zuchtmutter) mit ihren
-- Arbeitsschritten als Maßnahmen und den daraus nachgezogenen Königinnen.
-- Fasst keine vorhandenen Daten an, legt nur Spalten und eine Tabelle an.

-- AlterTable
ALTER TABLE "Koenigin" ADD COLUMN     "zuchtserieId" TEXT;

-- AlterTable
ALTER TABLE "Massnahme" ADD COLUMN     "zuchtSchritt" TEXT,
ADD COLUMN     "zuchtserieId" TEXT;

-- CreateTable
CREATE TABLE "Zuchtserie" (
    "id" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "zuchtVolkId" TEXT,
    "mutterKoeniginId" TEXT,
    "pflegeVolkId" TEXT,
    "umlarvDatum" TIMESTAMP(3),
    "anzahlUmgelarvt" INTEGER,
    "anzahlAngenommen" INTEGER,
    "anzahlVerdeckelt" INTEGER,
    "anzahlGeschluepft" INTEGER,
    "begattungsart" "Begattungsart" NOT NULL DEFAULT 'UNBEKANNT',
    "belegstelleId" TEXT,
    "begattungsStandId" TEXT,
    "notizen" TEXT,
    "abgeschlossen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zuchtserie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Koenigin_zuchtserieId_idx" ON "Koenigin"("zuchtserieId");

-- CreateIndex
CREATE INDEX "Massnahme_zuchtserieId_idx" ON "Massnahme"("zuchtserieId");

-- AddForeignKey
ALTER TABLE "Koenigin" ADD CONSTRAINT "Koenigin_zuchtserieId_fkey" FOREIGN KEY ("zuchtserieId") REFERENCES "Zuchtserie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zuchtserie" ADD CONSTRAINT "Zuchtserie_zuchtVolkId_fkey" FOREIGN KEY ("zuchtVolkId") REFERENCES "Volk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zuchtserie" ADD CONSTRAINT "Zuchtserie_mutterKoeniginId_fkey" FOREIGN KEY ("mutterKoeniginId") REFERENCES "Koenigin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zuchtserie" ADD CONSTRAINT "Zuchtserie_pflegeVolkId_fkey" FOREIGN KEY ("pflegeVolkId") REFERENCES "Volk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zuchtserie" ADD CONSTRAINT "Zuchtserie_belegstelleId_fkey" FOREIGN KEY ("belegstelleId") REFERENCES "Belegstelle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zuchtserie" ADD CONSTRAINT "Zuchtserie_begattungsStandId_fkey" FOREIGN KEY ("begattungsStandId") REFERENCES "Bienenstand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Massnahme" ADD CONSTRAINT "Massnahme_zuchtserieId_fkey" FOREIGN KEY ("zuchtserieId") REFERENCES "Zuchtserie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
