-- Beutensysteme, Wabenmaße und Honigraumgrößen als Stammdaten in den
-- Einstellungen, dazu die Zusammensetzung einer Ernte am Stockkarten-Eintrag.
--
-- Die Ernte-Anteile verweisen zwar auf die Stammdaten, halten Bezeichnung und
-- Gewicht je Einheit aber zusätzlich als Kopie fest: eine später geänderte
-- oder gelöschte Wabengröße darf alte Einträge nicht rückwirkend verändern
-- (darum ON DELETE SET NULL statt CASCADE).

-- CreateTable
CREATE TABLE "Beutensystem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notizen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beutensystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wabenmass" (
    "id" TEXT NOT NULL,
    "beutensystemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "honigProWabeKg" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wabenmass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Honigraum" (
    "id" TEXT NOT NULL,
    "wabenmassId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wabenAnzahl" INTEGER NOT NULL DEFAULT 10,
    "honigProZargeKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Honigraum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HonigernteAnteil" (
    "id" TEXT NOT NULL,
    "stockkartenEintragId" TEXT NOT NULL,
    "istZarge" BOOLEAN NOT NULL,
    "honigraumId" TEXT,
    "wabenmassId" TEXT,
    "bezeichnung" TEXT NOT NULL,
    "anzahl" INTEGER NOT NULL,
    "gewichtProEinheitKg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "HonigernteAnteil_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StockkartenEintrag" ADD COLUMN "honigSchaetzungKg" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Wabenmass_beutensystemId_idx" ON "Wabenmass"("beutensystemId");
CREATE INDEX "Honigraum_wabenmassId_idx" ON "Honigraum"("wabenmassId");
CREATE INDEX "HonigernteAnteil_stockkartenEintragId_idx" ON "HonigernteAnteil"("stockkartenEintragId");

-- AddForeignKey
ALTER TABLE "Wabenmass" ADD CONSTRAINT "Wabenmass_beutensystemId_fkey" FOREIGN KEY ("beutensystemId") REFERENCES "Beutensystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Honigraum" ADD CONSTRAINT "Honigraum_wabenmassId_fkey" FOREIGN KEY ("wabenmassId") REFERENCES "Wabenmass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HonigernteAnteil" ADD CONSTRAINT "HonigernteAnteil_stockkartenEintragId_fkey" FOREIGN KEY ("stockkartenEintragId") REFERENCES "StockkartenEintrag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HonigernteAnteil" ADD CONSTRAINT "HonigernteAnteil_honigraumId_fkey" FOREIGN KEY ("honigraumId") REFERENCES "Honigraum"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HonigernteAnteil" ADD CONSTRAINT "HonigernteAnteil_wabenmassId_fkey" FOREIGN KEY ("wabenmassId") REFERENCES "Wabenmass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
