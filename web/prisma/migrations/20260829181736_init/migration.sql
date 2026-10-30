-- CreateEnum
CREATE TYPE "VolkStatus" AS ENUM ('AKTIV', 'AUFGELOEST', 'VERKAUFT', 'VERLOREN');

-- CreateTable
CREATE TABLE "Bienenstand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "standort" TEXT,
    "notizen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bienenstand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Volk" (
    "id" TEXT NOT NULL,
    "bienenstandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rasse" TEXT,
    "koeniginJahr" INTEGER,
    "koeniginZeichen" TEXT,
    "status" "VolkStatus" NOT NULL DEFAULT 'AKTIV',
    "notizen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Volk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockkartenEintrag" (
    "id" TEXT NOT NULL,
    "volkId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "brut" TEXT,
    "futter" TEXT,
    "koeniginGesehen" BOOLEAN,
    "volksstaerke" INTEGER,
    "sanftmut" INTEGER,
    "massnahmen" TEXT,
    "notizen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockkartenEintrag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bild" (
    "id" TEXT NOT NULL,
    "stockkartenEintragId" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "originalDateiname" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "groesse" INTEGER NOT NULL,
    "beschreibung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bild_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Volk_bienenstandId_idx" ON "Volk"("bienenstandId");

-- CreateIndex
CREATE INDEX "StockkartenEintrag_volkId_idx" ON "StockkartenEintrag"("volkId");

-- CreateIndex
CREATE INDEX "Bild_stockkartenEintragId_idx" ON "Bild"("stockkartenEintragId");

-- AddForeignKey
ALTER TABLE "Volk" ADD CONSTRAINT "Volk_bienenstandId_fkey" FOREIGN KEY ("bienenstandId") REFERENCES "Bienenstand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockkartenEintrag" ADD CONSTRAINT "StockkartenEintrag_volkId_fkey" FOREIGN KEY ("volkId") REFERENCES "Volk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bild" ADD CONSTRAINT "Bild_stockkartenEintragId_fkey" FOREIGN KEY ("stockkartenEintragId") REFERENCES "StockkartenEintrag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
