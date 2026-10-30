-- Beutensysteme geordnet nach System -> Rähmchenmaß -> Zarge, dazu die
-- Honigräume, die auf einem Volk sitzen.
--
-- Aus "Honigraum" wird "Zarge": dieselbe Tabelle dient jetzt auch für den
-- Brutraum, unterschieden über die Spalte "verwendung". Umbenannt statt neu
-- angelegt, damit schon eingetragene Honigraumgrößen erhalten bleiben.

-- CreateEnum
CREATE TYPE "Wabenbeschaffenheit" AS ENUM ('MITTELWAENDE', 'AUSGEBAUT', 'GEMISCHT');

-- Rähmchenmaß und Eignung am Wabenmaß
ALTER TABLE "Wabenmass" ADD COLUMN "breiteMm" INTEGER;
ALTER TABLE "Wabenmass" ADD COLUMN "hoeheMm" INTEGER;
ALTER TABLE "Wabenmass" ADD COLUMN "eignung" TEXT NOT NULL DEFAULT 'BEIDES';

-- Honigraum -> Zarge
ALTER TABLE "Honigraum" RENAME TO "Zarge";
ALTER TABLE "Zarge" RENAME CONSTRAINT "Honigraum_pkey" TO "Zarge_pkey";
ALTER TABLE "Zarge" RENAME CONSTRAINT "Honigraum_wabenmassId_fkey" TO "Zarge_wabenmassId_fkey";
ALTER INDEX "Honigraum_wabenmassId_idx" RENAME TO "Zarge_wabenmassId_idx";
ALTER TABLE "Zarge" ADD COLUMN "verwendung" TEXT NOT NULL DEFAULT 'HONIGRAUM';

-- HonigernteAnteil verweist jetzt auf die Zarge
ALTER TABLE "HonigernteAnteil" RENAME COLUMN "honigraumId" TO "zargeId";
ALTER TABLE "HonigernteAnteil" RENAME CONSTRAINT "HonigernteAnteil_honigraumId_fkey" TO "HonigernteAnteil_zargeId_fkey";

-- Brutraum am Volk
ALTER TABLE "Volk" ADD COLUMN "brutraumZargeId" TEXT;
ALTER TABLE "Volk" ADD COLUMN "brutraumAnzahl" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Volk" ADD CONSTRAINT "Volk_brutraumZargeId_fkey" FOREIGN KEY ("brutraumZargeId") REFERENCES "Zarge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: Honigräume, die auf einem Volk sitzen
CREATE TABLE "Honigraumaufsatz" (
    "id" TEXT NOT NULL,
    "volkId" TEXT NOT NULL,
    "zargeId" TEXT,
    "bezeichnung" TEXT NOT NULL,
    "honigProZargeKg" DOUBLE PRECISION NOT NULL,
    "wabenbeschaffenheit" "Wabenbeschaffenheit",
    "aufgesetztAm" TIMESTAMP(3) NOT NULL,
    "aufgesetztEintragId" TEXT,
    "geerntetAm" TIMESTAMP(3),
    "geerntetEintragId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Honigraumaufsatz_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Honigraumaufsatz_volkId_idx" ON "Honigraumaufsatz"("volkId");
CREATE INDEX "Honigraumaufsatz_aufgesetztEintragId_idx" ON "Honigraumaufsatz"("aufgesetztEintragId");
CREATE INDEX "Honigraumaufsatz_geerntetEintragId_idx" ON "Honigraumaufsatz"("geerntetEintragId");

-- AddForeignKey
ALTER TABLE "Honigraumaufsatz" ADD CONSTRAINT "Honigraumaufsatz_volkId_fkey" FOREIGN KEY ("volkId") REFERENCES "Volk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Honigraumaufsatz" ADD CONSTRAINT "Honigraumaufsatz_zargeId_fkey" FOREIGN KEY ("zargeId") REFERENCES "Zarge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Honigraumaufsatz" ADD CONSTRAINT "Honigraumaufsatz_aufgesetztEintragId_fkey" FOREIGN KEY ("aufgesetztEintragId") REFERENCES "StockkartenEintrag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Honigraumaufsatz" ADD CONSTRAINT "Honigraumaufsatz_geerntetEintragId_fkey" FOREIGN KEY ("geerntetEintragId") REFERENCES "StockkartenEintrag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
